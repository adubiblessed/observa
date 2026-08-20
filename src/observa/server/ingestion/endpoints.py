# from __future__ import annotations

# from uuid import UUID

# from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
# from google.protobuf import json_format
# from opentelemetry.proto.collector.logs.v1.logs_service_pb2 import (
#     ExportLogsPartialSuccess,
#     ExportLogsServiceResponse,
# )
# from opentelemetry.proto.collector.metrics.v1.metrics_service_pb2 import (
#     ExportMetricsPartialSuccess,
#     ExportMetricsServiceResponse,
# )
# from opentelemetry.proto.collector.trace.v1.trace_service_pb2 import (
#     ExportTracePartialSuccess,
#     ExportTraceServiceResponse,
# )

# from observa.server.auth.apikey import (
#     AuthenticatedPrincipal,
#     require_api_key,
#     require_project_access,
#     require_scope,
# )
# from observa.server.auth.rate_limit import check_rate_limit
# from observa.server.dependencies import get_storage
# from observa.server.ingestion import otlp
# from observa.server.ingestion.service import (
#     IngestionError,
#     ingest_logs,
#     ingest_metrics,
#     ingest_traces,
# )
# from observa.server.model.projectingestionkey import (
#     SCOPE_LOGS_WRITE,
#     SCOPE_METRICS_WRITE,
#     SCOPE_TRACES_WRITE,
# )
# from observa.storage.duckdb.storage import DuckDBStorage

# router = APIRouter(prefix="/v1", tags=["ingestion"])

# MAX_INGEST_BODY_BYTES = 4 * 1024 * 1024  # 4 MiB per request


# async def _read_body(request: Request) -> bytes:
#     """Read the raw request body, rejecting anything over the size cap."""
#     content_length = request.headers.get("content-length")
#     if content_length and content_length.isdigit():
#         if int(content_length) > MAX_INGEST_BODY_BYTES:
#             raise HTTPException(
#                 status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
#                 detail="Request body too large",
#             )

#     chunks: list[bytes] = []
#     size = 0
#     async for chunk in request.stream():
#         size += len(chunk)
#         if size > MAX_INGEST_BODY_BYTES:
#             raise HTTPException(
#                 status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
#                 detail="Request body too large",
#             )
#         chunks.append(chunk)
#     return b"".join(chunks)


# def _check_content_type(content_type: str | None) -> None:
#     if not (otlp.is_protobuf(content_type) or otlp.is_json(content_type)):
#         raise HTTPException(
#             status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
#             detail="Unsupported media type; use application/x-protobuf or application/json",
#         )


# def _serve_response(response_message, content_type: str | None) -> Response:
#     if otlp.is_protobuf(content_type):
#         return Response(
#             content=response_message.SerializeToString(),
#             media_type=otlp.CONTENT_TYPE_PROTOBUF,
#         )
#     return Response(
#         content=json_format.MessageToJson(response_message),
#         media_type=otlp.CONTENT_TYPE_JSON,
#     )


# async def _handle_ingest(
#     *,
#     request: Request,
#     principal: AuthenticatedPrincipal,
#     storage: DuckDBStorage,
#     ingest: object,
#     build_response,
# ) -> Response:
#     content_type = request.headers.get("content-type")
#     _check_content_type(content_type)

#     body = await _read_body(request)

#     check_rate_limit(
#         key_id=principal.api_key_id,
#         limit=principal.rate_limit_count,
#         window_seconds=principal.rate_limit_window,
#     )

#     try:
#         result = await ingest(
#             project_id=principal.project_id,
#             payload=body,
#             content_type=content_type,
#             storage=storage,
#         )
#     except IngestionError as exc:
#         raise HTTPException(
#             status_code=exc.status_code,
#             detail=exc.message,
#         ) from None

#     return _serve_response(build_response(result), content_type)


# def _build_logs_response(result) -> ExportLogsServiceResponse:
#     response = ExportLogsServiceResponse()
#     if result.rejected:
#         response.partial_success.CopyFrom(
#             ExportLogsPartialSuccess(
#                 rejected_log_records=result.rejected,
#                 error_message=result.error_message or "some log records were rejected",
#             )
#         )
#     return response


