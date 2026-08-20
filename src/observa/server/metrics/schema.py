# from __future__ import annotations

# from typing import Any

# from pydantic import BaseModel, Field


# class MetricPoint(BaseModel):
#     timestamp: str
#     value: float


# class MetricSeries(BaseModel):
#     metric: str
#     labels: dict[str, Any] = Field(default_factory=dict)
#     unit: str = ""
#     points: list[MetricPoint] = Field(default_factory=list)