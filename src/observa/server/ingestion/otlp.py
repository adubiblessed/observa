# """OTLP request decoding (protobuf and JSON transports).

# Transport concerns live here and nowhere else.  The decoder produces
# internal records (see ``schema.py``) that carry no client-controlled
# project identity; project binding happens later in the ingestion service.

# Supported transports mirror the OTLP/HTTP specification:

# * ``application/x-protobuf`` (also ``application/protobuf``)
# * ``application/json``  (proto-JSON encoding of the service request)

# A malformed payload raises :class:`OtlpDecodeError`, which the endpoint
# translates into a ``400 Bad Request``.
# """

# from __future__ import annotations

# import time
# from typing import Any

# from google.protobuf import json_format
# from google.protobuf.message import DecodeError, Message
# from opentelemetry.proto.collector.logs.v1.logs_service_pb2 import (
#     ExportLogsServiceRequest,
# )
# from opentelemetry.proto.collector.metrics.v1.metrics_service_pb2 import (
#     ExportMetricsServiceRequest,
# )
# from opentelemetry.proto.collector.trace.v1.trace_service_pb2 import (
#     ExportTraceServiceRequest,
# )

# from observa.server.ingestion.schema import (
#     InternalLogRecord,
#     InternalMetricRecord,
#     InternalSpanRecord,
# )

# CONTENT_TYPE_PROTOBUF = "application/x-protobuf"
# CONTENT_TYPE_PROTOBUF_ALT = "application/protobuf"
# CONTENT_TYPE_JSON = "application/json"

# DEFAULT_STREAM = "default"

# # Which proto-JSON field names map onto which request message.
# _LOGS_REQUEST = ExportLogsServiceRequest
# _METRICS_REQUEST = ExportMetricsServiceRequest
# _TRACES_REQUEST = ExportTraceServiceRequest


# class OtlpDecodeError(ValueError):
#     """Raised when an OTLP payload cannot be decoded."""


# def is_protobuf(content_type: str | None) -> bool:
#     if not content_type:
#         return False
#     ctype = content_type.split(";", 1)[0].strip().lower()
#     return ctype in (CONTENT_TYPE_PROTOBUF, CONTENT_TYPE_PROTOBUF_ALT)


# def is_json(content_type: str | None) -> bool:
#     if not content_type:
#         return False
#     ctype = content_type.split(";", 1)[0].strip().lower()
#     return ctype == CONTENT_TYPE_JSON


# def parse_message(payload: bytes, message_cls: type[Message]) -> Message:
#     """Decode a payload as either protobuf or proto-JSON, auto-detected."""
#     if not payload:
#         raise OtlpDecodeError("empty request body")

#     try:
#         message = message_cls()
#         message.ParseFromString(payload)
#         if message.ByteSize() == 0:
#             raise DecodeError("empty message")
#         return message
#     except DecodeError:
#         # Not valid protobuf; attempt proto-JSON on a fresh message.
#         pass

#     try:
#         message = message_cls()
#         json_format.Parse(payload.decode("utf-8"), message)
#         return message
#     except (ValueError, UnicodeDecodeError, json_format.ParseError) as exc:
#         raise OtlpDecodeError(f"malformed OTLP payload: {exc}") from None


# # ---------------------------------------------------------------------------
# # AnyValue -> python conversion
# # ---------------------------------------------------------------------------


# def any_value_to_python(value: Message) -> Any:
#     """Convert an OTLP ``AnyValue`` into a JSON-serializable python value."""
#     if value is None:
#         return None

#     which = value.WhichOneof("value")
#     if which == "string_value":
#         return value.string_value
#     if which == "bool_value":
#         return value.bool_value
#     if which == "int_value":
#         return value.int_value
#     if which == "double_value":
#         return value.double_value
#     if which == "bytes_value":
#         return value.bytes_value.hex()
#     if which == "array_value":
#         return [any_value_to_python(v) for v in value.array_value.values]
#     if which == "kvlist_value":
#         return {
#             kv.key: any_value_to_python(kv.value) for kv in value.kvlist_value.values
#         }
#     return None


