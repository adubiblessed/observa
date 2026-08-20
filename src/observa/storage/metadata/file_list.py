from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from observa.common.model.base import BaseModel
from observa.storage.metadata.stream import Stream


class File_list(BaseModel):
    __tablename__ = "file_lists"

    __table_args__ = (
        Index("ix_file_list_stream_ts", "stream_id", "min_ts", "max_ts"),
        UniqueConstraint("stream_id", "file_path"),
        CheckConstraint("min_ts <= max_ts", name="ts_order"),
    )

    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    min_ts: Mapped[int] = mapped_column(BigInteger, nullable=False)          # microseconds
    max_ts: Mapped[int] = mapped_column(BigInteger, nullable=False)
    records: Mapped[int] = mapped_column(BigInteger, nullable=False)
    original_size: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    compressed_size: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    partition_key: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    #identifies which ingester/writer produced this file.
    # Needed to trace ingestion lag or failures back to a source.
    source: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    stream_id: Mapped[Optional[UUID]] = mapped_column(
        Uuid,
        ForeignKey("streams.id", ondelete="CASCADE"),
        nullable=True,
    )
    stream: Mapped[Optional[Stream]] = relationship(back_populates="files")

    def __str__(self) -> str:
        return f"{self.file_path} ({self.stream_id})"