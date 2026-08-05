from __future__ import annotations

from fastapi import APIRouter, Depends

from observa.server.auth.dependencies import get_current_user
from observa.server.model.user import User
from observa.server.user import schema


router = APIRouter(
    prefix="/users",
    tags=["users"],
)


@router.get(
    "/me",
    response_model=schema.UserResponse,
)
async def me(
    current_user: User = Depends(get_current_user),
) -> schema.UserResponse:
    return schema.UserResponse.model_validate(current_user)

