"""Liveness + readiness probes.

Liveness is cheap (always 200 if the process is up).
Readiness pings dependencies with short timeouts; backend outages lower
the pod from the load balancer but do not kill it.
"""

from __future__ import annotations

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

import redis.asyncio as redis_async

log = structlog.get_logger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
async def liveness() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
async def readiness(request: Request) -> JSONResponse:
    checks: dict[str, Any] = {"postgres": "ok", "redis": "ok"}
    healthy = True

    engine: AsyncEngine | None = getattr(request.app.state, "engine", None)
    if engine is not None:
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        except Exception as exc:
            checks["postgres"] = f"fail: {exc.__class__.__name__}"
            healthy = False

    redis_url: str | None = getattr(request.app.state, "redis_url", None)
    if redis_url is not None:
        client = redis_async.from_url(redis_url, socket_timeout=2)
        try:
            await client.ping()
        except Exception as exc:
            checks["redis"] = f"fail: {exc.__class__.__name__}"
            healthy = False
        finally:
            await client.aclose()

    code = status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=code,
        content={"status": "ok" if healthy else "degraded", "checks": checks},
    )
