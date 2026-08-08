from __future__ import annotations

import enum
import re
import secrets
from uuid import UUID
from datetime import datetime
from typing import Any


from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Uuid,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from observa.common.model.base import BaseModel
from observa.server.model.project import Project

PROJECT_KEY_MAX_LENGTH = 32
PROJECT_KEY_LABEL_MAX_LENGTH = 64

_TOKEN_RE = re.compile(r"^[a-f0-9]{32}$")


class ProjectKeyStatus(enum.IntEnum):
    ACTIVE = 0
    INACTIVE = 1


class ProjectKeyUseCase(str, enum.Enum):
    USER = "user"
    PROFILING = "profiling"
    TEMPEST = "tempest"
    DEMO = "demo"

class ProjectKeyRole:
    STORE = 1 << 0
    API = 1 << 1

    DEFAULT = STORE


class ProjectIngestionKey(BaseModel):
    __tablename__ = "project_ingestion_keys"

    __table_args__ = (
        UniqueConstraint(
            "public_key",
            name="uq_project_key_public_key",
        ),
        UniqueConstraint(
            "secret_key",
            name="uq_project_key_secret_key",
        ),
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

    public_key: Mapped[str] = mapped_column(
        String(PROJECT_KEY_MAX_LENGTH),
        nullable=False,
    )

    secret_key: Mapped[str] = mapped_column(
        String(PROJECT_KEY_MAX_LENGTH),
        nullable=False,
    )

    roles: Mapped[int] = mapped_column(
        Integer,
        default=ProjectKeyRole.DEFAULT,
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

    #added this field for future usecase incase there is need to store user cudtom data using the dict field
    data: Mapped[dict[str, Any]] = mapped_column(
        default=dict,
        nullable=False,
    )

    use_case: Mapped[ProjectKeyUseCase] = mapped_column(
        String(32),
        default=ProjectKeyUseCase.USER,
        nullable=False,
    )

    project: Mapped["Project"] = relationship(
        back_populates="project_ingestion_keys",
    )

    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    expired_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),    
        nullable=True,
    )

    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


    @staticmethod
    def generate_api_key() -> str:
        return secrets.token_hex(16)

    @staticmethod
    def looks_like_api_key(key: str) -> bool:
        return bool(_TOKEN_RE.fullmatch(key))

    @property
    def is_active(self) -> bool:
        return self.status == ProjectKeyStatus.ACTIVE

    @property
    def rate_limit(self) -> tuple[int, int]:
        if self.rate_limit_count and self.rate_limit_window:
            return (
                self.rate_limit_count,
                self.rate_limit_window,
            )

        return (0, 0)

    def has_role(self, role: int) -> bool:
        return bool(self.roles & role)

    def set_role(self, role: int, enabled: bool) -> None:
        if enabled:
            self.roles |= role
        else:
            self.roles &= ~role

    def get_scopes(self) -> tuple[str, ...]:
        return (
            "project:read",
            "project:write",
            "project:admin",
            "project:releases",
            "event:read",
            "event:write",
            "event:admin",
        )

    def get_audit_log_data(self) -> dict[str, Any]:
        return {
            "label": self.name,
            "public_key": self.public_key,
            "roles": self.roles,
            "status": self.status,
            "rate_limit_count": self.rate_limit_count,
            "rate_limit_window": self.rate_limit_window,
        }

    def get_integration_endpoint(self, endpoint: str) -> str:
        return (
            f"{endpoint.rstrip('/')}"
            f"/api/{self.project_id}/integration/"
        )

    def build_integration_endpoint(
        self,
        endpoint: str,
        integration_name: str,
        postfix: str = "",
    ) -> str:
        return (
            f"{self.get_integration_endpoint(endpoint)}"
            f"{integration_name}/{postfix}"
        )

    def get_otlp_traces_endpoint(self, endpoint: str) -> str:
        return self.build_integration_endpoint(
            endpoint,
            "otlp",
            "v1/traces",
        )

    def get_otlp_logs_endpoint(self, endpoint: str) -> str:
        return self.build_integration_endpoint(
            endpoint,
            "otlp",
            "v1/logs",
        )