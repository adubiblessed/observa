from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from observa.server.auth.dependencies import get_current_user
from observa.server.db.session import get_session
from observa.server.model.user import User
from observa.server.logs import schema
from observa.server.utils import get_current_account_id


router = APIRouter(
    prefix="/api/logs",
    tags=["logs"],
)




@router.get(
    "/list",
    response_model=list[schema.LogResponse],
)
async def list_logs(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[schema.LogResponse]:
    """
    List all logs accessible to the authenticated user.
    """
    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    return schema.LogResponse(
        id=account_id,
    )
        



