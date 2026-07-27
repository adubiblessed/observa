"""App-shutdown hooks.

Mirror of on_startup. Errors during teardown are logged, never raised —
gunicorn is already exiting.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncEngine

import structlog

log = structlog.get_logger(__name__)


async def on_shutdown(engine: AsyncEngine | None) -> None:
    log.info("shutdown.begin")
    if engine is not None:
        await engine.dispose()
        log.info("postgres.closed")
    log.info("shutdown.done")
