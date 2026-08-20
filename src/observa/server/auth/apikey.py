"""API key authentication and authorization for the ingestion surface.

Separation of concerns
----------------------

* ``require_api_key``  -- authentication.  Answers: *"who owns this
  credential and what project is it bound to?"*.  Produces a trusted
  :class:`AuthenticatedPrincipal`.  All authentication failures
  (missing, malformed, unknown, wrong secret, revoked, expired, inactive)
  return ``401`` with a deliberately generic message.
* ``require_scope``    -- authorization.  Answers: *"may this principal
  perform this action?"* (e.g. ``logs:write``).  Failure is ``403``.
* ``require_project``  -- authorization.  Answers: *"is the project id in
  the request URL the project this credential is bound to?"*.  This is the
  line that makes cross-project ingestion impossible: a Project-A key can
  never write to Project B because the trusted ``project_id`` on the
  principal never matches a foreign id from the URL.

The client never supplies a project/tenant/stream identifier that is used
for authorization; every value originates from the database row the
credential resolved to.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from observa.common.model.base import utc_now
from observa.core.security import hash_api_key, parse_api_key, verify_api_key
from observa.server.db.session import get_session
from observa.server.model.project import ObjectStatus, Project
from observa.server.model.projectingestionkey import ProjectIngestionKey, ProjectKeyStatus

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True, slots=True)
class AuthenticatedPrincipal:
    """Trusted, server-side identity derived from a verified API key."""

    api_key_id: UUID
    project_id: UUID
    scopes: frozenset[str]
    key_prefix: str
    rate_limit_count: int | None = None
    rate_limit_window: int | None = None

    def has_scope(self, scope: str) -> bool:
        return scope in self.scopes


def _unauthorized() -> HTTPException:
    # Deliberately generic: does not distinguish bad secret / revoked /
    # expired / inactive / unknown so attackers cannot enumerate state.
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing API key",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_api_key(
    request: Request,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(_bearer),
    ],
    session: AsyncSession = Depends(get_session),
) -> AuthenticatedPrincipal:
    """
    Authenticate an OTLP ingestion request via ``Authorization: Bearer``.

    Never treats a client-supplied project/tenant id as an authorization
    claim: the resulting principal's ``project_id`` and ``scopes`` come
    exclusively from the credential row the token resolved to.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()

    token = credentials.credentials.strip()
    parsed = parse_api_key(token)
    if parsed is None:
        raise _unauthorized()

    result = await session.execute(
        select(ProjectIngestionKey).where(
            ProjectIngestionKey.key_prefix == parsed.prefix,
            ProjectIngestionKey.deleted_at.is_(None),
        )
    )
    credential = result.scalar_one_or_none()
    if credential is None:
        # Equalize cost with the hash path (dummy verification) to avoid a
        # timing oracle on prefix existence.
        hash_api_key(token)
        raise _unauthorized()

    if not verify_api_key(token, credential.key_hash):
        raise _unauthorized()

    if credential.status != ProjectKeyStatus.ACTIVE:
        raise _unauthorized()

    if credential.revoked_at is not None:
        raise _unauthorized()

    if credential.expires_at is not None and credential.expires_at <= utc_now():
        raise _unauthorized()

    project = await session.get(Project, credential.project_id)
    if project is None or project.status != ObjectStatus.ACTIVE:
        raise _unauthorized()

    # Throttled bookkeeping; never touches request data or payload.
    now = utc_now()
    if (
        credential.last_used_at is None
        or (now - credential.last_used_at).total_seconds() > 60
    ):
        credential.last_used_at = now
        try:
            await session.commit()
        except Exception:
            await session.rollback()

    principal = AuthenticatedPrincipal(
        api_key_id=credential.id,
        project_id=credential.project_id,
        scopes=credential.scope_set,
        key_prefix=credential.key_prefix,
        rate_limit_count=credential.rate_limit_count,
        rate_limit_window=credential.rate_limit_window,
    )
    request.state.principal = principal
    return principal


def require_scope(scope: str):
    """
    Dependency factory asserting the authenticated principal holds ``scope``.

    Usage::

        @router.post("/logs")
        async def ingest(
            principal: AuthenticatedPrincipal = Depends(require_scope("logs:write")),
        ): ...
    """

    async def _dependency(
        principal: AuthenticatedPrincipal = Depends(require_api_key),
    ) -> AuthenticatedPrincipal:
        if not principal.has_scope(scope):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"API key does not grant the '{scope}' scope",
            )
        return principal

    return _dependency


async def require_project_access(
    project_id: UUID,
    principal: AuthenticatedPrincipal = Depends(require_api_key),
) -> AuthenticatedPrincipal:
    """
    Authorize the request's ``{project_id}`` path parameter.

    Asserts the project id in the URL matches the authenticated principal's
    bound project.  This is the authoritative cross-project isolation check
    for the project-scoped ingestion routes::

        POST /v1/projects/{project_id}/otlp/logs

    A Project-A key presented against a Project-B id fails here with 403.
    """
    if principal.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project access denied",
        )
    return principal