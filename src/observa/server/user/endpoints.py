from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from observa.server.auth.dependencies import get_current_user
from observa.server.db.session import get_session
from observa.server.model.user import AuthSession, User
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


@router.patch(
    "/me",
    response_model=schema.UserResponse,
)
async def update_me(
    update_data: schema.UpdateUser,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> schema.UserResponse:
    update_fields = update_data.model_dump(exclude_unset=True)

    for field, value in update_fields.items():
        setattr(current_user, field, value)

    await session.commit()
    await session.refresh(current_user)

    return schema.UserResponse.model_validate(current_user)


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_me(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    now = datetime.now(UTC)

    current_user.is_active = False
    current_user.set_deleted_at()

    await session.execute(
        update(AuthSession)
        .where(
            AuthSession.user_id == current_user.id,
            AuthSession.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )

    await session.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)