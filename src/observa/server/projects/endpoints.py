from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from observa.server.auth.dependencies import get_current_user
from observa.server.db.session import get_session
from observa.server.model.user import User
from observa.server.projects import schema
from observa.server.projects.services import (
    create_project,
    delete_project,
    get_accessible_project,
    get_accessible_projects,
    get_current_account_id,
    update_project,
    update_project_settings,
)


router = APIRouter(tags=["project"])


@router.get(
    "/",
    response_model=list[schema.ProjectResponse],
)
async def get_projects(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[schema.ProjectResponse]:
    """
    Return all projects accessible to the current user.
    """

    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    projects = await get_accessible_projects(
        account_id=account_id,
        session=session,
    )

    return [
        schema.ProjectResponse.model_validate(project)
        for project in projects
    ]


@router.post(
    "/",
    response_model=schema.ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_project_endpoint(
    payload: schema.ProjectCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> schema.ProjectResponse:
    """
    Create an account-owned project.
    """

    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    project = await create_project(
        name=payload.name,
        slug=payload.slug,
        platform=payload.platform,
        account_id=account_id,
        session=session,
    )

    return schema.ProjectResponse.model_validate(project)


@router.get(
    "/{project_id}",
    response_model=schema.ProjectResponse,
)
async def get_project_by_id(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> schema.ProjectResponse:
    """
    Return a project accessible to the current user.
    """

    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    project = await get_accessible_project(
        project_id=project_id,
        account_id=account_id,
        session=session,
    )

    return schema.ProjectResponse.model_validate(project)


@router.patch(
    "/{project_id}",
    response_model=schema.ProjectResponse,
)
async def update_project_by_id(
    project_id: UUID,
    payload: schema.ProjectUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> schema.ProjectResponse:

    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    project = await get_accessible_project(
        project_id=project_id,
        account_id=account_id,
        session=session,
    )

    project = await update_project(
        project=project,
        update_data=payload.model_dump(exclude_unset=True),
        session=session,
    )

    return schema.ProjectResponse.model_validate(project)


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_project_by_id(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    """
    Soft-delete an accessible project.
    """

    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    project = await get_accessible_project(
        project_id=project_id,
        account_id=account_id,
        session=session,
    )

    await delete_project(
        project=project,
        session=session,
    )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
    )


@router.get(
    "/{project_id}/overview",
    response_model=schema.ProjectOverviewResponse,
)
async def get_project_overview(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> schema.ProjectOverviewResponse:

    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    project = await get_accessible_project(
        project_id=project_id,
        account_id=account_id,
        session=session,
    )

    return schema.ProjectOverviewResponse(
        id=project.id,
        name=project.name,
        slug=project.slug,
        platform=project.platform,
        first_event=project.first_event,
        status=project.status,
    )


@router.get(
    "/{project_id}/settings",
    response_model=schema.ProjectSettingsResponse,
)
async def get_project_settings(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> schema.ProjectSettingsResponse:

    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    project = await get_accessible_project(
        project_id=project_id,
        account_id=account_id,
        session=session,
    )

    return schema.ProjectSettingsResponse(
        id=project.id,
        name=project.name,
        slug=project.slug,
        public=project.public,
        platform=project.platform,
    )


@router.patch(
    "/{project_id}/settings",
    response_model=schema.ProjectSettingsResponse,
)
async def update_project_settings_endpoint(
    project_id: UUID,
    payload: schema.ProjectSettingsUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> schema.ProjectSettingsResponse:

    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )

    project = await get_accessible_project(
        project_id=project_id,
        account_id=account_id,
        session=session,
    )

    project = await update_project_settings(
        project=project,
        update_data=payload.model_dump(exclude_unset=True),
        session=session,
    )

    return schema.ProjectSettingsResponse(
        id=project.id,
        name=project.name,
        slug=project.slug,
        public=project.public,
        platform=project.platform,
    )

