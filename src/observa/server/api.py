from fastapi import APIRouter


from .auth.endpoints import router as auth_router

router = APIRouter(prefix="/v1")

# /auth
router.include_router(auth_router)