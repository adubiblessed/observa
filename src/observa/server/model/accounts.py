#This file is responsible for the user account it is here that user account details are linked to, e.g api keys, organisations, payment if neccesaary, and projects 

from observa.common.model.base import BaseModel

from uuid import UUID

from sqlalchemy import (
    BigInteger,
    Boolean,
    ForeignKey,
    Integer,
    Interval,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship
from typing import TYPE_CHECKING


#prevent circular imports

from observa.server.model.user import User





class Account(BaseModel):
    __tablename__ = "accounts"

    user_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="set null"),
        unique=True,
        nullable=True,
    )

    @declared_attr
    def user(cls) -> Mapped[User | None]:
        return relationship(
            User,
            lazy="raise",
            back_populates="account",
            foreign_keys="[Account.user.id]",
        )