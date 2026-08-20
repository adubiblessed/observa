from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from observa.common.model.base import utc_now
from observa.core.security import (
    generate_api_key,
    hash_api_key,
    parse_api_key,
    verify_api_key,
)
from observa.server.model.projectingestionkey import (
    DEFAULT_INGESTION_SCOPES,
    ProjectIngestionKey,
    ProjectKeyStatus,
    ProjectKeyUseCase,
)


async def create_credential(
    *,
    project_id: UUID,
    account_id: UUID,
    name: str | None = None,
    use_case: str = "user",
    scopes: list[str] | None = None,
    expires_at: datetime | None = None,
    rate_limit_count: int | None = None,
    rate_limit_window: int | None = None,
    session: AsyncSession,
) -> tuple[ProjectIngestionKey, str]:
    """
    Create a new project-scoped ingestion credential.

    Returns ``(credential, plaintext_token)``.  The plaintext token is the
    only opportunity the caller has to see the secret; it is never stored
    and can never be retrieved again.
    """
    token = generate_api_key()
    parsed = parse_api_key(token)
    if parsed is None:  # pragma: no cover - generated tokens are always valid
        raise RuntimeError("Failed to generate a structurally valid API key")

    try:
        parsed_use_case = ProjectKeyUseCase(use_case)
    except ValueError:
        parsed_use_case = ProjectKeyUseCase.USER

    credential = ProjectIngestionKey(
        project_id=project_id,
        created_by_account_id=account_id,
        name=name,
        key_prefix=parsed.prefix,
        key_hash=hash_api_key(token),
        scopes=scopes if scopes is not None else list(DEFAULT_INGESTION_SCOPES),
        status=ProjectKeyStatus.ACTIVE,
        use_case=parsed_use_case,
        rate_limit_count=rate_limit_count,
        rate_limit_window=rate_limit_window,
        expires_at=expires_at,
        data={},
    )

    session.add(credential)

    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    await session.refresh(credential)
    return credential, token


async def get_credentials(
    *,
    project_id: UUID,
    session: AsyncSession,
) -> list[ProjectIngestionKey]:
    """Return all non-deleted credentials for a project (metadata only)."""

    result = await session.execute(
        select(ProjectIngestionKey)
        .where(
            ProjectIngestionKey.project_id == project_id,
            ProjectIngestionKey.deleted_at.is_(None),
        )
        .order_by(ProjectIngestionKey.created_at.desc())
    )

    return list(result.scalars().all())


async def get_credential_by_id(
    *,
    project_id: UUID,
    credential_id: UUID,
    session: AsyncSession,
) -> ProjectIngestionKey:
    """
    Retrieve a specific credential belonging to the specified project.

    Raises HTTP 404 if the credential does not exist or belongs to another
    project, so the existence of credentials in other projects is not
    leaked.
    """

    result = await session.execute(
        select(ProjectIngestionKey).where(
            ProjectIngestionKey.id == credential_id,
            ProjectIngestionKey.project_id == project_id,
            ProjectIngestionKey.deleted_at.is_(None),
        )
    )

    credential = result.scalar_one_or_none()

    if credential is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found",
        )

    return credential


async def rotate_credential(
    *,
    project_id: UUID,
    credential_id: UUID,
    account_id: UUID,
    session: AsyncSession,
) -> tuple[ProjectIngestionKey, str]:
    """
    Rotate an existing credential.

    Invalidates (revokes) the old credential and creates a new active
    credential for the same project in one transaction.  Returns the new
    credential and its one-time plaintext token.
    """

    old_credential = await get_credential_by_id(
        project_id=project_id,
        credential_id=credential_id,
        session=session,
    )

    now = utc_now()
    old_credential.status = ProjectKeyStatus.INACTIVE
    old_credential.revoked_at = now

    new_credential, token = await create_credential(
        project_id=project_id,
        account_id=account_id,
        name=old_credential.name,
        use_case=old_credential.use_case.value,
        scopes=list(old_credential.scopes or DEFAULT_INGESTION_SCOPES),
        expires_at=old_credential.expires_at,
        rate_limit_count=old_credential.rate_limit_count,
        rate_limit_window=old_credential.rate_limit_window,
        session=session,
    )

    return new_credential, token


async def revoke_credential(
    *,
    project_id: UUID,
    credential_id: UUID,
    session: AsyncSession,
) -> ProjectIngestionKey:
    """
    Revoke a credential, making it unusable for authentication.

    Idempotent: revoking an already-revoked credential is a no-op.
    """

    credential = await get_credential_by_id(
        project_id=project_id,
        credential_id=credential_id,
        session=session,
    )

    if credential.status != ProjectKeyStatus.INACTIVE or credential.revoked_at is None:
        credential.status = ProjectKeyStatus.INACTIVE
        if credential.revoked_at is None:
            credential.revoked_at = utc_now()

        try:
            await session.commit()
        except Exception:
            await session.rollback()
            raise

        await session.refresh(credential)

    return credential


async def delete_credential(
    *,
    project_id: UUID,
    credential_id: UUID,
    session: AsyncSession,
) -> None:
    """Soft-delete a credential (kept for auditability)."""

    credential = await get_credential_by_id(
        project_id=project_id,
        credential_id=credential_id,
        session=session,
    )

    credential.set_deleted_at()
    credential.status = ProjectKeyStatus.INACTIVE

    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise


async def verify_credential(
    *,
    token: str,
    session: AsyncSession,
) -> ProjectIngestionKey | None:
    """
    Authenticate an API key token.

    Looks the credential up by its public prefix, then verifies the secret
    against the stored hash using a constant-time comparison.  Returns
    ``None`` for unknown prefix, wrong secret, inactive/revoked/expired or
    soft-deleted credentials so callers can produce a uniform 401.
    """

    parsed = parse_api_key(token)
    if parsed is None:
        return None

    result = await session.execute(
        select(ProjectIngestionKey).where(
            ProjectIngestionKey.key_prefix == parsed.prefix,
            ProjectIngestionKey.deleted_at.is_(None),
        )
    )

    credential = result.scalar_one_or_none()
    if credential is None:
        # Equalize timing with a real hash comparison to avoid a timing
        # oracle on whether a prefix exists.
        ProjectIngestionKey.hash_token(token)
        return None

    if not verify_api_key(token, credential.key_hash):
        return None

    if credential.status != ProjectKeyStatus.ACTIVE:
        return None

    if credential.revoked_at is not None:
        return None

    if credential.expires_at is not None and credential.expires_at <= utc_now():
        return None

    return credential