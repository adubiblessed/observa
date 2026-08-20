"""secure api key schema

Revision ID: 2b855f273294
Revises: e37dd1cb1fba
Create Date: 2026-08-20 14:08:41.755215

Upgrade summary
---------------

* Replaces the plaintext ``secret_key`` + ``public_key`` columns with a
  secure design: ``key_prefix`` (public) + ``key_hash`` (SHA-256 of the
  full ``obs_live_<prefix>_<secret>`` token).
* Adds a ``scopes`` JSON list (``logs:write`` / ``metrics:write`` /
  ``traces:write``) replacing the opaque ``roles`` bitmask.
* Renames ``expired_at`` to ``expires_at`` for consistency.
* Backfills hashes for any pre-existing rows before the plaintext secret is
  dropped, so no raw secret survives the migration.

Works on both PostgreSQL and SQLite (batch mode).
"""

import hashlib
import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from observa.common.model.base import UTCDateTime
from observa.server.model.projectingestionkey import DEFAULT_INGESTION_SCOPES

# revision identifiers, used by Alembic.
revision: str = "2b855f273294"
down_revision: Union[str, Sequence[str], None] = "e37dd1cb1fba"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _backfill_hashes(bind) -> None:
    """Hash any legacy plaintext secrets before the column is dropped."""
    table = sa.table(
        "project_ingestion_keys",
        sa.column("id", sa.String()),
        sa.column("key_prefix", sa.String()),
        sa.column("secret_key", sa.String()),
    )
    rows = bind.execute(sa.select(table.c.id, table.c.key_prefix, table.c.secret_key)).fetchall()
    for row in rows:
        if not row.secret_key:
            continue
        token = f"obs_live_{row.key_prefix}_{row.secret_key}"
        digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
        bind.execute(
            sa.text(
                "UPDATE project_ingestion_keys SET key_hash = :hash, "
                "scopes = :scopes WHERE id = :id"
            ),
            {
                "hash": digest,
                "scopes": json.dumps(DEFAULT_INGESTION_SCOPES),
                "id": str(row.id),
            },
        )


def upgrade() -> None:
    """Upgrade schema."""
    # Phase 1: add the new columns (nullable), drop the role bitmask.
    with op.batch_alter_table("project_ingestion_keys", schema=None) as batch:
        batch.add_column(sa.Column("key_prefix", sa.String(length=32), nullable=True))
        batch.add_column(sa.Column("key_hash", sa.String(length=64), nullable=True))
        batch.add_column(sa.Column("scopes", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("expires_at", UTCDateTime(), nullable=True))
        batch.drop_column("roles")
        batch.drop_constraint(op.f("uq_project_key_public_key"), type_="unique")
        batch.drop_constraint(op.f("uq_project_key_secret_key"), type_="unique")
        batch.create_unique_constraint("uq_project_key_prefix", ["key_prefix"])

    # Phase 2: migrate existing data.
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE project_ingestion_keys "
            "SET key_prefix = public_key, expires_at = expired_at"
        )
    )
    _backfill_hashes(bind)

    # Phase 3: remove the plaintext columns and tighten constraints.
    with op.batch_alter_table("project_ingestion_keys", schema=None) as batch:
        batch.drop_column("public_key")
        batch.drop_column("secret_key")
        batch.drop_column("expired_at")
        batch.alter_column("key_prefix", existing_type=sa.String(length=32), nullable=False)
        batch.alter_column("key_hash", existing_type=sa.String(length=64), nullable=False)
        batch.alter_column("scopes", existing_type=sa.JSON(), nullable=False)

    op.create_index(
        op.f("ix_project_ingestion_keys_key_prefix"),
        "project_ingestion_keys",
        ["key_prefix"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema (restores the legacy shape; hashes cannot be
    reversed to plaintext secrets, so this is schema-only)."""
    op.drop_index(
        op.f("ix_project_ingestion_keys_key_prefix"),
        table_name="project_ingestion_keys",
    )
    with op.batch_alter_table("project_ingestion_keys", schema=None) as batch:
        batch.drop_constraint("uq_project_key_prefix", type_="unique")
        batch.add_column(sa.Column("public_key", sa.String(length=32), nullable=True))
        batch.add_column(sa.Column("secret_key", sa.String(length=32), nullable=True))
        batch.add_column(sa.Column("roles", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("expired_at", sa.DateTime(timezone=True), nullable=True))
        batch.alter_column("key_prefix", existing_type=sa.String(length=32), nullable=True)
        batch.alter_column("key_hash", existing_type=sa.String(length=64), nullable=True)
        batch.alter_column("scopes", existing_type=sa.JSON(), nullable=True)

    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE project_ingestion_keys "
            "SET public_key = key_prefix, expired_at = expires_at"
        )
    )
    with op.batch_alter_table("project_ingestion_keys", schema=None) as batch:
        batch.drop_column("expires_at")
        batch.drop_column("scopes")
        batch.drop_column("key_hash")
        batch.drop_column("key_prefix")
        batch.alter_column("public_key", existing_type=sa.String(length=32), nullable=False)
        batch.alter_column("secret_key", existing_type=sa.String(length=32), nullable=False)
        batch.alter_column("roles", existing_type=sa.Integer(), nullable=False)
        batch.create_unique_constraint(op.f("uq_project_key_public_key"), ["public_key"])
        batch.create_unique_constraint(op.f("uq_project_key_secret_key"), ["secret_key"])