
#This file is responsible for the user account it is here that user account details are linked to, e.g api keys, organisations, payment if neccesaary, and projects

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from observa.common.model.base import BaseModel

if TYPE_CHECKING:
    from observa.server.model.user import User


class Account(BaseModel):
    __tablename__ = "accounts"

    user_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="SET NULL"),
        unique=True,
        nullable=True,
    )

    user: Mapped[User | None] = relationship(
        "User",
        back_populates="account",
        lazy="raise",
    )

    teams: Mapped[list["Team"]] = relationship(
        back_populates="account",
    )

    team_memberships: Mapped[list["TeamMember"]] = relationship(
        back_populates="account",
        cascade="all, delete-orphan",
    )
