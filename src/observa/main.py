from fastapi import FastAPI
from .config.settings import settings
from .server.api import router

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        debug=settings.DEBUG,
    )

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    app.include_router(router)

    return app

app = create_app()
