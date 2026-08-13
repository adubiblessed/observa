from fastapi import APIRouter

from .auth.endpoints import router as auth_router
from .projects.endpoints import router as project_router
from .project_credential.endpoints import router as project_credential_router
from .teams.endpoints import router as teams_router
from .health import router as health_router

router = APIRouter()
router.include_router(health_router)  # /health, /ready
router.include_router(auth_router, prefix="/v1/auth", tags=["auth"])
router.include_router(project_router, prefix="/v1/project", tags=["projects"])
router.include_router(project_credential_router)
router.include_router(teams_router)


