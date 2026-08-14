import { useCallback, useMemo, useState } from "react";
import type { TimeRange } from "@/types";

export const TIME_RANGES: TimeRange[] = [
  { label: "Last 15m", from: "15m", to: "now" },
  { label: "Last 30m", from: "30m", to: "now" },
  { label: "Last 1h", from: "1h", to: "now" },
  { label: "Last 6h", from: "6h", to: "now" },
  { label: "Last 24h", from: "24h", to: "now" },
  { label: "Last 7d", from: "7d", to: "now" },
];

/** Active time-range selection shared by the top bar and data pages. */
export function useTimeRange() {
  const [range, setRange] = useState<TimeRange>(TIME_RANGES[2]);

  const select = useCallback((label: string) => {
    const next = TIME_RANGES.find((r) => r.label === label) ?? TIME_RANGES[2];
    setRange(next);
  }, []);

  return useMemo(() => ({ range, select, options: TIME_RANGES }), [range, select]);
}