from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.exc import IntegrityError

import hashlib
import os
import binascii

from observa.config.settings import get_settings
from observa.server.model.user import User
from observa.server.auth import schema

router = APIRouter(tags=["auth"])


def _hash_password(password: str) -> str:
    salt = os.urandom(16)
    iterations = 100_000
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${binascii.hexlify(salt).decode()}${binascii.hexlify(dk).decode()}"


# def _verify_password(password: str, stored: str) -> bool:
#     try:
#         algo, iter_s, salt_hex, hash_hex = stored.split("$")
#         iterations = int(iter_s)
#         salt = binascii.unhexlify(salt_hex)
#         expected = binascii.unhexlify(hash_hex)
#         dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
#         return hashlib.compare_digest(dk, expected)
#     except Exception:
#         return False


# # build a lightweight session factory for auth operations. In dev the
# # database backend is sqlite (aiosqlite) so this will work without extra
# # infra. This intentionally keeps lifecycle simple for the endpoint.
# _settings = get_settings()
# _engine = create_async_engine(_settings.database_url, echo=_settings.DEBUG)
# _session_maker = async_sessionmaker(_engine, expire_on_commit=False)


@router.get(
    "/status",
    responses={
        401: {
            "description": "No active authentication session",
        }
    },
)
async def status():
    return {"status": "ok", "message": "Authentication service is running."}


# @router.post("/register", response_model=schema.RegisterResponse, status_code=201)
# async def register(payload: schema.RegisterRequest):
#     password_hash = _hash_password(payload.password)

#     async with _session_maker() as session:
#         user = User(
#             email=payload.email,
#             password_hash=password_hash,
#             first_name=payload.first_name,
#             last_name=payload.last_name,
#             email_verified=False,
#         )
#         session.add(user)
#         try:
#             await session.commit()
#             await session.refresh(user)
#         except IntegrityError:
#             await session.rollback()
#             raise HTTPException(status_code=400, detail="Email already registered")

#     return schema.RegisterResponse(id=user.id, email=user.email, created_at=user.created_at)