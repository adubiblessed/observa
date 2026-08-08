from __future__ import annotations


from datetime import date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import (
    TIMESTAMP,
    Boolean,
    Column,
    ColumnElement,
    Date,
    Integer,
    String,
    Text,
    and_,
    func,
    Uuid,
    ForeignKey,
)
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.schema import Index

from observa.common.model.base import BaseModel, UTCDateTime
from observa.server.model.accounts import Account


class User(BaseModel):
    __tablename__ = "users"

    __table_args__ = (
        Index(
            "ix_users_email_case_insensitive",
            func.lower(Column("email")),
            unique=True,
        ),
    )

    is_admin: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    email: Mapped[str] = mapped_column(
        String(320),
        nullable=False,
    )

    email_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    avatar_url: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    last_login_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True,
        default=None,
    )

    last_login_ip: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
        default=None,
    )

    failed_login_attempts: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    accepted_terms_of_service_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True,
        default=None,
    )

    accepted_terms_of_service_ip: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
        default=None,
    )

    @hybrid_property
    def accepted_terms_of_service(self) -> bool:
        return self.accepted_terms_of_service_at is not None

    # Time of blocking traffic/activity for given user
    blocked_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True,
        default=None,
    )

    first_name: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
        default=None,
    )

    last_name: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
        default=None,
    )

    country: Mapped[str | None] = mapped_column(
        String(2),
        nullable=True,
        default=None,
    )

    date_of_birth: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        default=None,
    )

    account: Mapped[Account | None] = relationship(
        "Account",
        back_populates="user",
        uselist=False,
        lazy="raise",
    )

    auth_sessions: Mapped[list["AuthSession"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    @property
    def full_name(self) -> str | None:
        parts = [p for p in (self.first_name, self.last_name) if p]
        return " ".join(parts) if parts else None

    @hybrid_property
    def can_authenticate(self) -> bool:
        return not self.is_deleted and self.blocked_at is None

    @can_authenticate.inplace.expression
    @classmethod
    def _can_authenticate_expression(cls) -> ColumnElement[bool]:
        return and_(
            cls.is_deleted.is_(False),
            cls.blocked_at.is_(None),
        )

    @property
    def signup_attribution(self) -> dict[str, Any]:
        return self.meta.get("signup", {})


class AuthSession(BaseModel):
    __tablename__ = "auth_sessions"

    user_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    expires_at: Mapped[datetime] = mapped_column(
        UTCDateTime,
        nullable=False,
    )

    revoked_at: Mapped[datetime | None] = mapped_column(
        UTCDateTime,
        nullable=True,
    )

    user: Mapped["User"] = relationship(
        back_populates="auth_sessions",
    )