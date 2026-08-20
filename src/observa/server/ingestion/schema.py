# """Internal ingestion record models.

# These dataclasses are the boundary between OTLP transport concerns (see
# ``otlp.py``) and project-scoped storage.  A record never carries a
# client-supplied project/tenant identifier: the project is attached later by
# the ingestion service from the authenticated principal.
# """

# from __future__ import annotations

# from dataclasses import dataclass, field
# from typing import Any


# @dataclass(slots=True)
# class InternalLogRecord:
#     stream: str
#     timestamp_ns: int
#     observed_timestamp_ns: int | None
#     severity_number: int
#     severity_text: str | None
#     body: Any
#     attributes: dict[str, Any] = field(default_factory=dict)
#     resource_attributes: dict[str, Any] = field(default_factory=dict)
#     scope_name: str | None = None
#     scope_version: str | None = None
#     trace_id: str | None = None
#     span_id: str | None = None
#     flags: int = 0
#     dropped_attributes_count: int = 0
#     dropped_resource_attributes_count: int = 0


# @dataclass(slots=True)
# class InternalMetricRecord:
#     name: str
#     metric_type: str
#     timestamp_ns: int
#     attributes: dict[str, Any] = field(default_factory=dict)
#     resource_attributes: dict[str, Any] = field(default_factory=dict)
#     scope_name: str | None = None
#     scope_version: str | None = None
#     description: str = ""
#     unit: str = ""
#     start_timestamp_ns: int | None = None
#     value: float | None = None
#     count: int | None = None
#     sum: float | None = None
#     min: float | None = None
#     max: float | None = None
#     quantile_values: dict[str, float] | None = None
#     bucket_counts: list[int] | None = None
#     explicit_bounds: list[float] | None = None
#     exemplars: list[dict[str, Any]] = field(default_factory=list)


# @dataclass(slots=True)
# class InternalSpanRecord:
#     trace_id: str
#     span_id: str
#     name: str
#     kind: str
#     start_time_unix_nano: int
#     end_time_unix_nano: int
#     attributes: dict[str, Any] = field(default_factory=dict)
#     resource_attributes: dict[str, Any] = field(default_factory=dict)
#     scope_name: str | None = None
#     scope_version: str | None = None
#     parent_span_id: str | None = None
#     status_code: int = 0
#     status_message: str = ""
#     events: list[dict[str, Any]] = field(default_factory=list)
#     links: list[dict[str, Any]] = field(default_factory=list)
#     dropped_attributes_count: int = 0
#     dropped_events_count: int = 0
#     dropped_links_count: int = 0
#     flags: int = 0


# @dataclass(slots=True)
# class IngestionResult:
#     accepted: int
#     rejected: int
#     error_message: str | None = None