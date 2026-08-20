"""Lightweight in-process rate limiting for ingestion endpoints.

Scope
-----

This is a per-process, fixed-window limiter keyed by API key id.  It is the
minimum production-safe protection that the current single-process
architecture supports, and it works even when Redis is unavailable.

When the platform is deployed as multiple replicas the counters below are
no longer authoritative.  At that point enforcement should move to a
shared store (Redis, see ``settings.REDIS_URL``) keyed by
``api_key_id``/``project_id``; the public interface
:meth:`RateLimiter.allow` should be preserved so callers are unchanged.
"""

from __future__ import annotations

import time
from collections import defaultdict
from uuid import UUID


class RateLimiter:
    """Fixed-window per-key limiter.  Thread-safe enough for asyncio use."""

    def __init__(self) -> None:
        self._hits: dict[UUID, list[float]] = defaultdict(list)

    def allow(self, key_id: UUID, limit: int, window_seconds: int) -> bool:
        """Return True if ``key_id`` is within ``limit`` requests per window."""
        now = time.monotonic()
        cutoff = now - window_seconds

        timestamps = [t for t in self._hits[key_id] if t > cutoff]
        if len(timestamps) >= limit:
            self._hits[key_id] = timestamps
            return False

        timestamps.append(now)
        self._hits[key_id] = timestamps
        return True


# Shared process-wide limiter instance.
_rate_limiter = RateLimiter()


def check_rate_limit(
    *,
    key_id: UUID,
    limit: int | None,
    window_seconds: int | None,
) -> None:
    """Raise 429 when the key's configured rate limit is exceeded.

    A missing/zero limit means "unlimited" and is a no-op.
    """
    if not limit or not window_seconds or window_seconds <= 0:
        return

    from fastapi import HTTPException, status

    if not _rate_limiter.allow(key_id, limit, window_seconds):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
        )