# def key_values_to_dict(key_values) -> dict[str, Any]:
#     return {kv.key: any_value_to_python(kv.value) for kv in key_values}


# def _resource_attributes(resource: Message | None) -> dict[str, Any]:
#     if resource is None:
#         return {}
#     return key_values_to_dict(resource.attributes)


# def _scope_fields(scope: Message | None) -> tuple[str | None, str | None]:
#     if scope is None:
#         return None, None
#     name = scope.name or None
#     version = scope.version or None
#     return name, version


# def _stream_from_resource(resource_attributes: dict[str, Any]) -> str:
#     service = resource_attributes.get("service.name")
#     if isinstance(service, str) and service:
#         return service
#     return DEFAULT_STREAM


# def _trace_id_hex(raw: bytes) -> str | None:
#     return raw.hex() if raw else None


# # ---------------------------------------------------------------------------
# # Logs
# # ---------------------------------------------------------------------------


# def decode_logs_request(payload: bytes, content_type: str | None) -> list[InternalLogRecord]:
#     """Decode an OTLP ``ExportLogsServiceRequest`` into internal records."""
#     request = parse_message(payload, _LOGS_REQUEST)

#     records: list[InternalLogRecord] = []
#     for resource_log in request.resource_logs:
#         resource_attributes = _resource_attributes(resource_log.resource)
#         stream = _stream_from_resource(resource_attributes)
#         dropped_resource = resource_log.resource.dropped_attributes_count if resource_log.resource else 0

#         for scope_log in resource_log.scope_logs:
#             scope_name, scope_version = _scope_fields(scope_log.scope)

#             for log_record in scope_log.log_records:
#                 timestamp_ns = log_record.time_unix_nano or log_record.observed_time_unix_nano
#                 if timestamp_ns == 0:
#                     timestamp_ns = time.time_ns()

#                 records.append(
#                     InternalLogRecord(
#                         stream=stream,
#                         timestamp_ns=timestamp_ns,
#                         observed_timestamp_ns=log_record.observed_time_unix_nano or None,
#                         severity_number=log_record.severity_number,
#                         severity_text=log_record.severity_text or None,
#                         body=any_value_to_python(log_record.body),
#                         attributes=key_values_to_dict(log_record.attributes),
#                         resource_attributes=resource_attributes,
#                         scope_name=scope_name,
#                         scope_version=scope_version,
#                         trace_id=_trace_id_hex(log_record.trace_id),
#                         span_id=_trace_id_hex(log_record.span_id),
#                         flags=log_record.flags,
#                         dropped_attributes_count=log_record.dropped_attributes_count,
#                         dropped_resource_attributes_count=dropped_resource,
#                     )
#                 )

#     return records


# # ---------------------------------------------------------------------------
# # Metrics
# # ---------------------------------------------------------------------------


# def _decode_data_point(metric, data_point) -> InternalMetricRecord:
#     attrs = key_values_to_dict(data_point.attributes)
#     ts = data_point.time_unix_nano
#     if ts == 0:
#         ts = time.time_ns()

#     record = InternalMetricRecord(
#         name=metric.name,
#         metric_type="unknown",
#         timestamp_ns=ts,
#         attributes=attrs,
#         description=metric.description,
#         unit=metric.unit,
#         start_timestamp_ns=data_point.start_time_unix_nano or None,
#     )

#     if metric.HasField("gauge"):
#         record.metric_type = "gauge"
#         record.value = _number_value(data_point)
#     elif metric.HasField("sum"):
#         record.metric_type = "sum"
#         record.value = _number_value(data_point)
#     elif metric.HasField("histogram"):
#         record.metric_type = "histogram"
#         record.count = data_point.count
#         record.sum = data_point.sum
#         record.min = _optional_double(data_point, "min")
#         record.max = _optional_double(data_point, "max")
#         record.bucket_counts = list(data_point.bucket_counts)
#         record.explicit_bounds = list(data_point.explicit_bounds)
#     elif metric.HasField("exponential_histogram"):
#         record.metric_type = "exponential_histogram"
#         record.count = data_point.count
#         record.sum = data_point.sum
#     elif metric.HasField("summary"):
#         record.metric_type = "summary"
#         record.count = data_point.count
#         record.sum = data_point.sum
#         record.quantile_values = {
#             f"{q.quantile}": q.value for q in data_point.quantile_values
#         }
#     return record


