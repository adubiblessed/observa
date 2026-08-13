from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from observa.main import create_app
from observa.server.auth.dependencies import get_current_user
from observa.server.db.session import get_session
from observa.server.model.accounts import Account
from observa.server.model.team import TeamStatus
from observa.server.model.teammembers import TeamMemberRole
from observa.server.model.user import User
from observa.server.teams import services


@pytest.mark.anyio
async def test_teams_service_lifecycle(async_session: AsyncSession) -> None:
    # 1. Create User A & User B
    user_a = User(
        email="teama@example.com",
        password_hash="hash",
        is_active=True,
        email_verified=True,
    )
    async_session.add(user_a)
    await async_session.commit()
    account_a = Account(user_id=user_a.id)
    async_session.add(account_a)
    await async_session.commit()
    await async_session.refresh(account_a)
    user_a.account = account_a

    user_b = User(
        email="teamb@example.com",
        password_hash="hash",
        is_active=True,
        email_verified=True,
    )
    async_session.add(user_b)
    await async_session.commit()
    account_b = Account(user_id=user_b.id)
    async_session.add(account_b)
    await async_session.commit()
    await async_session.refresh(account_b)
    user_b.account = account_b

    # 2. Create Team
    team = await services.create_team(
        name="Core Platform",
        slug="core-platform",
        account_id=account_a.id,
        session=async_session,
    )
    assert team.id is not None
    assert team.name == "Core Platform"
    assert team.account_id == account_a.id

    # 3. Retrieve accessible teams
    teams_with_count = await services.get_accessible_teams(
        account_id=account_a.id,
        session=async_session,
    )
    assert len(teams_with_count) == 1
    assert teams_with_count[0][0].id == team.id
    assert teams_with_count[0][1] == 1  # 1 initial owner member

    # 4. Add User B to Team
    member_b, user_b_fetched = await services.add_team_member(
        team=team,
        caller_account_id=account_a.id,
        target_user_id=user_b.id,
        role=TeamMemberRole.MEMBER,
        member_status="active",
        session=async_session,
    )
    assert member_b.team_id == team.id
    assert member_b.account_id == account_b.id
    assert member_b.role == TeamMemberRole.MEMBER

    # 5. List team members
    members = await services.get_team_members(
        team=team,
        session=async_session,
    )
    assert len(members) == 2
    user_ids = {u.id for _, u in members}
    assert user_ids == {user_a.id, user_b.id}

    # 6. Update User B role to OWNER
    updated_member_b, _ = await services.update_team_member(
        team=team,
        caller_account_id=account_a.id,
        target_user_id=user_b.id,
        update_data={"role": TeamMemberRole.OWNER},
        session=async_session,
    )
    assert updated_member_b.role == TeamMemberRole.OWNER

    # 7. Update Team Info
    updated_team = await services.update_team(
        team=team,
        update_data={"name": "Core Platform Engineering"},
        account_id=account_a.id,
        session=async_session,
    )
    assert updated_team.name == "Core Platform Engineering"

    # 8. Remove User A from Team
    await services.remove_team_member(
        team=team,
        caller_account_id=account_a.id,
        target_user_id=user_a.id,
        session=async_session,
    )
    remaining_members = await services.get_team_members(
        team=team,
        session=async_session,
    )
    assert len(remaining_members) == 1
    assert remaining_members[0][1].id == user_b.id

    # 9. Soft-delete Team
    await services.delete_team(
        team=team,
        account_id=account_b.id,  # User B is now sole owner
        session=async_session,
    )
    assert team.status == TeamStatus.PENDING_DELETION
    assert team.is_deleted is True


