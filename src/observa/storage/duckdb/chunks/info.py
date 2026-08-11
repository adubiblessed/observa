from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass(frozen=True)
class ChunkInfo:
    name: str
    start: datetime
    end: datetime


def generate_chunk_info(event_time: datetime) -> ChunkInfo:

    if event_time.tzinfo is None:
        raise ValueError(
            "generate_chunk_info requires a timezone-aware datetime; "
            "got a naive datetime"
        )
    if event_time.utcoffset() != timedelta(0):
        raise ValueError(
            "generate_chunk_info requires event_time normalized to UTC; "
            f"got offset {event_time.utcoffset()}"
        )

    lower_hour = event_time.hour - (event_time.hour % 2)
    chunk_start = event_time.replace(
        hour=lower_hour, minute=0, second=0, microsecond=0
    )
    chunk_end = chunk_start + timedelta(hours=2)

    name = f"{chunk_start:%Y-%m-%d_%H%M}_{chunk_end:%H%M}"

    return ChunkInfo(name=name, start=chunk_start, end=chunk_end)