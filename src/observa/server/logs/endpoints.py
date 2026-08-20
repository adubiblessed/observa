"""Log query endpoints (read side, session-authenticated).

Reading is scoped to the projects the authenticated user can access.  A
project id from the URL is always authorized via
``get_accessible_project`` before any data is read, so read-side tenant
isolation mirrors the ingestion side.
"""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from observa.server.auth.dependencies import get_current_user
from observa.server.db.session import get_session
from observa.server.dependencies import get_storage
from observa.server.logs import schema
from observa.server.model.user import User
from observa.server.projects.services import (
    get_accessible_project,
    get_accessible_projects,
    get_current_account_id,
)
from observa.storage.duckdb.storage import DuckDBStorage

router = APIRouter(prefix="/v1", tags=["logs"])

_SEVERITY_LEVELS = {1: "trace", 5: "debug", 9: "info", 13: "warn", 17: "error", 21: "fatal"}


def _row_to_log_entry(row: dict[str, Any]) -> schema.LogEntryResponse:
    attrs: dict[str, Any] = dict(row.get("attributes") or {})
    resource_attrs: dict[str, Any] = dict(row.get("resource_attributes") or {})

    ts_ns = int(row["ts_ns"])
    severity_number = int(row["severity_number"] or 0)
    level = _SEVERITY_LEVELS.get(severity_number)
    if level is None:
        level = (row.get("severity_text") or "info").lower()
        if level not in _SEVERITY_LEVELS.values():
            level = "info"

    body = row.get("body") or ""
    digest = hashlib.sha1(
        f"{row['project_id']}|{row['stream']}|{ts_ns}|{body}".encode("utf-8")
    ).hexdigest()[:16]

    return schema.LogEntryResponse(
        id=digest,
        timestamp=datetime.fromtimestamp(ts_ns / 1_000_000_000, tz=UTC),
        level=level,
        service=row.get("stream") or "default",
        message=body if isinstance(body, str) else str(body),
        host=attrs.get("host.name") or resource_attrs.get("host.name"),
        pod=attrs.get("k8s.pod.name") or resource_attrs.get("k8s.pod.name"),
        trace_id=row.get("trace_id"),
        span_id=row.get("span_id"),
        attributes={**resource_attrs, **attrs},
        project_id=UUID(row["project_id"]),
    )


async def _read_logs(
    *,
    project_ids: list[UUID],
    query: str | None,
    limit: int,
    storage: DuckDBStorage,
) -> list[schema.LogEntryResponse]:
    rows = storage.reader.search_logs(project_ids=project_ids, query=query, limit=limit)
    return [_row_to_log_entry(row) for row in rows]


@router.get("/logs", response_model=schema.LogListResponse)
async def list_logs(
    query: str | None = Query(default=None, max_length=500),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    storage: DuckDBStorage = Depends(get_storage),
) -> schema.LogListResponse:
    """
    List logs across all projects accessible to the authenticated user.
    """
    account_id = await get_current_account_id(current_user, session)
    projects = await get_accessible_projects(account_id, session)
    project_ids = [project.id for project in projects]

    items = await _read_logs(
        project_ids=project_ids,
        query=query,
        limit=limit + offset,
        storage=storage,
    )
    items = items[offset : offset + limit]
    return schema.LogListResponse(
        items=items,
        total=len(items),
        offset=offset,
        limit=limit,
    )


@router.get("/projects/{project_id}/logs", response_model=schema.LogListResponse)
async def list_project_logs(
    project_id: UUID,
    query: str | None = Query(default=None, max_length=500),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    storage: DuckDBStorage = Depends(get_storage),
) -> schema.LogListResponse:
    """
    List logs for one project the authenticated user can access.
    """
    account_id = await get_current_account_id(current_user, session)
    await get_accessible_project(project_id, account_id, session)

    items = await _read_logs(
        project_ids=[project_id],
        query=query,
        limit=limit + offset,
        storage=storage,
    )
    items = items[offset : offset + limit]
    return schema.LogListResponse(
        items=items,
        total=len(items),
        offset=offset,
        limit=limit,
    )