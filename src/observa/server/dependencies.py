"""Application-wide FastAPI dependencies."""

from __future__ import annotations

import asyncio

from fastapi import Request

from observa.storage.duckdb.storage import DuckDBStorage


async def get_storage(request: Request) -> DuckDBStorage:
    """
    Provide the application's DuckDB storage, initializing it lazily on first
    use.  The instance is cached on ``app.state`` so schema initialization
    happens once per process.
    """
    storage: DuckDBStorage | None = getattr(request.app.state, "storage", None)
    if storage is None:
        settings = getattr(request.app.state, "settings", None)
        duckdb_path = (
            getattr(settings, "DUCKDB_PATH", "local_storage/observa.db")
            if settings is not None
            else "local_storage/observa.db"
        )
        storage = DuckDBStorage(duckdb_path)
        await asyncio.to_thread(storage.initialize)
        request.app.state.storage = storage
    return storage