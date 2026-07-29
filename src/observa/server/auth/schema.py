from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
	email: EmailStr
	password: str = Field(min_length=8)
	first_name: str 
	last_name: str 
	country: Optional[str] = None
    date_of_birth: date = None
	accept_tos: bool = False


class RegisterResponse(BaseModel):
	id: UUID
	email: EmailStr
	created_at: datetime

