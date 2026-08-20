from fastapi import APIRouter

from .auth.endpoints import router as auth_router
from .projects.endpoints import router as project_router
from .project_credential.endpoints import router as project_credential_router
from .teams.endpoints import router as teams_router
from .health import router as health_router
from .logs.endpoints import router as logs_router
from .metrics.endpoints import router as metrics_router
from .traces.endpoints import router as traces_router
from .ingestion.endpoints import router as ingestion_router

router = APIRouter()
router.include_router(health_router)  # /health, /ready, /api/health...
router.include_router(auth_router, prefix="/v1/auth", tags=["auth"])
router.include_router(project_router, prefix="/v1/project", tags=["projects"])
router.include_router(project_credential_router)
router.include_router(teams_router)
router.include_router(logs_router)      # GET /v1/logs, /v1/projects/{id}/logs
router.include_router(metrics_router)   # GET /v1/metrics/query
router.include_router(traces_router)    # GET /v1/traces, /v1/traces/{trace_id}
router.include_router(ingestion_router) # POST /v1/logs|metrics|traces + scoped OTLP