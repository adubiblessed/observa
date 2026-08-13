from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from observa.server.model.accounts import Account
from observa.server.model.project import ObjectStatus, Project
from observa.server.model.team import Team, TeamStatus
from observa.server.model.teammembers import TeamMember, TeamMemberRole
from observa.server.model.user import User


async def get_team_projects(
    team: Team,
    session: AsyncSession,
) -> list[Project]:
    """
    Return all active projects associated with a team.
    """
    result = await session.execute(
        select(Project)
        .where(
            Project.team_id == team.id,
            Project.status == ObjectStatus.ACTIVE,
            Project.deleted_at.is_(None),
        )
        .order_by(Project.name.asc())
    )

    return list(result.scalars().all())



async def get_accessible_team(
    team_id: UUID,
    account_id: UUID,
    session: AsyncSession,
) -> Team:
    """
    Return a single active team accessible to an account.

    Accessible when:
    - the account owns the team (team.account_id == account_id), or
    - the account is an active member in team_members.
    """

    result = await session.execute(
        select(Team)
        .outerjoin(
            TeamMember,
            (
                (TeamMember.team_id == Team.id)
                & (TeamMember.account_id == account_id)
                & (TeamMember.status == "active")
            ),
        )
        .where(
            Team.id == team_id,
            Team.status == TeamStatus.ACTIVE,
            Team.deleted_at.is_(None),
            (
                (Team.account_id == account_id)
                | (TeamMember.account_id == account_id)
            ),
        )
    )

    team = result.scalar_one_or_none()

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    return team


async def check_team_management_permission(
    team: Team,
    account_id: UUID,
    session: AsyncSession,
) -> None:
    """
    Verify that an account has administrative management permissions over a team.
    Allowed if account is team owner or an active member with TeamMemberRole.OWNER.
    """

    if team.account_id == account_id:
        return

    result = await session.execute(
        select(TeamMember).where(
            TeamMember.team_id == team.id,
            TeamMember.account_id == account_id,
            TeamMember.status == "active",
            TeamMember.role == TeamMemberRole.OWNER,
            TeamMember.deleted_at.is_(None),
        )
    )

    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this team",
        )


async def get_accessible_teams(
    account_id: UUID,
    session: AsyncSession,
) -> list[tuple[Team, int]]:
    """
    Return all active teams accessible to an account alongside member counts.
    """

    result = await session.execute(
        select(
            Team,
            func.count(TeamMember.id).label("member_count"),
        )
        .outerjoin(
            TeamMember,
            (
                (TeamMember.team_id == Team.id)
                & (TeamMember.deleted_at.is_(None))
                & (TeamMember.status == "active")
            ),
        )
        .where(
            Team.status == TeamStatus.ACTIVE,
            Team.deleted_at.is_(None),
            (
                (Team.account_id == account_id)
                | (
                    Team.id.in_(
                        select(TeamMember.team_id).where(
                            TeamMember.account_id == account_id,
                            TeamMember.status == "active",
                            TeamMember.deleted_at.is_(None),
                        )
                    )
                )
            ),
        )
        .group_by(Team.id)
        .order_by(Team.name.asc())
    )

    return [(row[0], row[1]) for row in result.all()]


async def create_team(
    *,
    name: str,
    slug: str,
    account_id: UUID,
    session: AsyncSession,
) -> Team:
    """
    Create a new team owned by account_id and create initial OWNER membership.
    """

    existing = await session.execute(
        select(Team.id).where(
            Team.account_id == account_id,
            Team.slug == slug,
            Team.deleted_at.is_(None),
        )
    )

    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A team with this slug already exists for your account",
        )

    team = Team(
        account_id=account_id,
        name=name,
        slug=slug,
        status=TeamStatus.ACTIVE,
    )
    session.add(team)

    await session.flush()

    initial_member = TeamMember(
        team_id=team.id,
        account_id=account_id,
        role=TeamMemberRole.OWNER,
        status="active",
    )
    session.add(initial_member)

    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    await session.refresh(team)
    return team


