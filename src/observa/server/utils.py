from __future__ import annotations

from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from observa.server.model.user import User


async def get_current_account_id(
    current_user: User,
    session: AsyncSession,
) -> UUID:
    """
    Resolve the account associated with the authenticated user.
    """

    if current_user.account is not None:
        return current_user.account.id

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="User does not belong to an account",
    )