# def _build_metrics_response(result) -> ExportMetricsServiceResponse:
#     response = ExportMetricsServiceResponse()
#     if result.rejected:
#         response.partial_success.CopyFrom(
#             ExportMetricsPartialSuccess(
#                 rejected_data_points=result.rejected,
#                 error_message=result.error_message or "some data points were rejected",
#             )
#         )
#     return response


# def _build_traces_response(result) -> ExportTraceServiceResponse:
#     response = ExportTraceServiceResponse()
#     if result.rejected:
#         response.partial_success.CopyFrom(
#             ExportTracePartialSuccess(
#                 rejected_spans=result.rejected,
#                 error_message=result.error_message or "some spans were rejected",
#             )
#         )
#     return response



# @router.post("/logs", summary="Ingest OTLP logs")
# async def ingest_logs_endpoint(
#     request: Request,
#     principal: AuthenticatedPrincipal = Depends(require_scope(SCOPE_LOGS_WRITE)),
#     storage: DuckDBStorage = Depends(get_storage),
# ) -> Response:
#     return await _handle_ingest(
#         request=request,
#         principal=principal,
#         storage=storage,
#         ingest=ingest_logs,
#         build_response=_build_logs_response,
#     )


# @router.post("/metrics", summary="Ingest OTLP metrics")
# async def ingest_metrics_endpoint(
#     request: Request,
#     principal: AuthenticatedPrincipal = Depends(require_scope(SCOPE_METRICS_WRITE)),
#     storage: DuckDBStorage = Depends(get_storage),
# ) -> Response:
#     return await _handle_ingest(
#         request=request,
#         principal=principal,
#         storage=storage,
#         ingest=ingest_metrics,
#         build_response=_build_metrics_response,
#     )


# @router.post("/traces", summary="Ingest OTLP traces")
# async def ingest_traces_endpoint(
#     request: Request,
#     principal: AuthenticatedPrincipal = Depends(require_scope(SCOPE_TRACES_WRITE)),
#     storage: DuckDBStorage = Depends(get_storage),
# ) -> Response:
#     return await _handle_ingest(
#         request=request,
#         principal=principal,
#         storage=storage,
#         ingest=ingest_traces,
#         build_response=_build_traces_response,
#     )



# @router.post(
#     "/projects/{project_id}/otlp/logs",
#     summary="Ingest OTLP logs into an explicitly named project",
# )
# async def ingest_logs_scoped(
#     project_id: UUID,
#     request: Request,
#     principal: AuthenticatedPrincipal = Depends(require_scope(SCOPE_LOGS_WRITE)),
#     _authorized: AuthenticatedPrincipal = Depends(require_project_access),
#     storage: DuckDBStorage = Depends(get_storage),
# ) -> Response:
#     return await _handle_ingest(
#         request=request,
#         principal=principal,
#         storage=storage,
#         ingest=ingest_logs,
#         build_response=_build_logs_response,
#     )


# @router.post(
#     "/projects/{project_id}/otlp/metrics",
#     summary="Ingest OTLP metrics into an explicitly named project",
# )
# async def ingest_metrics_scoped(
#     project_id: UUID,
#     request: Request,
#     principal: AuthenticatedPrincipal = Depends(require_scope(SCOPE_METRICS_WRITE)),
#     _authorized: AuthenticatedPrincipal = Depends(require_project_access),
#     storage: DuckDBStorage = Depends(get_storage),
# ) -> Response:
#     return await _handle_ingest(
#         request=request,
#         principal=principal,
#         storage=storage,
#         ingest=ingest_metrics,
#         build_response=_build_metrics_response,
#     )


# @router.post(
#     "/projects/{project_id}/otlp/traces",
#     summary="Ingest OTLP traces into an explicitly named project",
# )
# async def ingest_traces_scoped(
#     project_id: UUID,
#     request: Request,
#     principal: AuthenticatedPrincipal = Depends(require_scope(SCOPE_TRACES_WRITE)),
#     _authorized: AuthenticatedPrincipal = Depends(require_project_access),
#     storage: DuckDBStorage = Depends(get_storage),
# ) -> Response:
#     return await _handle_ingest(
#         request=request,
#         principal=principal,
#         storage=storage,
#         ingest=ingest_traces,
#         build_response=_build_traces_response,
#     )