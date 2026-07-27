from fastapi import APIRouter 

router = APIRouter(tags=["auth"])


@router.get(
    "/status",
    responses={
        401: {
            "description": "No active authentication session",
        }
    },
)
async def status():
    return {
        "status": "ok",
        "message": "Authentication service is running."
    }