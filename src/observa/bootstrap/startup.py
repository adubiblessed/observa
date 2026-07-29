"""App-startup hooks.

Run once when lifespan enters. Idempotent; failures abort boot.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncEngine

import structlog

from observa.config.settings import BaseAppSettings

log = structlog.get_logger(__name__)


async def on_startup(settings: BaseAppSettings, engine: AsyncEngine) -> None:
    log.info(...)
    async with engine.begin() as conn:
        await conn.exec_driver_sql("SELECT 1")
    log.info("postgres.ok", host=settings.POSTGRES_HOST, db=settings.POSTGRES_DB)

    if engine is not None:
        # AsyncEngine exposes begin() for a single round-trip connectivity check.
        async with engine.begin() as conn:
            await conn.exec_driver_sql("SELECT 1")
        log.info("postgres.ok", host=settings.POSTGRES_HOST, db=settings.POSTGRES_DB)
