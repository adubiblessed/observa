from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from observa.server.db.session import get_session
from observa.server.model.user import AuthSession, User


SESSION_COOKIE_NAME = "observa_session"


def _ensure_utc(value: datetime) -> datetime:
    """
    Normalize a datetime to a timezone-aware UTC datetime.

    PostgreSQL with TIMESTAMP(timezone=True) normally returns an aware
    datetime.

    SQLite does not have a native timezone-aware timestamp type and can
    return a naive datetime. For SQLite, a naive datetime stored by
    Observa is interpreted as UTC.
    """
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


async def get_current_session(
    session_id: str | None = Cookie(
        default=None,
        alias=SESSION_COOKIE_NAME,
    ),
    session: AsyncSession = Depends(get_session),
) -> AuthSession:
    """
    Resolve and validate the authenticated session from the session cookie.
    """
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        session_uuid = UUID(session_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication session",
        ) from None

    result = await session.execute(
        select(AuthSession).where(
            AuthSession.id == session_uuid,
        )
    )

    auth_session = result.scalar_one_or_none()

    if auth_session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication session",
        )

    if auth_session.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication session has been revoked",
        )

    now = datetime.now(timezone.utc)
    expires_at = _ensure_utc(auth_session.expires_at)

    if expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication session has expired",
        )

    return auth_session


async def get_current_user(
    auth_session: AuthSession = Depends(get_current_session),
    session: AsyncSession = Depends(get_session),
) -> User:
    """
    Resolve the active user associated with the authenticated session.
    """
    result = await session.execute(
        select(User).where(
            User.id == auth_session.user_id,
            User.is_active.is_(True),
        )
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is unavailable",
        )

    if not user.can_authenticate:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account cannot authenticate",
        )

    return user