# """Project-scoped OTLP ingestion service.

# The service receives the trusted ``project_id`` from the authenticated
# principal (never from the client) and writes records stamped with it.  This
# is the boundary where "who authenticated" becomes "where data is stored".
# """

# from __future__ import annotations

# import asyncio
# import time
# from datetime import UTC, datetime, timedelta
# from uuid import UUID

# import structlog

# from observa.server.ingestion import otlp
# from observa.server.ingestion.schema import (
#     IngestionResult,
#     InternalLogRecord,
#     InternalMetricRecord,
#     InternalSpanRecord,
# )
# from observa.storage.duckdb.storage import DuckDBStorage

# log = structlog.get_logger(__name__)

# # Records older than this are rejected (protects storage from junk/backfill).
# MAX_RECORD_AGE = timedelta(days=30)
# # Records further in the future than this are rejected.
# MAX_FUTURE_SKEW = timedelta(hours=24)
# # Upper bound on records per request.
# MAX_RECORDS_PER_REQUEST = 10_000
# # Per-record body/attribute serialized size cap (bytes).
# MAX_RECORD_BYTES = 1_048_576


# class IngestionError(Exception):
#     """Raised when ingestion cannot proceed for the whole request."""

#     def __init__(self, message: str, *, status_code: int = 400) -> None:
#         super().__init__(message)
#         self.message = message
#         self.status_code = status_code


# def _in_ingest_window(timestamp_ns: int) -> bool:
#     now = time.time_ns()
#     oldest = now - int(MAX_RECORD_AGE.total_seconds() * 1_000_000_000)
#     newest = now + int(MAX_FUTURE_SKEW.total_seconds() * 1_000_000_000)
#     return oldest <= timestamp_ns <= newest


# async def ingest_logs(
#     *,
#     project_id: UUID,
#     payload: bytes,
#     content_type: str | None,
#     storage: DuckDBStorage,
# ) -> IngestionResult:
#     """Decode and store an OTLP logs request for ``project_id``."""

#     def _run() -> IngestionResult:
#         records = otlp.decode_logs_request(payload, content_type)

#         if not records:
#             return IngestionResult(accepted=0, rejected=0)

#         if len(records) > MAX_RECORDS_PER_REQUEST:
#             rejected = len(records) - MAX_RECORDS_PER_REQUEST
#             accepted_records = records[:MAX_RECORDS_PER_REQUEST]
#         else:
#             rejected = 0
#             accepted_records = records

#         accepted: list[InternalLogRecord] = []
#         rejections = rejected
#         for record in accepted_records:
#             if not _in_ingest_window(record.timestamp_ns):
#                 rejections += 1
#                 continue
#             if _record_too_large(record.body, record.attributes, record.resource_attributes):
#                 rejections += 1
#                 continue
#             accepted.append(record)

#         stored = storage.writer.write_logs(project_id=project_id, records=accepted)
#         return IngestionResult(
#             accepted=stored,
#             rejected=rejections + (len(accepted) - stored),
#             error_message=(
#                 f"{rejections + (len(accepted) - stored)} log record(s) rejected"
#                 if rejections or len(accepted) != stored
#                 else None
#             ),
#         )

#     try:
#         return await asyncio.to_thread(_run)
#     except otlp.OtlpDecodeError as exc:
#         log.info("ingest.logs.decode_failed", project_id=str(project_id))
#         raise IngestionError(str(exc), status_code=400) from None
#     except Exception as exc:  # storage failures surface as 503
#         log.error("ingest.logs.failed", project_id=str(project_id), error=str(exc))
#         raise IngestionError("storage ingestion failed", status_code=503) from exc


# async def ingest_metrics(
#     *,
#     project_id: UUID,
#     payload: bytes,
#     content_type: str | None,
#     storage: DuckDBStorage,
# ) -> IngestionResult:
#     """Decode and store an OTLP metrics request for ``project_id``."""

#     def _run() -> IngestionResult:
#         records = otlp.decode_metrics_request(payload, content_type)
#         if not records:
#             return IngestionResult(accepted=0, rejected=0)

#         accepted: list[InternalMetricRecord] = []
#         rejected = 0
#         for record in records:
#             if not record.name:
#                 rejected += 1
#                 continue
#             if not _in_ingest_window(record.timestamp_ns):
#                 rejected += 1
#                 continue
#             accepted.append(record)

#         stored = storage.writer.write_metrics(project_id=project_id, records=accepted)
#         return IngestionResult(
#             accepted=stored,
#             rejected=rejected + (len(accepted) - stored),
#         )

#     try:
#         return await asyncio.to_thread(_run)
#     except otlp.OtlpDecodeError as exc:
#         log.info("ingest.metrics.decode_failed", project_id=str(project_id))
#         raise IngestionError(str(exc), status_code=400) from None
#     except Exception as exc:
#         log.error("ingest.metrics.failed", project_id=str(project_id), error=str(exc))
#         raise IngestionError("storage ingestion failed", status_code=503) from exc


# async def ingest_traces(
#     *,
#     project_id: UUID,
#     payload: bytes,
#     content_type: str | None,
#     storage: DuckDBStorage,
# ) -> IngestionResult:
#     """Decode and store an OTLP traces request for ``project_id``."""

#     def _run() -> IngestionResult:
#         records = otlp.decode_traces_request(payload, content_type)
#         if not records:
#             return IngestionResult(accepted=0, rejected=0)

#         accepted: list[InternalSpanRecord] = []
#         rejected = 0
#         for record in records:
#             if not record.trace_id or not record.span_id:
#                 rejected += 1
#                 continue
#             accepted.append(record)

#         stored = storage.writer.write_spans(project_id=project_id, records=accepted)
#         return IngestionResult(
#             accepted=stored,
#             rejected=rejected + (len(accepted) - stored),
#         )

#     try:
#         return await asyncio.to_thread(_run)
#     except otlp.OtlpDecodeError as exc:
#         log.info("ingest.traces.decode_failed", project_id=str(project_id))
#         raise IngestionError(str(exc), status_code=400) from None
#     except Exception as exc:
#         log.error("ingest.traces.failed", project_id=str(project_id), error=str(exc))
#         raise IngestionError("storage ingestion failed", status_code=503) from exc


# def _record_too_large(*values: object) -> bool:
#     total = 0
#     for value in values:
#         if value is None:
#             continue
#         if isinstance(value, str):
#             total += len(value.encode("utf-8"))
#         else:
#             total += len(str(value).encode("utf-8"))
#         if total > MAX_RECORD_BYTES:
#             return True
#     return total > MAX_RECORD_BYTES


# def _now_ns() -> int:
#     return datetime.now(UTC).timestamp() * 1_000_000_000