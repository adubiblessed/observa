from __future__ import annotations


from datetime import UTC, datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from observa.server.auth import schema
from observa.server.model.user import User
from observa.server.auth.services import _hash_password, _verify_password

router = APIRouter(tags=["auth"])




def get_session_factory(
    request: Request,
) -> async_sessionmaker[AsyncSession]:
    session_factory = getattr(request.app.state, "session_factory", None)

    if session_factory is None:
        raise HTTPException(
            status_code=503,
            detail="Database service is unavailable",
        )

    return session_factory


async def get_session(
    session_factory: async_sessionmaker[AsyncSession] = Depends(
        get_session_factory
    ),
):
    async with session_factory() as session:
        yield session


@router.post(
    "/register",
    response_model=schema.RegisterResponse,
    status_code=201,
)
async def register(
    payload: schema.RegisterRequest,
    session: AsyncSession = Depends(get_session),
):
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
        )

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
    session: AsyncSession = Depends(get_session),
) -> schema.LoginResponse:
    result = await session.execute(
        select(User).where(
            User.email == payload.email,
        )
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    password_valid = _verify_password(
        payload.password,
        user.password_hash,
    )

    if not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.can_authenticate:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user.last_login_at = datetime.now(UTC)

    await session.commit()
    await session.refresh(user)

    return schema.LoginResponse(
        id=user.id,
        email=user.email,
        last_login_at=user.last_login_at,
    )

