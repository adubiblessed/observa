from __future__ import annotations

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# ---------------------------------------------------------------------------
# Make the project root importable before importing Observa modules.
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[1]

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# ---------------------------------------------------------------------------
# Observa imports
# ---------------------------------------------------------------------------

from observa.common.model.base import BaseModel, UTCDateTime
from observa.config.settings import settings
from observa.server import model  # noqa: F401


# ---------------------------------------------------------------------------
# Alembic configuration
# ---------------------------------------------------------------------------

config = context.config

config.set_main_option(
    "sqlalchemy.url",
    settings.alembic_database_url,
)

# Configure Python logging from alembic.ini.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# ---------------------------------------------------------------------------
# SQLAlchemy metadata
# ---------------------------------------------------------------------------

target_metadata = BaseModel.metadata


# ---------------------------------------------------------------------------
# Alembic custom type rendering
# ---------------------------------------------------------------------------

def render_item(
    type_: str,
    obj: object,
    autogen_context,
) -> str | bool:
    """
    Tell Alembic how to render custom SQLAlchemy types.

    Without this, Alembic may generate migrations containing something like:

        observa.common.model.base.UTCDateTime(timezone=True)

    without importing `observa`, causing:

        NameError: name 'observa' is not defined

    We instead generate:

        from observa.common.model.base import UTCDateTime

        UTCDateTime()
    """

    if type_ == "type" and isinstance(obj, UTCDateTime):
        autogen_context.imports.add(
            "from observa.common.model.base import UTCDateTime"
        )
        return "UTCDateTime()"

    return False


# ---------------------------------------------------------------------------
# Offline migrations
# ---------------------------------------------------------------------------

def run_migrations_offline() -> None:
    """
    Run migrations without creating a database connection.
    """

    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_item=render_item,
    )

    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------------------------
# Online migrations
# ---------------------------------------------------------------------------

def run_migrations_online() -> None:
    """
    Run migrations using an active database connection.
    """

    connectable = engine_from_config(
        config.get_section(
            config.config_ini_section,
            {},
        ),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_item=render_item,
        )

        with context.begin_transaction():
            context.run_migrations()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

