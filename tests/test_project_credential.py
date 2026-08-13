from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from observa.main import create_app
from observa.server.auth.dependencies import get_current_user
from observa.server.db.session import get_session
from observa.server.model.accounts import Account
from observa.server.model.project import ObjectStatus, Project
from observa.server.model.projectingestionkey import ProjectIngestionKey, ProjectKeyStatus
from observa.server.model.user import User
from observa.server.project_credential import services


@pytest.mark.anyio
async def test_credential_service_lifecycle(async_session: AsyncSession) -> None:
    # 1. Setup user, account, project
    user = User(
        email="owner@example.com",
        password_hash="hash",
        is_active=True,
        email_verified=True,
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)

    account = Account(user_id=user.id)
    async_session.add(account)
    await async_session.commit()
    await async_session.refresh(account)

    project = Project(
        name="Test Project A",
        slug="test-project-a",
        account_id=account.id,
        status=ObjectStatus.ACTIVE,
    )
    async_session.add(project)
    await async_session.commit()
    await async_session.refresh(project)

    # 2. Create Credential
    cred = await services.create_credential(
        project_id=project.id,
        account_id=account.id,
        name="Ingestion Key 1",
        use_case="user",
        session=async_session,
    )

    assert cred.id is not None
    assert cred.project_id == project.id
    assert cred.created_by_account_id == account.id
    assert cred.name == "Ingestion Key 1"
    assert len(cred.public_key) == 32
    assert len(cred.secret_key) == 32
    assert cred.status == ProjectKeyStatus.ACTIVE

    # 3. Retrieve Credentials
    creds = await services.get_credentials(
        project_id=project.id,
        session=async_session,
    )
    assert len(creds) == 1
    assert creds[0].id == cred.id

    fetched = await services.get_credential_by_id(
        project_id=project.id,
        credential_id=cred.id,
        session=async_session,
    )
    assert fetched.id == cred.id

    # 4. Verify Credential
    verified = await services.verify_credential(
        public_key=cred.public_key,
        secret_key=cred.secret_key,
        session=async_session,
    )
    assert verified is not None
    assert verified.id == cred.id

    # Wrong secret verification failure
    failed_verify = await services.verify_credential(
        public_key=cred.public_key,
        secret_key="invalid_secret_key_12345678901",
        session=async_session,
    )
    assert failed_verify is None

    # 5. Rotate Credential
    new_cred = await services.rotate_credential(
        project_id=project.id,
        credential_id=cred.id,
        account_id=account.id,
        session=async_session,
    )

    assert new_cred.id != cred.id
    assert new_cred.project_id == project.id
    assert new_cred.status == ProjectKeyStatus.ACTIVE

    # Verify old credential is inactive/revoked
    await async_session.refresh(cred)
    assert cred.status == ProjectKeyStatus.INACTIVE
    assert cred.revoked_at is not None

    # Old credential cannot authenticate
    old_verify = await services.verify_credential(
        public_key=cred.public_key,
        secret_key=cred.secret_key,
        session=async_session,
    )
    assert old_verify is None

    # New credential authenticates cleanly
    new_verify = await services.verify_credential(
        public_key=new_cred.public_key,
        secret_key=new_cred.secret_key,
        session=async_session,
    )
    assert new_verify is not None

    # 6. Revoke Credential
    revoked = await services.revoke_credential(
        project_id=project.id,
        credential_id=new_cred.id,
        session=async_session,
    )
    assert revoked.status == ProjectKeyStatus.INACTIVE
    assert revoked.revoked_at is not None

    # Revoked cannot authenticate
    revoked_verify = await services.verify_credential(
        public_key=new_cred.public_key,
        secret_key=new_cred.secret_key,
        session=async_session,
    )
    assert revoked_verify is None

    # 7. Delete Credential
    await services.delete_credential(
        project_id=project.id,
        credential_id=new_cred.id,
        session=async_session,
    )

    # Deleted credential cannot be retrieved by get_credentials or get_credential_by_id
    remaining = await services.get_credentials(
        project_id=project.id,
        session=async_session,
    )
    # cred was rotated (inactive), new_cred soft-deleted. get_credentials returns non-deleted
    assert len(remaining) == 1  # cred is inactive, not deleted

    with pytest.raises(Exception):
        await services.get_credential_by_id(
            project_id=project.id,
            credential_id=new_cred.id,
            session=async_session,
        )


