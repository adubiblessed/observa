"""Project-scoped telemetry writer.

Every write takes the trusted ``project_id`` (from the authenticated
principal) and stamps it on every row.  Records themselves never carry a
project identifier, so a client-supplied id can never influence where a row
is stored.
"""

from __future__ import annotations

import json
import time
from typing import Any
from uuid import UUID

from observa.server.ingestion.schema import (
    InternalLogRecord,
    InternalMetricRecord,
    InternalSpanRecord,
)
from observa.storage.duckdb.connection import DuckDBConnectionManager

_INSERT_LOG = """
    INSERT INTO logs (
        project_id, stream, ts_ns, observed_ts_ns, severity_number,
        severity_text, body, attributes, resource_attributes, scope_name,
        scope_version, trace_id, span_id, flags, dropped_attributes_count,
        ingested_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""

_INSERT_METRIC = """
    INSERT INTO metrics (
        project_id, name, description, unit, metric_type, ts_ns, start_ts_ns,
        value, count, sum, min, max, quantile_values, bucket_counts,
        explicit_bounds, attributes, resource_attributes, scope_name,
        scope_version, ingested_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""

_INSERT_SPAN = """
    INSERT INTO spans (
        project_id, trace_id, span_id, parent_span_id, name, kind, start_ns,
        end_ns, attributes, resource_attributes, scope_name, scope_version,
        status_code, status_message, events, links, flags, ingested_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""


def _body_to_varchar(body: Any) -> str:
    if isinstance(body, str):
        return body
    return json.dumps(body, default=str)


def _json(value: Any) -> str | None:
    if value is None:
        return None
    return json.dumps(value, default=str)


class DuckDBWriter:
    def __init__(self, connection_manager: DuckDBConnectionManager) -> None:
        self._connection_manager = connection_manager

    def write_logs(self, *, project_id: UUID, records: list[InternalLogRecord]) -> int:
        if not records:
            return 0
        pid = str(project_id)
        now = time.time_ns()
        rows = [
            (
                pid,
                record.stream,
                record.timestamp_ns,
                record.observed_timestamp_ns,
                record.severity_number,
                record.severity_text,
                _body_to_varchar(record.body),
                _json(record.attributes),
                _json(record.resource_attributes),
                record.scope_name,
                record.scope_version,
                record.trace_id,
                record.span_id,
                record.flags,
                record.dropped_attributes_count,
                now,
            )
            for record in records
        ]
        self._connection_manager.executemany(_INSERT_LOG, rows)
        return len(rows)

    def write_metrics(self, *, project_id: UUID, records: list[InternalMetricRecord]) -> int:
        if not records:
            return 0
        pid = str(project_id)
        now = time.time_ns()
        rows = [
            (
                pid,
                record.name,
                record.description,
                record.unit,
                record.metric_type,
                record.timestamp_ns,
                record.start_timestamp_ns,
                record.value,
                record.count,
                record.sum,
                record.min,
                record.max,
                _json(record.quantile_values),
                _json(record.bucket_counts),
                _json(record.explicit_bounds),
                _json(record.attributes),
                _json(record.resource_attributes),
                record.scope_name,
                record.scope_version,
                now,
            )
            for record in records
        ]
        self._connection_manager.executemany(_INSERT_METRIC, rows)
        return len(rows)

    def write_spans(self, *, project_id: UUID, records: list[InternalSpanRecord]) -> int:
        if not records:
            return 0
        pid = str(project_id)
        now = time.time_ns()
        rows = [
            (
                pid,
                record.trace_id,
                record.span_id,
                record.parent_span_id,
                record.name,
                record.kind,
                record.start_time_unix_nano,
                record.end_time_unix_nano,
                _json(record.attributes),
                _json(record.resource_attributes),
                record.scope_name,
                record.scope_version,
                record.status_code,
                record.status_message,
                _json(record.events),
                _json(record.links),
                record.flags,
                now,
            )
            for record in records
        ]
        self._connection_manager.executemany(_INSERT_SPAN, rows)
        return len(rows)