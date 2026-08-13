"""Liveness + readiness + component health probes.

Liveness is cheap (always 200 if the process is up).
Readiness and component probes check dependencies with short timeouts; backend outages lower
the pod from the load balancer but do not kill it.
"""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

import duckdb
import redis.asyncio as redis_async
import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

log = structlog.get_logger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
async def liveness() -> dict[str, str]:
    """Liveness probe. Extremely lightweight, returns 200 OK when application process is running."""
    return {"status": "healthy"}


@router.get("/api/health")
async def application_health(request: Request) -> JSONResponse:
    """Application health endpoint returning overall system status and version info."""
    settings = getattr(request.app.state, "settings", None)
    version = getattr(settings, "VERSION", "0.1.0") if settings else "0.1.0"
    environment = getattr(settings, "ENVIRONMENT", "dev") if settings else "dev"

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "healthy",
            "version": str(version),
            "environment": str(environment),
        },
    )


@router.get("/api/health/database")
async def database_health(request: Request) -> JSONResponse:
    """Database health endpoint checking database reachability and query execution."""
    engine: AsyncEngine | None = getattr(request.app.state, "engine", None)
    if engine is None:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unhealthy", "database": "not_configured"},
        )

    try:
        async with asyncio.timeout(3.0):
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "healthy", "database": "connected"},
        )
    except Exception as exc:
        log.warning("database_health_check_failed", error=str(exc))
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unhealthy", "database": "unavailable"},
        )


@router.get("/api/health/storage")
async def storage_health(request: Request) -> JSONResponse:
    """Storage health endpoint checking storage backend usability (DuckDB / local storage)."""
    settings = getattr(request.app.state, "settings", None)
    duckdb_path: str = getattr(settings, "DUCKDB_PATH", "local_storage/observa.db") if settings else "local_storage/observa.db"

    def _check_storage() -> None:
        path = Path(duckdb_path)
        parent_dir = path.parent
        if not parent_dir.exists():
            parent_dir.mkdir(parents=True, exist_ok=True)

        conn = duckdb.connect(str(path))
        try:
            conn.execute("SELECT 1")
        finally:
            conn.close()

    try:
        await asyncio.wait_for(asyncio.to_thread(_check_storage), timeout=3.0)
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "healthy", "storage": "available"},
        )
    except Exception as exc:
        log.warning("storage_health_check_failed", error=str(exc))
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unhealthy", "storage": "unavailable"},
        )


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

