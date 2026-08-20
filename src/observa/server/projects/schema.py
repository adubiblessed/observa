from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field



class ProjectCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=200,
    )

    slug: str = Field(
        min_length=1,
        max_length=100,
    )

    platform: str | None = Field(
        default=None,
        max_length=64,
    )


class ProjectUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    platform: str | None = Field(
        default=None,
        max_length=64,
    )


class ProjectResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    name: str
    slug: str
    public: bool
    status: int
    first_event: datetime | None = None
    platform: str | None = None
    created_at: datetime
    modified_at: datetime | None = None


class ProjectOverviewResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    name: str
    slug: str
    platform: str | None = None
    first_event: datetime | None = None
    status: int


class ProjectSettingsResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    name: str
    slug: str
    public: bool
    platform: str | None = None


class ProjectSettingsUpdate(BaseModel):

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    public: bool | None = None

    platform: str | None = Field(
        default=None,
        max_length=64,
    )

