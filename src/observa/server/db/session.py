from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


def get_session_maker(
    request: Request,
) -> async_sessionmaker[AsyncSession]:
    """
    Return the application's shared SQLAlchemy async session maker.

    The session maker is created once during application startup by the
    FastAPI lifespan and stored on app.state.

    This dependency must not create database infrastructure lazily. If the
    session maker is missing, application startup has been misconfigured and
    we should fail immediately.
    """
    session_maker = getattr(
        request.app.state,
        "session_maker",
        None,
    )

    if session_maker is None:
        raise RuntimeError(
            "Database session maker is not initialized"
        )

    return session_maker


async def get_session(
    request: Request,
) -> AsyncGenerator[AsyncSession, None]:
    """
    Provide one SQLAlchemy AsyncSession per request.

    The session is automatically closed when the request finishes.
    Transaction handling should be performed explicitly by the service
    or repository layer that owns the operation.
    """
    session_maker = get_session_maker(request)

    async with session_maker() as session:
        yield session