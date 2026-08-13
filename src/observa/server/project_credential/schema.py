from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CredentialCreate(BaseModel):
    name: str | None = Field(default=None, max_length=64, description="Label or name for the credential")
    use_case: str = Field(default="user", max_length=32, description="Use case tag for the credential")
    roles: int = Field(default=1, ge=0, description="Bitmask of assigned key roles")
    rate_limit_count: int | None = Field(default=None, ge=1, description="Rate limit max requests per window")
    rate_limit_window: int | None = Field(default=None, ge=1, description="Rate limit window size in seconds")


class CredentialResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    name: str | None
    public_key: str
    roles: int
    status: int
    use_case: str
    rate_limit_count: int | None
    rate_limit_window: int | None
    last_used_at: datetime | None
    created_at: datetime
    modified_at: datetime | None
    revoked_at: datetime | None
    expired_at: datetime | None


class CredentialCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    name: str | None
    public_key: str
    secret_key: str
    roles: int
    status: int
    use_case: str
    rate_limit_count: int | None
    rate_limit_window: int | None
    last_used_at: datetime | None
    created_at: datetime
    modified_at: datetime | None
    revoked_at: datetime | None
    expired_at: datetime | None
