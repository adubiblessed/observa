from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class LogEntryResponse(BaseModel):
    """A single stored log record, scoped to an authorized project."""

    id: str
    timestamp: datetime
    level: str
    service: str
    message: str
    raw_message: str | None = None
    host: str | None = None
    pod: str | None = None
    trace_id: str | None = None
    span_id: str | None = None
    attributes: dict[str, object] = Field(default_factory=dict)
    project_id: UUID


class LogListResponse(BaseModel):
    items: list[LogEntryResponse]
    total: int
    offset: int = 0
    limit: int