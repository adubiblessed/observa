from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str
    last_name: str
    country: str | None = Field(default=None, min_length=2, max_length=2)
    date_of_birth: date | None = None
    accept_tos: bool = False


class RegisterResponse(BaseModel):
    id: UUID
    email: EmailStr
    created_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginResponse(BaseModel):
    id: UUID
    email: EmailStr
    last_login_at: datetime | None
