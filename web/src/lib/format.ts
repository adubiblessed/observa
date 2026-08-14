/** Formatting helpers for timestamps, durations, numbers, and bytes. */

const TIME_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function timeFormatter(includeMs: boolean): Intl.DateTimeFormat {
  const key = includeMs ? "ms" : "sec";
  let fmt = TIME_FORMATTERS.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: includeMs ? 3 : undefined,
      hour12: false,
    });
    TIME_FORMATTERS.set(key, fmt);
  }
  return fmt;
}

/** Format an ISO timestamp as `MM/DD/YYYY HH:MM:SS.mmm` (24h). */
export function formatTimestamp(iso: string, includeMs = false): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return timeFormatter(includeMs).format(date);
}

/** Format a timestamp as `HH:MM:SS.mmm` for dense log rows. */
export function formatTimeOfDay(iso: string, includeMs = false): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const parts: string[] = [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ];
  if (includeMs) {
    parts.push(String(date.getMilliseconds()).padStart(3, "0"));
  }
  return parts.join(":");
}

/** Render a duration in milliseconds using adaptive units. */
export function formatDuration(ms: number): string {
  if (ms < 1) return `${Math.round(ms * 1000)}µs`;
  if (ms < 1000) return `${ms.toFixed(ms < 10 ? 1 : 0)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

/** Compact human duration such as `2m 14s` or `45s`. */
export function formatHumanDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ${Math.round(seconds % 60)}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/** Relative time like `2 mins ago`. */
export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffSec = Math.max(0, (Date.now() - then) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `${m} min${m === 1 ? "" : "s"} ago`;
  }
  if (diffSec < 86_400) {
    const h = Math.floor(diffSec / 3600);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  const d = Math.floor(diffSec / 86_400);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/** Format a large number compactly (`1.2M`, `4,210`). */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString("en-US");
  }
  return String(Math.round(value));
}

/** Format bytes into a human-readable size. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = "B";
  for (const u of units) {
    if (value < 1024) break;
    value /= 1024;
    unit = u;
  }
  return `${value.toFixed(1)} ${unit}`;
}

/** Format a plain date (created, joined, etc.) as `YYYY-MM-DD`. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().slice(0, 10);
}

/** Truncate a string with an ellipsis if it exceeds `max` characters. */
export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

/** Deterministic pseudo-random generator for stable sample data. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}