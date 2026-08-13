from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from observa.server.auth.dependencies import get_current_user
from observa.server.db.session import get_session
from observa.server.model.user import User
from observa.server.projects.schema import ProjectResponse
from observa.server.projects.services import get_current_account_id
from observa.server.teams import schema, services


router = APIRouter(
    prefix="/api/teams",
    tags=["teams"],
)




@router.get(
    "",
    response_model=list[schema.TeamResponse],
)
async def list_teams(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[schema.TeamResponse]:
    """
    List all teams accessible to the authenticated user.
    """
    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    teams_with_count = await services.get_accessible_teams(
        account_id=account_id,
        session=session,
    )

    return [
        schema.TeamResponse(
            id=team.id,
            account_id=team.account_id,
            name=team.name,
            slug=team.slug,
            status=team.status,
            member_count=count,
            created_at=team.created_at,
            modified_at=team.modified_at,
        )
        for team, count in teams_with_count
    ]


@router.post(
    "",
    response_model=schema.TeamResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_team_endpoint(
    payload: schema.TeamCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> schema.TeamResponse:
    """
    Create a new team and make the creator the initial owner.
    """
    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    team = await services.create_team(
        name=payload.name,
        slug=payload.slug,
        account_id=account_id,
        session=session,
    )

    return schema.TeamResponse.model_validate(team)


@router.get(
    "/{team_id}",
    response_model=schema.TeamResponse,
)
async def get_team_endpoint(
    team_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> schema.TeamResponse:
    """
    Retrieve team details for an accessible team.
    """
    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    team = await services.get_accessible_team(
        team_id=team_id,
        account_id=account_id,
        session=session,
    )

    return schema.TeamResponse.model_validate(team)


@router.patch(
    "/{team_id}",
    response_model=schema.TeamResponse,
)
async def update_team_endpoint(
    team_id: UUID,
    payload: schema.TeamUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> schema.TeamResponse:
    """
    Update team information.
    Requires team management permission.
    """
    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    team = await services.get_accessible_team(
        team_id=team_id,
        account_id=account_id,
        session=session,
    )

    updated_team = await services.update_team(
        team=team,
        update_data=payload.model_dump(exclude_unset=True),
        account_id=account_id,
        session=session,
    )

    return schema.TeamResponse.model_validate(updated_team)


@router.delete(
    "/{team_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_team_endpoint(
    team_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    """
    Soft-delete a team.
    Requires team management permission.
    """
    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    team = await services.get_accessible_team(
        team_id=team_id,
        account_id=account_id,
        session=session,
    )

    await services.delete_team(
        team=team,
        account_id=account_id,
        session=session,
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)




@router.get(
    "/{team_id}/members",
    response_model=list[schema.TeamMemberResponse],
)
async def list_team_members(
    team_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[schema.TeamMemberResponse]:
    """
    List members of an accessible team.
    """
    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    team = await services.get_accessible_team(
        team_id=team_id,
        account_id=account_id,
        session=session,
    )

    members_with_user = await services.get_team_members(
        team=team,
        session=session,
    )

    return [
        schema.TeamMemberResponse(
            id=member.id,
            team_id=member.team_id,
            account_id=member.account_id,
            user_id=user.id,
            role=member.role,
            status=member.status,
            joined_at=member.joined_at,
            created_at=member.created_at,
            user=schema.TeamMemberUserResponse.model_validate(user),
        )
        for member, user in members_with_user
    ]


@router.post(
    "/{team_id}/members",
    response_model=schema.TeamMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_team_member_endpoint(
    team_id: UUID,
    payload: schema.TeamMemberAdd,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> schema.TeamMemberResponse:
    """
    Add a user to a team.
    Requires team management permission.
    """
    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    team = await services.get_accessible_team(
        team_id=team_id,
        account_id=account_id,
        session=session,
    )

    member, user = await services.add_team_member(
        team=team,
        caller_account_id=account_id,
        target_user_id=payload.user_id,
        role=payload.role,
        member_status=payload.status,
        session=session,
    )

    return schema.TeamMemberResponse(
        id=member.id,
        team_id=member.team_id,
        account_id=member.account_id,
        user_id=user.id,
        role=member.role,
        status=member.status,
        joined_at=member.joined_at,
        created_at=member.created_at,
        user=schema.TeamMemberUserResponse.model_validate(user),
    )


@router.get(
    "/{team_id}/members/{user_id}",
    response_model=schema.TeamMemberResponse,
)
async def get_team_member_endpoint(
    team_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> schema.TeamMemberResponse:
    """
    Get membership details for a user in a team.
    """
    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    team = await services.get_accessible_team(
        team_id=team_id,
        account_id=account_id,
        session=session,
    )

    member, user = await services.get_team_member(
        team=team,
        target_user_id=user_id,
        session=session,
    )

    return schema.TeamMemberResponse(
        id=member.id,
        team_id=member.team_id,
        account_id=member.account_id,
        user_id=user.id,
        role=member.role,
        status=member.status,
        joined_at=member.joined_at,
        created_at=member.created_at,
        user=schema.TeamMemberUserResponse.model_validate(user),
    )


@router.patch(
    "/{team_id}/members/{user_id}",
    response_model=schema.TeamMemberResponse,
)
async def update_team_member_endpoint(
    team_id: UUID,
    user_id: UUID,
    payload: schema.TeamMemberUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> schema.TeamMemberResponse:
    """
    Update member role or status.
    Requires team management permission.
    """
    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    team = await services.get_accessible_team(
        team_id=team_id,
        account_id=account_id,
        session=session,
    )

    member, user = await services.update_team_member(
        team=team,
        caller_account_id=account_id,
        target_user_id=user_id,
        update_data=payload.model_dump(exclude_unset=True),
        session=session,
    )

    return schema.TeamMemberResponse(
        id=member.id,
        team_id=member.team_id,
        account_id=member.account_id,
        user_id=user.id,
        role=member.role,
        status=member.status,
        joined_at=member.joined_at,
        created_at=member.created_at,
        user=schema.TeamMemberUserResponse.model_validate(user),
    )


@router.delete(
    "/{team_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_team_member_endpoint(
    team_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    """
    Remove a member from a team.
    Can be used when a member leaves or management removes a member.
    """
    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    team = await services.get_accessible_team(
        team_id=team_id,
        account_id=account_id,
        session=session,
    )

    await services.remove_team_member(
        team=team,
        caller_account_id=account_id,
        target_user_id=user_id,
        session=session,
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ============================================================
# Team Projects
# ============================================================


@router.get(
    "/{team_id}/projects",
    response_model=list[ProjectResponse],
)
async def list_team_projects(
    team_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ProjectResponse]:
    """
    Retrieve projects associated with an accessible team.
    """
    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    team = await services.get_accessible_team(
        team_id=team_id,
        account_id=account_id,
        session=session,
    )

    projects = await services.get_team_projects(
        team=team,
        session=session,
    )

    return [
        ProjectResponse.model_validate(project)
        for project in projects
    ]