async def update_team(
    *,
    team: Team,
    update_data: dict,
    account_id: UUID,
    session: AsyncSession,
) -> Team:
    """
    Update team fields (name, slug).
    """

    await check_team_management_permission(team, account_id, session)

    if "slug" in update_data and update_data["slug"] != team.slug:
        existing = await session.execute(
            select(Team.id).where(
                Team.account_id == team.account_id,
                Team.slug == update_data["slug"],
                Team.id != team.id,
                Team.deleted_at.is_(None),
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A team with this slug already exists for your account",
            )

    for field, value in update_data.items():
        setattr(team, field, value)

    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    await session.refresh(team)
    return team


async def delete_team(
    *,
    team: Team,
    account_id: UUID,
    session: AsyncSession,
) -> None:
    """
    Soft-delete a team.
    """

    await check_team_management_permission(team, account_id, session)

    team.set_deleted_at()
    team.status = TeamStatus.PENDING_DELETION

    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise


async def get_team_members(
    *,
    team: Team,
    session: AsyncSession,
) -> list[tuple[TeamMember, User]]:
    """
    List members belonging to a team alongside user details.
    """

    result = await session.execute(
        select(TeamMember, User)
        .join(Account, TeamMember.account_id == Account.id)
        .join(User, Account.user_id == User.id)
        .where(
            TeamMember.team_id == team.id,
            TeamMember.deleted_at.is_(None),
        )
        .order_by(TeamMember.created_at.asc())
    )

    return list(result.all())


async def add_team_member(
    *,
    team: Team,
    caller_account_id: UUID,
    target_user_id: UUID,
    role: int,
    member_status: str,
    session: AsyncSession,
) -> tuple[TeamMember, User]:
    """
    Add a user to a team.
    """

    await check_team_management_permission(team, caller_account_id, session)

    user_result = await session.execute(
        select(User).where(
            User.id == target_user_id,
            User.is_active.is_(True),
            User.deleted_at.is_(None),
        )
    )
    target_user = user_result.scalar_one_or_none()
    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found",
        )

    account_result = await session.execute(
        select(Account).where(Account.user_id == target_user.id)
    )
    target_account = account_result.scalar_one_or_none()
    if target_account is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target user has no active account",
        )

    existing_member_res = await session.execute(
        select(TeamMember).where(
            TeamMember.team_id == team.id,
            TeamMember.account_id == target_account.id,
        )
    )
    existing_member = existing_member_res.scalar_one_or_none()

    if existing_member is not None:
        if existing_member.deleted_at is None and existing_member.status == "active":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User is already an active member of this team",
            )
        # Reactivate existing member record if previously removed
        existing_member.deleted_at = None
        existing_member.status = member_status
        existing_member.role = TeamMemberRole(role)
        member = existing_member
    else:
        member = TeamMember(
            team_id=team.id,
            account_id=target_account.id,
            role=TeamMemberRole(role),
            status=member_status,
        )
        session.add(member)

    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    await session.refresh(member)
    return member, target_user


async def get_team_member(
    *,
    team: Team,
    target_user_id: UUID,
    session: AsyncSession,
) -> tuple[TeamMember, User]:
    """
    Get membership detail for a specific user in a team.
    """

    result = await session.execute(
        select(TeamMember, User)
        .join(Account, TeamMember.account_id == Account.id)
        .join(User, Account.user_id == User.id)
        .where(
            TeamMember.team_id == team.id,
            User.id == target_user_id,
            TeamMember.deleted_at.is_(None),
        )
    )

    record = result.first()
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found",
        )

    return record[0], record[1]


async def update_team_member(
    *,
    team: Team,
    caller_account_id: UUID,
    target_user_id: UUID,
    update_data: dict,
    session: AsyncSession,
) -> tuple[TeamMember, User]:
    """
    Update team member role or status.
    """

    await check_team_management_permission(team, caller_account_id, session)

    member, target_user = await get_team_member(
        team=team,
        target_user_id=target_user_id,
        session=session,
    )

    if "role" in update_data:
        new_role = update_data["role"]
        # Protection: if demoting an owner, ensure another active owner remains
        if member.role == TeamMemberRole.OWNER and new_role != TeamMemberRole.OWNER:
            owners_count_res = await session.execute(
                select(func.count(TeamMember.id)).where(
                    TeamMember.team_id == team.id,
                    TeamMember.role == TeamMemberRole.OWNER,
                    TeamMember.status == "active",
                    TeamMember.deleted_at.is_(None),
                    TeamMember.id != member.id,
                )
            )
            if (owners_count_res.scalar() or 0) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot demote the sole owner of a team",
                )
        member.role = TeamMemberRole(new_role)

    if "status" in update_data:
        member.status = update_data["status"]

    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    await session.refresh(member)
    return member, target_user


async def remove_team_member(
    *,
    team: Team,
    caller_account_id: UUID,
    target_user_id: UUID,
    session: AsyncSession,
) -> None:
    """
    Remove a user from a team.
    """

    member, target_user = await get_team_member(
        team=team,
        target_user_id=target_user_id,
        session=session,
    )

    # Permission check: Caller can remove themselves, or caller must have team management rights
    if member.account_id != caller_account_id:
        await check_team_management_permission(team, caller_account_id, session)

    # Protection: Cannot remove sole owner
    if member.role == TeamMemberRole.OWNER or team.account_id == member.account_id:
        owners_count_res = await session.execute(
            select(func.count(TeamMember.id)).where(
                TeamMember.team_id == team.id,
                TeamMember.role == TeamMemberRole.OWNER,
                TeamMember.status == "active",
                TeamMember.deleted_at.is_(None),
                TeamMember.id != member.id,
            )
        )
        if (owners_count_res.scalar() or 0) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the sole owner of a team. Transfer ownership or delete the team.",
            )

    member.set_deleted_at()
    member.status = "removed"

    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise
