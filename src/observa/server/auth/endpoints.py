from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from observa.server.auth import schema
from observa.server.model.user import User, AuthSession
from observa.server.auth.services import _hash_password, _verify_password
from observa.server.auth.dependencies import get_current_session, SESSION_COOKIE_NAME
from observa.server.db.session import get_session

router = APIRouter(tags=["auth"])

# TODO: promote to BaseAppSettings (e.g. SESSION_TTL_HOURS) once configurable
# session lifetime is needed. Kept local until then to avoid an unrequested
# settings.py change.
SESSION_TTL = timedelta(hours=24)

# Precomputed once at import time so an unknown-email login still pays the
# full password-hashing cost. Prevents timing-based user enumeration.
_DUMMY_PASSWORD_HASH = _hash_password(secrets.token_urlsafe(32))


def _set_session_cookie(response: Response, auth_session: AuthSession) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=str(auth_session.id),
        httponly=True,
        secure=True,  # requires HTTPS; see note below for local dev
        samesite="lax",
        max_age=int((auth_session.expires_at - datetime.now(UTC)).total_seconds()),
    )


@router.post(
    "/register",
    response_model=schema.RegisterResponse,
    status_code=201,
)
async def register(
    payload: schema.RegisterRequest,
    session: AsyncSession = Depends(get_session),
) -> schema.RegisterResponse:
    password_hash = _hash_password(payload.password)
    user = User(
        email=payload.email,
        password_hash=password_hash,
        first_name=payload.first_name,
        last_name=payload.last_name,
        email_verified=False,
    )
    session.add(user)

    try:
        await session.commit()
        await session.refresh(user)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        ) from None

    return schema.RegisterResponse(
        id=user.id,
        email=user.email,
        created_at=user.created_at,
    )


@router.post(
    "/login",
    response_model=schema.LoginResponse,
    status_code=status.HTTP_200_OK,
)
async def login(
    payload: schema.LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> schema.LoginResponse:
    result = await session.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    # Always verify against a real-or-dummy hash so response time doesn't
    # reveal whether the email exists.
    password_hash_to_check = user.password_hash if user is not None else _DUMMY_PASSWORD_HASH
    password_valid = _verify_password(payload.password, password_hash_to_check)

    if (
        user is None
        or not password_valid
        or not user.is_active
        or not user.can_authenticate
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    auth_session = AuthSession(
        user_id=user.id,
        expires_at=datetime.now(UTC) + SESSION_TTL,
    )
    session.add(auth_session)

    user.last_login_at = datetime.now(UTC)

    await session.commit()
    await session.refresh(user)
    await session.refresh(auth_session)

    _set_session_cookie(response, auth_session)

    return schema.LoginResponse(
        id=user.id,
        email=user.email,
        last_login_at=user.last_login_at,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    session: AsyncSession = Depends(get_session),
    auth_session: AuthSession = Depends(get_current_session),
) -> None:
    if auth_session.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session is no longer valid",
        )

    auth_session.revoked_at = datetime.now(UTC)
    await session.commit()

    response.delete_cookie(key=SESSION_COOKIE_NAME)