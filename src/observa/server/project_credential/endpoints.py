from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Body, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from observa.server.auth.dependencies import get_current_user
from observa.server.db.session import get_session
from observa.server.model.user import User
from observa.server.project_credential import schema
from observa.server.project_credential.services import (
    create_credential,
    delete_credential,
    get_credential_by_id,
    get_credentials,
    revoke_credential,
    rotate_credential,
)
from observa.server.projects.services import (
    get_accessible_project,
    get_current_account_id,
)

router = APIRouter(
    prefix="/api/projects/{project_id}/credentials",
    tags=["project-credentials"],
)


@router.get(
    "",
    response_model=list[schema.CredentialResponse],
)
async def list_credentials(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[schema.CredentialResponse]:
    """
    List all credentials associated with a project.
    Does not expose secrets.
    """
    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )
    await get_accessible_project(
        project_id=project_id,
        account_id=account_id,
        session=session,
    )

    credentials = await get_credentials(
        project_id=project_id,
        session=session,
    )

    return [
        schema.CredentialResponse.model_validate(cred)
        for cred in credentials
    ]


@router.post(
    "",
    response_model=schema.CredentialCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_credential_endpoint(
    project_id: UUID,
    payload: schema.CredentialCreate = Body(default_factory=schema.CredentialCreate),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> schema.CredentialCreateResponse:
    """
    Create a new credential for a project.
    Returns the generated secret_key in the response.
    """
    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )
    await get_accessible_project(
        project_id=project_id,
        account_id=account_id,
        session=session,
    )

    credential = await create_credential(
        project_id=project_id,
        account_id=account_id,
        name=payload.name,
        use_case=payload.use_case,
        roles=payload.roles,
        rate_limit_count=payload.rate_limit_count,
        rate_limit_window=payload.rate_limit_window,
        session=session,
    )

    return schema.CredentialCreateResponse.model_validate(credential)


@router.get(
    "/{credential_id}",
    response_model=schema.CredentialResponse,
)
async def get_credential(
    project_id: UUID,
    credential_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> schema.CredentialResponse:
    """
    Retrieve credential metadata. Does not expose secrets.
    """
    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )
    await get_accessible_project(
        project_id=project_id,
        account_id=account_id,
        session=session,
    )

    credential = await get_credential_by_id(
        project_id=project_id,
        credential_id=credential_id,
        session=session,
    )

    return schema.CredentialResponse.model_validate(credential)


@router.post(
    "/{credential_id}/rotate",
    response_model=schema.CredentialCreateResponse,
)
async def rotate_credential_endpoint(
    project_id: UUID,
    credential_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> schema.CredentialCreateResponse:
    """
    Rotate a credential. Invalidates the old credential and creates a new active one.
    Returns the new credential including its raw secret_key.
    """
    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )
    await get_accessible_project(
        project_id=project_id,
        account_id=account_id,
        session=session,
    )

    new_credential = await rotate_credential(
        project_id=project_id,
        credential_id=credential_id,
        account_id=account_id,
        session=session,
    )

    return schema.CredentialCreateResponse.model_validate(new_credential)


@router.post(
    "/{credential_id}/revoke",
    response_model=schema.CredentialResponse,
)
async def revoke_credential_endpoint(
    project_id: UUID,
    credential_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> schema.CredentialResponse:
    """
    Revoke a credential so it cannot be used for authentication.
    """
    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )
    await get_accessible_project(
        project_id=project_id,
        account_id=account_id,
        session=session,
    )

    revoked_cred = await revoke_credential(
        project_id=project_id,
        credential_id=credential_id,
        session=session,
    )

    return schema.CredentialResponse.model_validate(revoked_cred)


@router.delete(
    "/{credential_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_credential_endpoint(
    project_id: UUID,
    credential_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    """
    Soft-delete a credential.
    """
    account_id = await get_current_account_id(
        current_user=current_user,
        session=session,
    )
    await get_accessible_project(
        project_id=project_id,
        account_id=account_id,
        session=session,
    )

    await delete_credential(
        project_id=project_id,
        credential_id=credential_id,
        session=session,
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
