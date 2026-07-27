"""FastAPI app factory.

Order matters: logging → settings → lifespan → middleware → handlers →
routers. `create_app` is the only callable other code should use; the
module-level `app` exists so `uvicorn observa.main:app` keeps working.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from observa.bootstrap.lifespan import lifespan as lifespan_ctx
from observa.config.logging import configure_logging
from observa.config.settings import get_settings
from observa.core.exception_handlers import register_exception_handlers
from observa.core.middleware import SecurityHeadersMiddleware
from observa.server.api import router

__all__ = ["create_app", "app"]


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings)

    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        debug=settings.DEBUG,
        lifespan=lifespan_ctx,
        docs_url="/docs"
        if not settings.is_prod or settings.DEBUG
        else None,
        redoc_url=None,
    )
    app.state.settings = settings

    # --- middleware (reverse order from FastAPI's add; later wraps earlier)
    cors = "*" in settings.CORS_ORIGINS or settings.CORS_ORIGINS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS or ["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
        max_age=600,
    )
    app.add_middleware(GZipMiddleware, minimum_size=settings.GZIP_MIN_SIZE)
    app.add_middleware(SecurityHeadersMiddleware)

    if not settings.is_prod and settings.DEBUG is False:
        # TrustedHostMiddleware only enforced in prod; jump the wildcard in dev.
        pass
    if settings.is_prod and settings.ALLOWED_HOSTS:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)

    register_exception_handlers(app)
    app.include_router(router)
    return app


app = create_app()
