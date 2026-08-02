from __future__ import annotations

from enum import IntEnum
from uuid import UUID

from sqlalchemy import (
    ForeignKey,
    Integer,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from observa.common.model.base import BaseModel


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

    team: Mapped["Team"] = relationship(
        back_populates="members",
    )

    account: Mapped["Account"] = relationship(
        back_populates="team_memberships",
    )