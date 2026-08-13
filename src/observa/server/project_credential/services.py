from __future__ import annotations

import secrets
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from observa.common.model.base import utc_now
from observa.server.model.projectingestionkey import (
    ProjectIngestionKey,
    ProjectKeyRole,
    ProjectKeyStatus,
    ProjectKeyUseCase,
)


async def create_credential(
    *,
    project_id: UUID,
    account_id: UUID,
    name: str | None = None,
    use_case: str = "user",
    roles: int = ProjectKeyRole.DEFAULT,
    rate_limit_count: int | None = None,
    rate_limit_window: int | None = None,
    session: AsyncSession,
) -> ProjectIngestionKey:
    """
    Create a new ingestion API credential associated with a project.
    """

    # Map use_case string to enum if valid
    parsed_use_case = ProjectKeyUseCase.USER
    try:
        parsed_use_case = ProjectKeyUseCase(use_case)
    except ValueError:
        pass

    public_key = ProjectIngestionKey.generate_api_key()
    secret_key = ProjectIngestionKey.generate_api_key()

    credential = ProjectIngestionKey(
        project_id=project_id,
        created_by_account_id=account_id,
        name=name,
        public_key=public_key,
        secret_key=secret_key,
        roles=roles,
        status=ProjectKeyStatus.ACTIVE,
        use_case=parsed_use_case,
        rate_limit_count=rate_limit_count,
        rate_limit_window=rate_limit_window,
        data={},
    )

    session.add(credential)

    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    await session.refresh(credential)
    return credential


async def get_credentials(
    *,
    project_id: UUID,
    session: AsyncSession,
) -> list[ProjectIngestionKey]:
    """
    Return all non-deleted credentials for a project.
    """

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

    Raises HTTP 404 if credential does not exist or belongs to another project.
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
) -> ProjectIngestionKey:
    """
    Rotate an existing credential.

    Invalidates (deactivates & revokes) the old credential and creates
    a new active credential for the project atomically in one transaction.
    """

    old_credential = await get_credential_by_id(
        project_id=project_id,
        credential_id=credential_id,
        session=session,
    )

    # Invalidate old credential
    now = utc_now()
    old_credential.status = ProjectKeyStatus.INACTIVE
    old_credential.revoked_at = now

    # Generate new credential with copied attributes
    new_public_key = ProjectIngestionKey.generate_api_key()
    new_secret_key = ProjectIngestionKey.generate_api_key()

    new_credential = ProjectIngestionKey(
        project_id=project_id,
        created_by_account_id=account_id,
        name=old_credential.name,
        public_key=new_public_key,
        secret_key=new_secret_key,
        roles=old_credential.roles,
        status=ProjectKeyStatus.ACTIVE,
        use_case=old_credential.use_case,
        rate_limit_count=old_credential.rate_limit_count,
        rate_limit_window=old_credential.rate_limit_window,
        data=dict(old_credential.data or {}),
    )

    session.add(new_credential)

    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    await session.refresh(new_credential)
    return new_credential


async def revoke_credential(
    *,
    project_id: UUID,
    credential_id: UUID,
    session: AsyncSession,
) -> ProjectIngestionKey:
    """
    Revoke a credential, making it unusable for authentication.
    Operation is idempotent.
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
    """
    Soft-delete a credential.
    """

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
    public_key: str,
    secret_key: str,
    session: AsyncSession,
) -> ProjectIngestionKey | None:
    """
    Efficiently look up and verify an active credential by public key and secret key.
    Uses constant-time comparison to prevent timing attacks.
    """

    result = await session.execute(
        select(ProjectIngestionKey).where(
            ProjectIngestionKey.public_key == public_key,
            ProjectIngestionKey.status == ProjectKeyStatus.ACTIVE,
            ProjectIngestionKey.deleted_at.is_(None),
        )
    )

    credential = result.scalar_one_or_none()
    if credential is None:
        return None

    if not secrets.compare_digest(credential.secret_key, secret_key):
        return None

    return credential
