from __future__ import annotations

import enum
from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Uuid,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from observa.common.model.base import BaseModel


class AlertCondition(str, enum.Enum):
    GREATER_THAN = "greater_than"
    GREATER_THAN_OR_EQUAL = "greater_than_or_equal"
    LESS_THAN = "less_than"
    LESS_THAN_OR_EQUAL = "less_than_or_equal"
    EQUAL = "equal"
    NOT_EQUAL = "not_equal"


class AlertSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertStatus(str, enum.Enum):
    ACTIVE = "active"
    DISABLED = "disabled"

class AlertType(str, enum.Enum):
    METRIC = "metric"
    LOG = "log"
    TRACE = "trace"


class Alert(BaseModel):
    __tablename__ = "alerts"

    __table_args__ = (
        UniqueConstraint(
            "project_id", "alert_type", "name",
            name="uq_alert_project_type_name",
        ),
    )

    project_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    alert_type: Mapped[AlertType] = mapped_column(
        Enum(AlertType),
        nullable=False,
    )
    
    query: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )

    condition: Mapped[AlertCondition] = mapped_column(
        Enum(AlertCondition),
        nullable=False,
    )

    threshold: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    duration: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    severity: Mapped[AlertSeverity] = mapped_column(
        Enum(AlertSeverity),
        default=AlertSeverity.WARNING,
        nullable=False,
    )

    status: Mapped[AlertStatus] = mapped_column(
        Enum(AlertStatus),
        default=AlertStatus.ACTIVE,
        nullable=False,
        index=True,
    )

    created_by_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    last_triggered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="alerts",
    )