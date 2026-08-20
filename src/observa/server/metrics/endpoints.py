# """Metric query endpoints (read side, session-authenticated)."""

# from __future__ import annotations

# from datetime import UTC, datetime
# from typing import Any

# from fastapi import APIRouter, Depends, Query
# from sqlalchemy.ext.asyncio import AsyncSession

# from observa.server.auth.dependencies import get_current_user
# from observa.server.db.session import get_session
# from observa.server.dependencies import get_storage
# from observa.server.metrics.schema import MetricPoint, MetricSeries
# from observa.server.model.user import User
# from observa.server.projects.services import (
#     get_accessible_projects,
#     get_current_account_id,
# )
# from observa.storage.duckdb.storage import DuckDBStorage

# router = APIRouter(prefix="/v1/metrics", tags=["metrics"])


# @router.get("/query", response_model=list[MetricSeries])
# async def query_metrics(
#     expr: str = Query(default="", max_length=500),
#     limit: int = Query(default=100, ge=1, le=1000),
#     current_user: User = Depends(get_current_user),
#     session: AsyncSession = Depends(get_session),
#     storage: DuckDBStorage = Depends(get_storage),
# ) -> list[MetricSeries]:
#     """
#     Query metrics across all projects accessible to the authenticated user.
#     """
#     account_id = await get_current_account_id(current_user, session)
#     projects = await get_accessible_projects(account_id, session)
#     project_ids = [project.id for project in projects]

#     rows = storage.reader.query_metrics(
#         project_ids=project_ids,
#         expr=expr or None,
#         limit=limit,
#     )

#     grouped: dict[tuple[str, str], MetricSeries] = {}
#     for row in rows:
#         attrs = {k: v for k, v in (row.get("attributes") or {}).items() if isinstance(k, str)}
#         key = (row["name"], str(attrs))
#         series = grouped.setdefault(
#             key,
#             MetricSeries(metric=row["name"], labels=attrs, unit=row.get("unit") or ""),
#         )
#         ts = datetime.fromtimestamp(row["timestamp_unix_nano"] / 1_000_000_000, tz=UTC)
#         series.points.append(
#             MetricPoint(timestamp=ts.isoformat(), value=float(row["value"] or 0))
#         )

#     return list(grouped.values())