"""Lifespan context shared by app + workers.

`lifespan` is the FastAPI lifespan callable; `worker_lifespan` is a
stand-alone async context manager for CLI scripts that still want the
same startup/shutdown logging + engine teardown.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

import structlog

from observa.config.settings import BaseAppSettings
from observa.config.settings import BaseAppSettings, DatabaseBackend

from .shutdown import on_shutdown
from .startup import on_startup

log = structlog.get_logger(__name__)

def _build_engine(settings: BaseAppSettings) -> AsyncEngine | None:
    try:
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

    except Exception as exc:
        log.warning(
            "engine.disabled",
            reason=str(exc),
        )
        return None


@asynccontextmanager
async def worker_lifespan(
    settings: BaseAppSettings,
) -> AsyncIterator[AsyncEngine | None]:
    engine = _build_engine(settings)
    await on_startup(settings, engine)
    try:
        yield engine
    finally:
        await on_shutdown(engine)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: BaseAppSettings = app.state.settings
    engine = _build_engine(settings)

    await on_startup(settings, engine)

    try:
        yield
    finally:
        await on_shutdown(engine)
        
    # return _run()
