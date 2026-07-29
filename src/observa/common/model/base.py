from __future__ import annotations

import uuid
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    ColumnElement,
    DateTime,
    MetaData,
    Uuid,
    inspect,
    type_coerce,
)
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator

metadata = MetaData(
    naming_convention={
        "ix": "ix_%(column_0_N_label)s",
        "uq": "%(table_name)s_%(column_0_N_name)s_key",
        "ck": "%(table_name)s_%(constraint_name)s_check",
        "fk": "%(table_name)s_%(column_0_N_name)s_fkey",
        "pk": "%(table_name)s_pkey",
    }
)


def utc_now() -> datetime:
    return datetime.now(UTC)


def generate_uuid() -> uuid.UUID:
    return uuid.uuid4()


class UTCDateTime(TypeDecorator):
    """Timezone-aware DateTime that behaves identically on every backend.

    SQLite has no native timestamptz storage: an aware datetime written to
    it comes back naive on read, even when the column is declared with
    timezone=True. That silent divergence causes 'can't subtract
    offset-naive and offset-aware datetimes' errors anywhere a value is
    compared against datetime.now(UTC) after a round-trip (e.g. session
    expiry checks) — but only on SQLite, and only after a reload, which
    makes it easy to miss in testing against Postgres.

    This type normalizes at the boundary so every caller can assume
    tz-aware UTC datetimes unconditionally, regardless of backend:
    - process_bind_param: rejects naive input outright, so a bug that
      would otherwise store ambiguous data fails loudly at write time.
    - process_result_value: reattaches UTC to naive values read back from
      backends (SQLite) that don't preserve offset info.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(
        self, value: datetime | None, dialect: object
    ) -> datetime | None:
        if value is not None and value.tzinfo is None:
            raise ValueError(
                "UTCDateTime received a naive datetime; all writes must be "
                "timezone-aware (e.g. datetime.now(UTC))"
            )
        return value

    def process_result_value(
        self, value: datetime | None, dialect: object
    ) -> datetime | None:
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value


class Base(DeclarativeBase):
    __abstract__ = True
    metadata = metadata


class TimestampedModel(Base):
    __abstract__ = True

    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, default=utc_now, index=True
    )
    modified_at: Mapped[datetime | None] = mapped_column(
        UTCDateTime, onupdate=utc_now, nullable=True, default=None
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        UTCDateTime, nullable=True, default=None, index=True
    )

    def set_modified_at(self) -> None:
        self.modified_at = utc_now()

    def set_deleted_at(self) -> None:
        self.deleted_at = utc_now()

    @hybrid_property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    @is_deleted.inplace.expression
    @classmethod
    def is_deleted(cls) -> ColumnElement[bool]:
        return type_coerce(cls.deleted_at.is_not(None), Boolean)


class IDModel(Base):
    __abstract__ = True

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=generate_uuid)

    def __eq__(self, other: object) -> bool:
        return isinstance(other, self.__class__) and self.id == other.id

    def __hash__(self) -> int:
        return self.id.int

    def __repr__(self) -> str:
        inspection = inspect(self)
        if inspection.identity is None:
            return f"{self.__class__.__name__}(id=None)"
        return f"{self.__class__.__name__}(id={inspection.identity[0]!r})"

    @classmethod
    def generate_id(cls) -> UUID:
        return generate_uuid()


class BaseModel(IDModel, TimestampedModel):
    __abstract__ = True