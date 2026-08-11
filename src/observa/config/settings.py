"""Application settings, split by environment.

Set `ENVIRONMENT=dev|prod|test` to pick the class. `BaseSettings` carries
shared fields; each subclass flips only what's different (debug, log level,
extra hosts).
"""

from __future__ import annotations

import os
from enum import StrEnum
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(StrEnum):
    DEV = "dev"
    PROD = "prod"
    TEST = "test"


class DatabaseBackend(StrEnum):
    SQLITE = "sqlite"
    POSTGRES = "postgres"


BASE_DIR = Path(__file__).resolve().parents[2]
DATABASE_DIR = BASE_DIR / "local_storage" / "database"
DATABASE_DIR.mkdir(parents=True, exist_ok=True)


class BaseAppSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # App
    PROJECT_NAME: str = "Observa"
    VERSION: str = "0.1.0"
    API_PREFIX: str = "/v1"
    ENVIRONMENT: Environment = Environment.DEV
    DEBUG: bool = False
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    # HTTP hardening
    CORS_ORIGINS: list[str] = Field(default_factory=list)
    ALLOWED_HOSTS: list[str] = Field(default_factory=list)
    GZIP_MIN_SIZE: int = 1024

    # Postgres
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "observa"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_POOL_SIZE: int = 10
    POSTGRES_MAX_OVERFLOW: int = 20
    POSTGRES_URL: str | None = None

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_URL: str | None = None

    # Storage
    DUCKDB_PATH: str = "local_storage/observa.db"

    # SQLite
    SQLITE_PATH: str = str(DATABASE_DIR / "observa.sqlite3")

    DATABASE_BACKEND: DatabaseBackend = DatabaseBackend.POSTGRES

    @field_validator("CORS_ORIGINS", "ALLOWED_HOSTS", mode="before")
    @classmethod
    def _split_csv(cls, v: object) -> object:
        if isinstance(v, str) and not v.startswith("["):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @property
    def database_url(self) -> str:
        if self.DATABASE_BACKEND == DatabaseBackend.SQLITE:
            return f"sqlite+aiosqlite:///{self.SQLITE_PATH}"

        if self.POSTGRES_URL:
            return self.POSTGRES_URL

        return (
            f"postgresql+asyncpg://"
            f"{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_HOST}:"
            f"{self.POSTGRES_PORT}/"
            f"{self.POSTGRES_DB}"
        )

    @property
    def alembic_database_url(self) -> str:
        if self.DATABASE_BACKEND == DatabaseBackend.SQLITE:
            return f"sqlite:///{self.SQLITE_PATH}"

        return (
            f"postgresql://"
            f"{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_HOST}:"
            f"{self.POSTGRES_PORT}/"
            f"{self.POSTGRES_DB}"
        )

    @property
    def redis_url(self) -> str:
        if self.REDIS_URL:
            return self.REDIS_URL
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    @property
    def is_prod(self) -> bool:
        return self.ENVIRONMENT == Environment.PROD


class DevSettings(BaseAppSettings):
    DATABASE_BACKEND: DatabaseBackend = DatabaseBackend.SQLITE
    DEBUG: bool = True
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "DEBUG"
    CORS_ORIGINS: list[str] = Field(default_factory=lambda: ["*"])
    ALLOWED_HOSTS: list[str] = Field(default_factory=lambda: ["*"])


class ProdSettings(BaseAppSettings):
    DATABASE_BACKEND: DatabaseBackend = DatabaseBackend.POSTGRES
    DEBUG: bool = False
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    CORS_ORIGINS: list[str] = Field(default_factory=list)
    ALLOWED_HOSTS: list[str] = Field(default_factory=list)


class TestSettings(DevSettings):
    ENVIRONMENT: Environment = Environment.TEST
    SQLITE_PATH: str = ":memory:"


@lru_cache(maxsize=1)
def get_settings() -> BaseAppSettings:
    raw = os.getenv("ENVIRONMENT", "dev").lower()

    try:
        env = Environment(raw)
    except ValueError:
        env = Environment.DEV

    cls = {
        Environment.DEV: DevSettings,
        Environment.PROD: ProdSettings,
        Environment.TEST: TestSettings,
    }[env]

    return cls()  # type: ignore[return-value]


# `settings` kept for back-compat with existing imports; lazy so env override wins.
settings = get_settings()