from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TeamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64, description="Team display name")
    slug: str = Field(..., min_length=1, max_length=100, description="Unique team slug")


class TeamUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=64)
    slug: str | None = Field(default=None, min_length=1, max_length=100)


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    account_id: UUID
    name: str
    slug: str
    status: int
    member_count: int | None = None
    created_at: datetime
    modified_at: datetime | None = None


class TeamMemberAdd(BaseModel):
    user_id: UUID = Field(..., description="ID of the user to add to the team")
    role: int = Field(default=1, description="Team member role (0=OWNER, 1=MEMBER)")
    status: str = Field(default="active", max_length=50, description="Membership status")


class TeamMemberUpdate(BaseModel):
    role: int | None = Field(default=None, description="Updated team member role")
    status: str | None = Field(default=None, max_length=50, description="Updated membership status")


class TeamMemberUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    first_name: str | None = None
    last_name: str | None = None
    avatar_url: str | None = None


class TeamMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    team_id: UUID
    account_id: UUID
    user_id: UUID
    role: int
    status: str
    joined_at: datetime
    created_at: datetime
    user: TeamMemberUserResponse | None = None
