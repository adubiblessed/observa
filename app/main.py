from fastapi import FastAPI
from app.config.settings import settings

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        debug=settings.DEBUG,
    )

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app

app = create_app()
