from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from observa.common.model.base import BaseModel

if TYPE_CHECKING:
    from observa.server.model.accounts import Account


class Project(BaseModel):
    __tablename__ = "projects"


    __table_args__ = (
        UniqueConstraint("team_id", "slug"),
        UniqueConstraint("team_id", "external_id"),
    )

    
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(PROJECT_SLUG_MAX_LENGTH))
    team_id: Mapped[int] = mapped_column(ForeignKey("team.id"))
    public: Mapped[bool] = mapped_column(Boolean, default=False)
    date_added: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    status: Mapped[int] = mapped_column(Integer, default=ObjectStatus.ACTIVE, index=True)
    first_event: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    flags: Mapped[int] = mapped_column(Integer, default=ProjectFlags.DEFAULT)
    platform: Mapped[str | None] = mapped_column(String(64), nullable=True)


    acount_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey("account.id", ondelete="SET NULL"),
        unique=True,
        nullable=True,
    )

    