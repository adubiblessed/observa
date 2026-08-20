from __future__ import annotations

import enum
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import (
    JSON,
    Integer,
    String,
    Uuid,
    UniqueConstraint,
    ForeignKey,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from observa.common.model.base import BaseModel, UTCDateTime
from observa.core.security import API_KEY_PREFIX_LENGTH, hash_api_key
from observa.server.model.project import Project

PROJECT_KEY_LABEL_MAX_LENGTH = 64
API_KEY_HASH_LENGTH = 64  # sha256 hex

# Scope identifiers accepted on an ingestion key.  Adding a new scope here is
# backwards compatible: existing keys simply won't carry it until reissued.
SCOPE_LOGS_WRITE = "logs:write"
SCOPE_METRICS_WRITE = "metrics:write"
SCOPE_TRACES_WRITE = "traces:write"

# Default scope set for a freshly issued ingestion key.
DEFAULT_INGESTION_SCOPES = [
    SCOPE_LOGS_WRITE,
    SCOPE_METRICS_WRITE,
    SCOPE_TRACES_WRITE,
]


class ProjectKeyStatus(enum.IntEnum):
    ACTIVE = 0
    INACTIVE = 1


class ProjectKeyUseCase(str, enum.Enum):
    USER = "user"
    PROFILING = "profiling"
    TEMPEST = "tempest"
    DEMO = "demo"


class ProjectIngestionKey(BaseModel):

    __tablename__ = "project_ingestion_keys"

    __table_args__ = (
        UniqueConstraint("key_prefix", name="uq_project_key_prefix"),
    )

    project_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_by_account_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey("accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    name: Mapped[str | None] = mapped_column(
        String(PROJECT_KEY_LABEL_MAX_LENGTH),
        nullable=True,
    )

    key_prefix: Mapped[str] = mapped_column(
        String(API_KEY_PREFIX_LENGTH),
        nullable=False,
        index=True,
    )

    key_hash: Mapped[str] = mapped_column(
        String(API_KEY_HASH_LENGTH),
        nullable=False,
    )

    scopes: Mapped[list[str]] = mapped_column(
        JSON,
        default=lambda: list(DEFAULT_INGESTION_SCOPES),
        nullable=False,
    )

    status: Mapped[ProjectKeyStatus] = mapped_column(
        Integer,
        default=ProjectKeyStatus.ACTIVE,
        nullable=False,
        index=True,
    )

    rate_limit_count: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    rate_limit_window: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    data: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=dict,
    )

    use_case: Mapped[ProjectKeyUseCase] = mapped_column(
        String(32),
        default=ProjectKeyUseCase.USER,
        nullable=False,
    )

    last_used_at: Mapped[datetime | None] = mapped_column(
        UTCDateTime,
        nullable=True,
    )

    expires_at: Mapped[datetime | None] = mapped_column(
        UTCDateTime,
        nullable=True,
    )

    revoked_at: Mapped[datetime | None] = mapped_column(
        UTCDateTime,
        nullable=True,
    )

    project: Mapped[Project] = relationship(
        back_populates="project_ingestion_keys",
    )

    @staticmethod
    def hash_token(token: str) -> str:
        """Hash a full token for storage/verification."""
        return hash_api_key(token)

    @property
    def is_active(self) -> bool:
        return self.status == ProjectKeyStatus.ACTIVE

    @property
    def rate_limit(self) -> tuple[int, int]:
        if self.rate_limit_count and self.rate_limit_window:
            return self.rate_limit_count, self.rate_limit_window
        return (0, 0)

    @property
    def scope_set(self) -> frozenset[str]:
        return frozenset(self.scopes or [])

    def has_scope(self, scope: str) -> bool:
        return scope in self.scope_set

    def get_audit_log_data(self) -> dict[str, Any]:
        return {
            "label": self.name,
            "key_prefix": self.key_prefix,
            "scopes": list(self.scopes or []),
            "status": self.status,
            "rate_limit_count": self.rate_limit_count,
            "rate_limit_window": self.rate_limit_window,
        }