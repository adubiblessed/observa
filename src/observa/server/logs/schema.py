from __future__ import annotations

from pydantic import BaseModel, Field



class LogResponse(BaseModel):

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