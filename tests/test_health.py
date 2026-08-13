from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from observa.main import create_app


@pytest.mark.anyio
async def test_liveness_health_endpoint() -> None:
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ("healthy", "ok")


@pytest.mark.anyio
async def test_api_health_endpoint() -> None:
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "environment" in data
        assert "password" not in data
        assert "secret" not in data


@pytest.mark.anyio
async def test_database_health_endpoint(async_engine) -> None:
    app = create_app()
    app.state.engine = async_engine

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/health/database")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"


@pytest.mark.anyio
async def test_database_health_failure() -> None:
    app = create_app()
    # Engine is None or broken
    app.state.engine = None

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/health/database")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"


@pytest.mark.anyio
async def test_storage_health_endpoint(tmp_path) -> None:
    app = create_app()
    # Point DUCKDB_PATH to temporary directory file
    dummy_db = tmp_path / "observa_test.db"
    app.state.settings.DUCKDB_PATH = str(dummy_db)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/health/storage")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["storage"] == "available"


@pytest.mark.anyio
async def test_storage_health_failure(monkeypatch) -> None:
    app = create_app()

    def mock_check_storage():
        raise RuntimeError("Disk write failure")

    monkeypatch.setattr("duckdb.connect", lambda path: (_ for _ in ()).throw(RuntimeError("Disk failure")))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/health/storage")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["storage"] == "unavailable"
        assert "Disk failure" not in str(data)
