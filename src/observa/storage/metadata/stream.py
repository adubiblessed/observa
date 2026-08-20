from __future__ import annotations

import enum
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    Enum as SqlEnum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from observa.common.model.base import BaseModel
from observa.storage.metadata.file_list import File_list


class StreamType(str, enum.Enum):
    LOGS = "logs"
    METRICS = "metrics"
    # not supported yet but added to the enum for forward/API compatibility
    TRACES = "traces"
    EVENTS = "events"


class Stream(BaseModel):
    __tablename__ = "streams"

    __table_args__ = (
        UniqueConstraint("project_id", "slug"),
        CheckConstraint("version > 0", name="version_positive"),
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), nullable=False)
    project_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    schema: Mapped[dict] = mapped_column(JSON, nullable=False)
    stream_type: Mapped[StreamType] = mapped_column(SqlEnum(StreamType), nullable=False)
    retention_days: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    files: Mapped[list["File_list"]] = relationship(back_populates="stream")

    def __str__(self) -> str:
        return f"{self.name} ({self.slug})"