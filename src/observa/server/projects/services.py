from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from observa.server.model.project import ObjectStatus, Project
from observa.server.model.teammembers import TeamMember
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


async def get_accessible_projects(
    account_id: UUID,
    session: AsyncSession,
) -> list[Project]:
    """
    Return all active projects accessible to an account.

    Access is granted when:
    - the account owns the project, or
    - the account is an active member of the project's team.
    """

    result = await session.execute(
        select(Project)
        .outerjoin(
            TeamMember,
            (
                (TeamMember.team_id == Project.team_id)
                & (TeamMember.account_id == account_id)
                & (TeamMember.status == "active")
            ),
        )
        .where(
            Project.status == ObjectStatus.ACTIVE,
            (
                (Project.account_id == account_id)
                | (TeamMember.account_id == account_id)
            ),
        )
        .order_by(Project.name.asc())
    )

    return list(result.scalars().all())


async def get_accessible_project(
    project_id: UUID,
    account_id: UUID,
    session: AsyncSession,
) -> Project:
    """
    Return a single project accessible to an account.

    A project is accessible when:
    - the account owns it, or
    - the account belongs to its team.

    A 404 is returned when the project either does not exist
    or is not accessible to the account.
    """

    result = await session.execute(
        select(Project)
        .outerjoin(
            TeamMember,
            (
                (TeamMember.team_id == Project.team_id)
                & (TeamMember.account_id == account_id)
                & (TeamMember.status == "active")
            ),
        )
        .where(
            Project.id == project_id,
            Project.status == ObjectStatus.ACTIVE,
            (
                (Project.account_id == account_id)
                | (TeamMember.account_id == account_id)
            ),
        )
    )

    project = result.scalar_one_or_none()

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return project


async def create_project(
    *,
    name: str,
    slug: str,
    platform: str | None,
    account_id: UUID,
    session: AsyncSession,
) -> Project:
    """
    Create an account-owned project.
    """

    result = await session.execute(
        select(Project.id).where(
            Project.account_id == account_id,
            Project.slug == slug,
        )
    )

    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A project with this slug already exists",
        )

    project = Project(
        name=name,
        slug=slug,
        platform=platform,
        public=False,
        status=ObjectStatus.ACTIVE,
        flags=0,
        account_id=account_id,
        team_id=None,
    )

    session.add(project)

    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    await session.refresh(project)

    return project


async def update_project(
    *,
    project: Project,
    update_data: dict,
    session: AsyncSession,
) -> Project:
    """
    Update fields explicitly allowed by the ProjectUpdate schema.
    """

    for field, value in update_data.items():
        setattr(project, field, value)

    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    await session.refresh(project)

    return project


async def delete_project(
    *,
    project: Project,
    session: AsyncSession,
) -> None:
    """
    Soft-delete a project.

    The database row is retained for recovery/auditing.
    """

    project.set_deleted_at()
    project.status = ObjectStatus.PENDING_DELETION

    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise


async def update_project_settings(
    *,
    project: Project,
    update_data: dict,
    session: AsyncSession,
) -> Project:
    """
    Update project settings explicitly allowed by the settings schema.
    """

    for field, value in update_data.items():
        setattr(project, field, value)

    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    await session.refresh(project)

    return project

