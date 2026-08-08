from __future__ import annotations

from datetime import datetime
from enum import IntEnum
# from tokenize import String
from uuid import UUID

from sqlalchemy import (
    ForeignKey,
    Integer,
    UniqueConstraint,
    Uuid,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from observa.common.model.base import BaseModel, UTCDateTime, utc_now
from observa.server.model.accounts import Account
from observa.server.model.team import Team

class TeamMemberRole(IntEnum):
    OWNER = 0
    MEMBER = 1


class TeamMember(BaseModel):
    __tablename__ = "team_members"

    __table_args__ = (
        UniqueConstraint(
            "team_id", "account_id",
            name="uq_team_member",
        ),
    )

    team_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    account_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    role: Mapped[TeamMemberRole] = mapped_column(
        Integer,
        default=TeamMemberRole.MEMBER,
        nullable=False,
    )

    joined_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, default=utc_now, index=True
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="active",
    )

    team: Mapped["Team"] = relationship(
        back_populates="members",
    )

    account: Mapped["Account"] = relationship(
        back_populates="team_memberships",
    )

