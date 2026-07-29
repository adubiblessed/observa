"""
Application and worker lifespan management.

This module owns database infrastructure initialization and teardown.

Responsibilities:

1. Build the SQLAlchemy engine.
2. Build the application's async session maker.
3. Store database infrastructure on app.state.
4. Run application startup hooks.
5. Run application shutdown hooks.
6. Provide the same lifecycle behavior to standalone workers.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from observa.config.settings import (
    BaseAppSettings,
    DatabaseBackend,
)

from .shutdown import on_shutdown
from .startup import on_startup


log = structlog.get_logger(__name__)


def _build_engine(
    settings: BaseAppSettings,
) -> AsyncEngine:
    """
    Build the application's SQLAlchemy async engine.

    Engine construction is intentionally fail-fast.

    SQLAlchemy does not establish a database connection when
    create_async_engine() is called. Actual connectivity is therefore
    validated separately during application startup.
    """
    if settings.DATABASE_BACKEND == DatabaseBackend.SQLITE:
        return create_async_engine(
            settings.database_url,
            echo=settings.DEBUG,
        )

    return create_async_engine(
        settings.database_url,
        pool_size=settings.POSTGRES_POOL_SIZE,
        max_overflow=settings.POSTGRES_MAX_OVERFLOW,
        pool_pre_ping=True,
        echo=settings.DEBUG,
    )


def _build_session_maker(
    engine: AsyncEngine,
) -> async_sessionmaker[AsyncSession]:
    """
    Build the application's shared SQLAlchemy async session maker.

    This is created once during application startup and reused for
    individual request-scoped sessions.
    """
    return async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


@asynccontextmanager
async def worker_lifespan(
    settings: BaseAppSettings,
) -> AsyncIterator[AsyncEngine]:
    """
    Lifespan for standalone workers and CLI processes.

    The worker receives the engine directly because it does not have
    a FastAPI application state object.
    """
    engine = _build_engine(settings)

    await on_startup(
        settings,
        engine,
    )

    try:
        yield engine
    finally:
        await on_shutdown(engine)


@asynccontextmanager
async def lifespan(
    app: FastAPI,
) -> AsyncIterator[None]:
    """
    FastAPI application lifespan.

    Database infrastructure is created before the application begins
    accepting requests and disposed after the application stops.
    """
    settings: BaseAppSettings = app.state.settings

    engine = _build_engine(settings)
    session_maker = _build_session_maker(engine)

    app.state.engine = engine
    app.state.session_maker = session_maker

    await on_startup(
        settings,
        engine,
    )

    try:
        yield
    finally:
        await on_shutdown(engine)