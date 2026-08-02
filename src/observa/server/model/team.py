from __future__ import annotations

from datetime import datetime
from enum import IntEnum
from uuid import UUID

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from observa.common.model.base import BaseModel


TEAM_SLUG_MAX_LENGTH = 100
TEAM_NAME_MAX_LENGTH = 64


class TeamStatus(IntEnum):
    ACTIVE = 0
    PENDING_DELETION = 1
    DELETION_IN_PROGRESS = 2


class Team(BaseModel):

    __tablename__ = "teams"

    __table_args__ = (
        UniqueConstraint(
            "account_id", "slug",
            name="uq_team_account_slug",
        ),
    )

    account_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(TEAM_NAME_MAX_LENGTH), nullable=False)
    slug: Mapped[str] = mapped_column(String(TEAM_SLUG_MAX_LENGTH), nullable=False)
    status: Mapped[TeamStatus] = mapped_column(Integer, default=TeamStatus.ACTIVE, nullable=False, index=True,)
    account: Mapped["Account"] = relationship(
        back_populates="teams",
    )
    members: Mapped[list["TeamMember"]] = relationship(
        back_populates="team",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    projects: Mapped[list["Project"]] = relationship(
        back_populates="team",
        lazy="selectin",
    )

    def __str__(self) -> str:
        return f"{self.name} ({self.slug})"

    def get_audit_log_data(self) -> dict:
        return {
            "id": self.id,
            "slug": self.slug,
            "name": self.name,
            "status": self.status,
        }