from __future__ import annotations

import binascii
import hashlib
import hmac
import os

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from observa.server.auth import schema
from observa.server.model.user import User

router = APIRouter(tags=["auth"])


def _hash_password(password: str) -> str:
    salt = os.urandom(16)
    iterations = 100_000

    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )

    return (
        f"pbkdf2_sha256$"
        f"{iterations}$"
        f"{binascii.hexlify(salt).decode()}$"
        f"{binascii.hexlify(dk).decode()}"
    )


def _verify_password(password: str, stored: str) -> bool:
    try:
        algo, iter_s, salt_hex, hash_hex = stored.split("$")

        if algo != "pbkdf2_sha256":
            return False

        iterations = int(iter_s)
        salt = binascii.unhexlify(salt_hex)
        expected = binascii.unhexlify(hash_hex)

        dk = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            iterations,
        )

        return hmac.compare_digest(dk, expected)

    except (ValueError, TypeError, binascii.Error):
        return False


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
