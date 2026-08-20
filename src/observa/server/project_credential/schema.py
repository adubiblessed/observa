from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from observa.server.model.projectingestionkey import DEFAULT_INGESTION_SCOPES


class CredentialCreate(BaseModel):
    name: str | None = Field(default=None, max_length=64, description="Label or name for the credential")
    use_case: str = Field(default="user", max_length=32, description="Use case tag for the credential")
    scopes: list[str] | None = Field(
        default=None,
        description=(
            "Ingestion scopes granted to this key, e.g. "
            "['logs:write', 'metrics:write', 'traces:write']. "
            "Defaults to all ingestion write scopes."
        ),
    )
    expires_at: datetime | None = Field(
        default=None,
        description="Optional expiry timestamp (UTC). Keys never expire by default.",
    )
    rate_limit_count: int | None = Field(default=None, ge=1, description="Rate limit max requests per window")
    rate_limit_window: int | None = Field(default=None, ge=1, description="Rate limit window size in seconds")


class _CredentialFields(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    name: str | None
    key_prefix: str
    scopes: list[str]
    status: int
    use_case: str
    rate_limit_count: int | None
    rate_limit_window: int | None
    last_used_at: datetime | None
    created_at: datetime
    modified_at: datetime | None
    revoked_at: datetime | None
    expires_at: datetime | None


class CredentialResponse(_CredentialFields):
    """Credential metadata.  Never contains the secret."""


class CredentialCreateResponse(_CredentialFields):
    """Creation/rotation response.  ``token`` is shown exactly once."""

    token: str

    @classmethod
    def from_credential_and_token(cls, credential, token: str) -> "CredentialCreateResponse":
        data = cls.model_validate(credential)
        data.token = token
        return data