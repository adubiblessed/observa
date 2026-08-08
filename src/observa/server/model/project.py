from __future__ import annotations

from datetime import datetime
from uuid import UUID
from typing import Any


from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from observa.common.model.base import BaseModel
from observa.server.model.team import Team


PROJECT_SLUG_MAX_LENGTH = 100

class ObjectStatus:
    ACTIVE = 0
    PENDING_DELETION = 1
    DELETION_IN_PROGRESS = 2


class ProjectFlags:
    """
    Bit positions for Project.flags, preserved in the exact order of the
    original TypedClassBitField.

    WARNING: only append new flags at the end. Reordering or removing a flag
    shifts every bit after it and silently corrupts already-persisted values.
    """

    HAS_FLAGS = 1 << 0  
    HAS_SESSIONS = 1 << 1
    HAS_CRON_MONITORS = 1 << 2
    HAS_CRON_CHECKINS = 1 << 3
    HAS_INSIGHTS_VITALS = 1 << 4
    HAS_INSIGHTS_CACHES = 1 << 5
    HAS_ALERT_FILTERS = 1 << 6
    HAS_LOGS = 1 << 7
    HAS_METRICS = 1 << 8
    HAS_TRACE= 1 << 9
    HAS_BACKUP= 1 << 10

    DEFAULT = 0



class Project(BaseModel):
    __tablename__ = "projects"


    __table_args__ = (
        UniqueConstraint("account_id", "slug"),
        UniqueConstraint("team_id", "slug"),
        CheckConstraint(
            """
            (account_id IS NOT NULL AND team_id IS NULL)
            OR
            (account_id IS NULL AND team_id IS NOT NULL)
            """,
            name="ck_project_single_owner",
        ),
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(PROJECT_SLUG_MAX_LENGTH), nullable=False)
    public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[int] = mapped_column(Integer, default=ObjectStatus.ACTIVE, index=True, nullable=False)
    first_event: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    flags: Mapped[int] = mapped_column(Integer, default=ProjectFlags.DEFAULT)
    platform: Mapped[str | None] = mapped_column(String(64), nullable=True)

    account_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    team_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey("teams.id", ondelete="SET NULL"),
        nullable=True,
    )
    team: Mapped["Team | None"] = relationship(
       back_populates="projects",
    )
    
    def __str__(self) -> str:
        return f"{self.name} ({self.slug})"

    def has_flag(self, flag: int) -> bool:
        return bool(self.flags & flag)

    def set_flag(self, flag: int, value: bool) -> None:
        self.flags = (self.flags | flag) if value else (self.flags & ~flag)

    
    def get_audit_log_data(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "slug": self.slug,
            "name": self.name,
            "status": self.status,
            "public": self.public,
        }

    def get_full_name(self) -> str:
        return self.slug