@pytest.mark.anyio
async def test_project_credential_api_endpoints(async_session: AsyncSession) -> None:
    # Setup User A (Account A) -> Project A
    user_a = User(
        email="usera@example.com",
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

    project_a = Project(
        name="Project Alpha",
        slug="project-alpha",
        account_id=account_a.id,
        status=ObjectStatus.ACTIVE,
    )
    async_session.add(project_a)
    await async_session.commit()
    await async_session.refresh(project_a)

    # Setup User B (Account B) -> Project B
    user_b = User(
        email="userb@example.com",
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

    project_b = Project(
        name="Project Beta",
        slug="project-beta",
        account_id=account_b.id,
        status=ObjectStatus.ACTIVE,
    )
    async_session.add(project_b)
    await async_session.commit()
    await async_session.refresh(project_b)

    # FastAPI App setup with dependency overrides
    app = create_app()

    async def override_get_session():
        yield async_session

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_current_user] = lambda: user_a

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. POST /api/projects/{project_id}/credentials (Create)
        create_resp = await client.post(
            f"/api/projects/{project_a.id}/credentials",
            json={"name": "Primary Key", "use_case": "user"},
        )
        assert create_resp.status_code == 201
        data = create_resp.json()
        assert data["name"] == "Primary Key"
        assert "secret_key" in data
        assert len(data["secret_key"]) == 32
        cred_id = data["id"]

        # 2. GET /api/projects/{project_id}/credentials (List)
        list_resp = await client.get(f"/api/projects/{project_a.id}/credentials")
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        assert len(list_data) == 1
        assert list_data[0]["id"] == cred_id
        assert "secret_key" not in list_data[0]  # Secret NOT exposed in list!

        # 3. GET /api/projects/{project_id}/credentials/{credential_id} (Get metadata)
        get_resp = await client.get(f"/api/projects/{project_a.id}/credentials/{cred_id}")
        assert get_resp.status_code == 200
        get_data = get_resp.json()
        assert get_data["id"] == cred_id
        assert "secret_key" not in get_data  # Secret NOT exposed in detail!

        # 4. Cross-project isolation check: User A trying to access Project B credential
        pb_create_resp = await client.post(
            f"/api/projects/{project_b.id}/credentials",
            json={"name": "Project B Key"},
        )
        # User A has no access to Project B -> 404
        assert pb_create_resp.status_code == 404

        # 5. POST /api/projects/{project_id}/credentials/{credential_id}/rotate
        rotate_resp = await client.post(
            f"/api/projects/{project_a.id}/credentials/{cred_id}/rotate"
        )
        assert rotate_resp.status_code == 200
        rotate_data = rotate_resp.json()
        assert rotate_data["id"] != cred_id
        assert "secret_key" in rotate_data  # New secret returned on rotation
        new_cred_id = rotate_data["id"]

        # 6. POST /api/projects/{project_id}/credentials/{credential_id}/revoke
        revoke_resp = await client.post(
            f"/api/projects/{project_a.id}/credentials/{new_cred_id}/revoke"
        )
        assert revoke_resp.status_code == 200
        revoke_data = revoke_resp.json()
        assert revoke_data["status"] == ProjectKeyStatus.INACTIVE
        assert revoke_data["revoked_at"] is not None

        # 7. DELETE /api/projects/{project_id}/credentials/{credential_id}
        del_resp = await client.delete(
            f"/api/projects/{project_a.id}/credentials/{new_cred_id}"
        )
        assert del_resp.status_code == 204

        # Get deleted credential -> 404
        get_deleted_resp = await client.get(
            f"/api/projects/{project_a.id}/credentials/{new_cred_id}"
        )
        assert get_deleted_resp.status_code == 404


@pytest.mark.anyio
async def test_cross_project_isolation(async_session: AsyncSession) -> None:
    # Account A -> Project A -> Credential A
    user_a = User(email="user_iso_a@example.com", password_hash="hash", is_active=True, email_verified=True)
    async_session.add(user_a)
    await async_session.commit()
    account_a = Account(user_id=user_a.id)
    async_session.add(account_a)
    await async_session.commit()
    user_a.account = account_a

    project_a = Project(name="Iso A", slug="iso-a", account_id=account_a.id, status=ObjectStatus.ACTIVE)
    async_session.add(project_a)
    await async_session.commit()

    cred_a = await services.create_credential(
        project_id=project_a.id,
        account_id=account_a.id,
        name="Key A",
        session=async_session,
    )

    # Account B -> Project B -> Credential B
    user_b = User(email="user_iso_b@example.com", password_hash="hash", is_active=True, email_verified=True)
    async_session.add(user_b)
    await async_session.commit()
    account_b = Account(user_id=user_b.id)
    async_session.add(account_b)
    await async_session.commit()
    user_b.account = account_b

    project_b = Project(name="Iso B", slug="iso-b", account_id=account_b.id, status=ObjectStatus.ACTIVE)
    async_session.add(project_b)
    await async_session.commit()

    cred_b = await services.create_credential(
        project_id=project_b.id,
        account_id=account_b.id,
        name="Key B",
        session=async_session,
    )

    # Verify Project A credential does NOT allow fetching via Project B URL
    with pytest.raises(Exception):
        await services.get_credential_by_id(
            project_id=project_b.id,
            credential_id=cred_a.id,
            session=async_session,
        )

    # Verify credential verification confirms project ownership
    verify_a = await services.verify_credential(
        public_key=cred_a.public_key,
        secret_key=cred_a.secret_key,
        session=async_session,
    )
    assert verify_a is not None
    assert verify_a.project_id == project_a.id
    assert verify_a.project_id != project_b.id