@pytest.mark.anyio
async def test_teams_api_endpoints(async_session: AsyncSession) -> None:
    # Setup User 1 (Creator) and User 2
    u1 = User(email="api_owner@example.com", password_hash="hash", is_active=True, email_verified=True)
    async_session.add(u1)
    await async_session.commit()
    acc1 = Account(user_id=u1.id)
    async_session.add(acc1)
    await async_session.commit()
    await async_session.refresh(acc1)
    u1.account = acc1

    u2 = User(email="api_member@example.com", password_hash="hash", is_active=True, email_verified=True)
    async_session.add(u2)
    await async_session.commit()
    acc2 = Account(user_id=u2.id)
    async_session.add(acc2)
    await async_session.commit()
    await async_session.refresh(acc2)
    u2.account = acc2

    app = create_app()

    async def override_get_session():
        yield async_session

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_current_user] = lambda: u1

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. POST /api/teams (Create team)
        create_resp = await client.post(
            "/api/teams",
            json={"name": "DevOps", "slug": "devops"},
        )
        assert create_resp.status_code == 201
        team_data = create_resp.json()
        assert team_data["name"] == "DevOps"
        team_id = team_data["id"]

        # 2. GET /api/teams (List teams)
        list_resp = await client.get("/api/teams")
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        assert len(list_data) == 1
        assert list_data[0]["id"] == team_id
        assert list_data[0]["member_count"] == 1

        # 3. GET /api/teams/{team_id}
        get_resp = await client.get(f"/api/teams/{team_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["id"] == team_id

        # 4. PATCH /api/teams/{team_id}
        patch_resp = await client.patch(
            f"/api/teams/{team_id}",
            json={"name": "Site Reliability Engineering"},
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["name"] == "Site Reliability Engineering"

        # 5. POST /api/teams/{team_id}/members (Add U2)
        add_resp = await client.post(
            f"/api/teams/{team_id}/members",
            json={"user_id": str(u2.id), "role": TeamMemberRole.MEMBER},
        )
        assert add_resp.status_code == 201
        member_data = add_resp.json()
        assert member_data["user_id"] == str(u2.id)

        # 6. GET /api/teams/{team_id}/members (List members)
        members_resp = await client.get(f"/api/teams/{team_id}/members")
        assert members_resp.status_code == 200
        m_list = members_resp.json()
        assert len(m_list) == 2

        # 7. GET /api/teams/{team_id}/members/{user_id}
        get_m_resp = await client.get(f"/api/teams/{team_id}/members/{u2.id}")
        assert get_m_resp.status_code == 200
        assert get_m_resp.json()["user_id"] == str(u2.id)

        # 8. PATCH /api/teams/{team_id}/members/{user_id} (Promote U2)
        patch_m_resp = await client.patch(
            f"/api/teams/{team_id}/members/{u2.id}",
            json={"role": TeamMemberRole.OWNER},
        )
        assert patch_m_resp.status_code == 200
        assert patch_m_resp.json()["role"] == TeamMemberRole.OWNER

        # 9. DELETE /api/teams/{team_id}/members/{user_id} (Remove U2)
        del_m_resp = await client.delete(f"/api/teams/{team_id}/members/{u2.id}")
        assert del_m_resp.status_code == 204

        # 10. DELETE /api/teams/{team_id} (Delete team)
        del_t_resp = await client.delete(f"/api/teams/{team_id}")
        assert del_t_resp.status_code == 204


@pytest.mark.anyio
async def test_team_permissions_and_sole_owner_protection(async_session: AsyncSession) -> None:
    # User Owner & User Regular & User Outside
    u_owner = User(email="owner_perm@example.com", password_hash="hash", is_active=True, email_verified=True)
    async_session.add(u_owner)
    await async_session.commit()
    acc_owner = Account(user_id=u_owner.id)
    async_session.add(acc_owner)
    await async_session.commit()
    await async_session.refresh(acc_owner)
    u_owner.account = acc_owner

    u_member = User(email="member_perm@example.com", password_hash="hash", is_active=True, email_verified=True)
    async_session.add(u_member)
    await async_session.commit()
    acc_member = Account(user_id=u_member.id)
    async_session.add(acc_member)
    await async_session.commit()
    await async_session.refresh(acc_member)
    u_member.account = acc_member

    u_outside = User(email="outside_perm@example.com", password_hash="hash", is_active=True, email_verified=True)
    async_session.add(u_outside)
    await async_session.commit()
    acc_outside = Account(user_id=u_outside.id)
    async_session.add(acc_outside)
    await async_session.commit()
    await async_session.refresh(acc_outside)
    u_outside.account = acc_outside

    # Create Team owned by u_owner
    team = await services.create_team(
        name="Security Team",
        slug="sec-team",
        account_id=acc_owner.id,
        session=async_session,
    )

    # Add u_member as MEMBER
    await services.add_team_member(
        team=team,
        caller_account_id=acc_owner.id,
        target_user_id=u_member.id,
        role=TeamMemberRole.MEMBER,
        member_status="active",
        session=async_session,
    )

    # Outside user cannot access team -> 404
    with pytest.raises(Exception):
        await services.get_accessible_team(
            team_id=team.id,
            account_id=acc_outside.id,
            session=async_session,
        )

    # Regular member (u_member) lacks management permission to update team -> 403
    with pytest.raises(Exception):
        await services.update_team(
            team=team,
            update_data={"name": "Hacked Name"},
            account_id=acc_member.id,
            session=async_session,
        )

    # Regular member cannot add new members -> 403
    with pytest.raises(Exception):
        await services.add_team_member(
            team=team,
            caller_account_id=acc_member.id,
            target_user_id=u_outside.id,
            role=TeamMemberRole.MEMBER,
            member_status="active",
            session=async_session,
        )

    # Sole owner protection: Attempting to remove u_owner when u_owner is sole owner -> 400
    with pytest.raises(Exception):
        await services.remove_team_member(
            team=team,
            caller_account_id=acc_owner.id,
            target_user_id=u_owner.id,
            session=async_session,
        )


@pytest.mark.anyio
async def test_team_projects_api_endpoint(async_session: AsyncSession) -> None:
    from observa.server.model.project import ObjectStatus, Project

    # 1. Setup User 1 (Account 1, Team A Owner)
    u1 = User(email="team_owner_proj@example.com", password_hash="hash", is_active=True, email_verified=True)
    async_session.add(u1)
    await async_session.commit()
    acc1 = Account(user_id=u1.id)
    async_session.add(acc1)
    await async_session.commit()
    await async_session.refresh(acc1)
    u1.account = acc1

    team_a = await services.create_team(
        name="Team Alpha",
        slug="team-alpha",
        account_id=acc1.id,
        session=async_session,
    )

    proj_a = Project(
        name="Project Alpha",
        slug="project-alpha",
        status=ObjectStatus.ACTIVE,
        account_id=None,
        team_id=team_a.id,
    )
    async_session.add(proj_a)
    await async_session.commit()

    # 2. Setup User 2 (Account 2, Team B Owner)
    u2 = User(email="other_team_owner@example.com", password_hash="hash", is_active=True, email_verified=True)
    async_session.add(u2)
    await async_session.commit()
    acc2 = Account(user_id=u2.id)
    async_session.add(acc2)
    await async_session.commit()
    await async_session.refresh(acc2)
    u2.account = acc2

    team_b = await services.create_team(
        name="Team Beta",
        slug="team-beta",
        account_id=acc2.id,
        session=async_session,
    )

    proj_b = Project(
        name="Project Beta",
        slug="project-beta",
        status=ObjectStatus.ACTIVE,
        account_id=None,
        team_id=team_b.id,
    )

    async_session.add(proj_b)
    await async_session.commit()

    # 3. Setup User 3 (Account 3, Member of Team A)
    u3 = User(email="team_member_proj@example.com", password_hash="hash", is_active=True, email_verified=True)
    async_session.add(u3)
    await async_session.commit()
    acc3 = Account(user_id=u3.id)
    async_session.add(acc3)
    await async_session.commit()
    await async_session.refresh(acc3)
    u3.account = acc3

    await services.add_team_member(
        team=team_a,
        caller_account_id=acc1.id,
        target_user_id=u3.id,
        role=TeamMemberRole.MEMBER,
        member_status="active",
        session=async_session,
    )

    app = create_app()

    async def override_get_session():
        yield async_session

    app.dependency_overrides[get_session] = override_get_session

    # Case A: Owner of Team A requests Team A projects -> 200 OK with Project Alpha
    app.dependency_overrides[get_current_user] = lambda: u1
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get(f"/api/teams/{team_a.id}/projects")
        assert resp.status_code == 200
        projects_data = resp.json()
        assert len(projects_data) == 1
        assert projects_data[0]["id"] == str(proj_a.id)
        assert projects_data[0]["name"] == "Project Alpha"

    # Case B: Member of Team A (User 3) requests Team A projects -> 200 OK with Project Alpha
    app.dependency_overrides[get_current_user] = lambda: u3
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get(f"/api/teams/{team_a.id}/projects")
        assert resp.status_code == 200
        projects_data = resp.json()
        assert len(projects_data) == 1
        assert projects_data[0]["id"] == str(proj_a.id)

    # Case C: Unauthorized User 2 requests Team A projects -> 404 Not Found (Team not accessible)
    app.dependency_overrides[get_current_user] = lambda: u2
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get(f"/api/teams/{team_a.id}/projects")
        assert resp.status_code == 404

    # Case D: Empty team with no projects -> 200 OK with empty list []
    team_empty = await services.create_team(
        name="Team Empty",
        slug="team-empty",
        account_id=acc1.id,
        session=async_session,
    )
    app.dependency_overrides[get_current_user] = lambda: u1
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get(f"/api/teams/{team_empty.id}/projects")
        assert resp.status_code == 200
        assert resp.json() == []

    # Case E: Non-existent team UUID -> 404 Not Found
    import uuid
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get(f"/api/teams/{uuid.uuid4()}/projects")
        assert resp.status_code == 404

