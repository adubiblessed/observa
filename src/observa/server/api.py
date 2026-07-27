from fastapi import APIRouter

from .auth.endpoints import router as auth_router
from .health import router as health_router

router = APIRouter()
router.include_router(health_router)  # /health, /ready
router.include_router(auth_router, prefix="/v1/auth", tags=["auth"])
