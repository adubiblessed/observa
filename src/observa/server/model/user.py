from observa.common.model.base import BaseModel

from typing import Any
from datetime import date, datetime
from sqlalchemy import (
    TIMESTAMP,
    Boolean,
    Column,
    ColumnElement,
    Date,
    ForeignKey,
    Integer,
    String,
    Text,
    Uuid,
    and_,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship
from sqlalchemy.schema import Index, UniqueConstraint

class User(BaseModel):
    __tablename__ = "users"
    __table_args__ = (
        Index(
            "ix_users_email_case_insensitive", func.lower(Column("email")), unique=True
        ),
    )

    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    email: Mapped[str] = mapped_column(String(320), nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
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

    failed_login_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

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

    first_name: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    last_name: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    country: Mapped[str | None] = mapped_column(String(2), nullable=True, default=None)
    date_of_birth: Mapped[date | None] = mapped_column(
        Date, nullable=True, default=None
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
        return and_(cls.is_deleted.is_(False), cls.blocked_at.is_(None))

    @property
    def signup_attribution(self) -> dict[str, Any]:
        return self.meta.get("signup", {})

    # @signup_attribution.setter
    # def signup_attribution(self, value: dict[str, Any] | Schema | None) -> None:
    #     if not value:
    #         return

        meta = self.meta or {}
        if isinstance(value, Schema):
            value = value.model_dump(exclude_unset=True)

        meta["signup"] = value
        self.meta = meta

    