# def _number_value(data_point) -> float:
#     if data_point.HasField("as_double"):
#         return data_point.as_double
#     return float(data_point.as_int)


# def _optional_double(data_point, field_name: str) -> float | None:
#     if data_point.HasField(field_name):
#         return getattr(data_point, field_name)
#     return None


# def decode_metrics_request(
#     payload: bytes, content_type: str | None
# ) -> list[InternalMetricRecord]:
#     """Decode an OTLP ``ExportMetricsServiceRequest`` into internal records."""
#     request = parse_message(payload, _METRICS_REQUEST)

#     records: list[InternalMetricRecord] = []
#     for resource_metric in request.resource_metrics:
#         resource_attributes = _resource_attributes(resource_metric.resource)

#         for scope_metric in resource_metric.scope_metrics:
#             scope_name, scope_version = _scope_fields(scope_metric.scope)

#             for metric in scope_metric.metrics:
#                 points: list = []
#                 if metric.HasField("gauge"):
#                     points = list(metric.gauge.data_points)
#                 elif metric.HasField("sum"):
#                     points = list(metric.sum.data_points)
#                 elif metric.HasField("histogram"):
#                     points = list(metric.histogram.data_points)
#                 elif metric.HasField("exponential_histogram"):
#                     points = list(metric.exponential_histogram.data_points)
#                 elif metric.HasField("summary"):
#                     points = list(metric.summary.data_points)
#                 else:
#                     continue

#                 for point in points:
#                     record = _decode_data_point(metric, point)
#                     record.resource_attributes = resource_attributes
#                     record.scope_name = scope_name
#                     record.scope_version = scope_version
#                     records.append(record)

#     return records


# # ---------------------------------------------------------------------------
# # Traces
# # ---------------------------------------------------------------------------


# def decode_traces_request(
#     payload: bytes, content_type: str | None
# ) -> list[InternalSpanRecord]:
#     """Decode an OTLP ``ExportTraceServiceRequest`` into internal records."""
#     request = parse_message(payload, _TRACES_REQUEST)

#     records: list[InternalSpanRecord] = []
#     for resource_span in request.resource_spans:
#         resource_attributes = _resource_attributes(resource_span.resource)

#         for scope_span in resource_span.scope_spans:
#             scope_name, scope_version = _scope_fields(scope_span.scope)

#             for span in scope_span.spans:
#                 events = [
#                     {
#                         "time_unix_nano": ev.time_unix_nano,
#                         "name": ev.name,
#                         "attributes": key_values_to_dict(ev.attributes),
#                     }
#                     for ev in span.events
#                 ]
#                 links = [
#                     {
#                         "trace_id": _trace_id_hex(link.trace_id),
#                         "span_id": _trace_id_hex(link.span_id),
#                         "attributes": key_values_to_dict(link.attributes),
#                     }
#                     for link in span.links
#                 ]

#                 records.append(
#                     InternalSpanRecord(
#                         trace_id=span.trace_id.hex() or "",
#                         span_id=span.span_id.hex() or "",
#                         name=span.name,
#                         kind=str(span.kind),
#                         start_time_unix_nano=span.start_time_unix_nano,
#                         end_time_unix_nano=span.end_time_unix_nano,
#                         attributes=key_values_to_dict(span.attributes),
#                         resource_attributes=resource_attributes,
#                         scope_name=scope_name,
#                         scope_version=scope_version,
#                         parent_span_id=_trace_id_hex(span.parent_span_id),
#                         status_code=span.status.code,
#                         status_message=span.status.message,
#                         events=events,
#                         links=links,
#                         dropped_attributes_count=span.dropped_attributes_count,
#                         dropped_events_count=span.dropped_events_count,
#                         dropped_links_count=span.dropped_links_count,
#                         flags=span.flags,
#                     )
#                 )

#     return records