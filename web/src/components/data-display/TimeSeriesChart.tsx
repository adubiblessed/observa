import { useEffect, useRef, useMemo } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { cn } from "@/lib/cn";
import type { MetricPoint } from "@/types";

export interface TimeSeries {
  name: string;
  color: string;
  points: MetricPoint[];
  dashed?: boolean;
}

export interface TimeSeriesChartProps {
  series: TimeSeries[];
  height?: number;
  className?: string;
  /** Human-friendly axis formatting for the value axis (e.g. `ops/s`, `req/s`, `ms`). */
  unit?: string;
  xLabels?: string[];
  yMax?: number;
}

const FONT_FAMILY = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';

/** Parse timestamp to Unix epoch seconds for uPlot */
function toEpochSeconds(ts: string | number | undefined | null): number {
  if (ts == null) return 0;
  if (typeof ts === "number") {
    if (!Number.isFinite(ts)) return 0;
    return ts > 1e11 ? Math.floor(ts / 1000) : Math.floor(ts);
  }
  const parsed = new Date(ts).getTime();
  if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
    return Math.floor(parsed / 1000);
  }
  const num = Number(ts);
  return Number.isNaN(num) || !Number.isFinite(num) ? 0 : Math.floor(num);
}

/** Transform TimeSeries array into uPlot AlignedData */
function buildChartData(series: TimeSeries[]): {
  data: uPlot.AlignedData;
  isEmpty: boolean;
} {
  if (!Array.isArray(series) || series.length === 0) {
    return { data: [[], []], isEmpty: true };
  }

  // Collect all unique timestamps sorted chronologically
  const timestampSet = new Set<number>();
  let totalPoints = 0;

  series.forEach((s) => {
    if (Array.isArray(s?.points)) {
      s.points.forEach((p) => {
        if (p && p.timestamp != null) {
          const sec = toEpochSeconds(p.timestamp);
          if (sec > 0) {
            timestampSet.add(sec);
            totalPoints++;
          }
        }
      });
    }
  });

  if (timestampSet.size === 0 || totalPoints === 0) {
    return { data: [[], []], isEmpty: true };
  }

  const xValues = Array.from(timestampSet).sort((a, b) => a - b);
  if (xValues.length === 0) {
    return { data: [[], []], isEmpty: true };
  }

  // Build aligned columns for each series
  const columns: Array<Array<number | null>> = series.map((s) => {
    const map = new Map<number, number>();
    if (Array.isArray(s?.points)) {
      s.points.forEach((p) => {
        if (p && p.timestamp != null && p.value != null) {
          const num = Number(p.value);
          if (Number.isFinite(num)) {
            map.set(toEpochSeconds(p.timestamp), num);
          }
        }
      });
    }
    return xValues.map((x) => map.get(x) ?? null);
  });

  return {
    data: [xValues, ...columns] as uPlot.AlignedData,
    isEmpty: false,
  };
}

/** Build uPlot Options */
function buildChartOptions({
  series,
  width,
  height,
  unit = "",
  yMax,
}: {
  series: TimeSeries[];
  width: number;
  height: number;
  unit?: string;
  yMax?: number;
}): uPlot.Options {
  const safeWidth = Math.max(width || 300, 100);
  const safeHeight = Math.max(height || 200, 80);

  return {
    width: safeWidth,
    height: safeHeight,
    scales: {
      x: {
        time: true,
      },
      y: {
        auto: true,
        range: (_self, min, max) => {
          const safeMin = Number.isFinite(min) ? (min as number) : 0;
          const safeMax = Number.isFinite(max) ? (max as number) : 10;
          const upper = yMax !== undefined ? Math.max(yMax, safeMax) : safeMax <= 0 ? 10 : safeMax * 1.15;
          const lower = safeMin >= 0 ? 0 : safeMin * 1.15;
          return [lower, upper];
        },
      },
    },
    series: [
      {}, // 0 index is the x-axis
      ...series.map((s) => ({
        label: s.name || "series",
        stroke: s.color || "#adc6ff",
        width: 1.5,
        dash: s.dashed ? [4, 4] : undefined,
        points: { show: false },
        spanGaps: true,
      })),
    ],
    axes: [
      {
        stroke: "#8c909f",
        grid: { show: false },
        ticks: { stroke: "#424754", width: 1, size: 4 },
        font: `10px ${FONT_FAMILY}`,
        gap: 4,
      },
      {
        stroke: "#8c909f",
        grid: { stroke: "rgba(139, 148, 158, 0.12)", width: 1 },
        ticks: { stroke: "#424754", width: 1, size: 4 },
        font: `10px ${FONT_FAMILY}`,
        gap: 6,
        size: 52,
        values: (_self, ticks) =>
          ticks.map((v) => {
            if (v == null || !Number.isFinite(v)) return "";
            const formatted = Number.isInteger(v) ? String(v) : (v as number).toFixed(1);
            return unit ? `${formatted} ${unit}` : formatted;
          }),
      },
    ],
    cursor: {
      drag: { setScale: false, x: false, y: false },
    },
    legend: {
      show: false,
    },
  };
}

/**
 * Fast, lightweight time-series line chart backed by uPlot.
 * Thin 1.5px solid lines, subtle grid, and responsive layout scaling.
 */
export function TimeSeriesChart({
  series,
  height = 200,
  className,
  unit = "",
  yMax,
}: TimeSeriesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);

  const { data, isEmpty } = useMemo(() => buildChartData(series), [series]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || isEmpty) {
      if (chartRef.current) {
        try {
          chartRef.current.destroy();
        } catch {
          // Ignore destruction errors
        }
        chartRef.current = null;
      }
      return;
    }

    const initialWidth = container.clientWidth || 300;
    const initialHeight = height || 200;

    // Build configuration
    const opts = buildChartOptions({
      series,
      width: initialWidth,
      height: initialHeight,
      unit,
      yMax,
    });

    // Clear prior DOM elements inside container before mount
    if (chartRef.current) {
      try {
        chartRef.current.destroy();
      } catch {
        // Ignore destruction errors
      }
      chartRef.current = null;
    }
    container.innerHTML = "";

    // Instantiate uPlot safely
    let uplotInstance: uPlot | null = null;
    try {
      uplotInstance = new uPlot(opts, data, container);
      chartRef.current = uplotInstance;
    } catch (err) {
      console.error("Failed to initialize uPlot instance:", err);
      return;
    }

    let animationFrameId: number | null = null;

    // Observe container resizing
    const resizeObserver = new ResizeObserver((entries) => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        for (const entry of entries) {
          const { width, height: observedHeight } = entry.contentRect;
          if (width > 0 && uplotInstance) {
            try {
              uplotInstance.setSize({
                width: Math.floor(width),
                height: Math.floor(height || observedHeight || 200),
              });
            } catch {
              // Ignore resize errors if chart is unmounting
            }
          }
        }
      });
    });

    resizeObserver.observe(container);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (chartRef.current) {
        try {
          chartRef.current.destroy();
        } catch {
          // Ignore destruction errors
        }
        chartRef.current = null;
      }
    };
  }, [data, series, height, unit, yMax, isEmpty]);

  if (isEmpty) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded border border-dashed border-outline-variant/50 font-code-sm text-body-sm text-on-surface-variant",
          className,
        )}
        style={{ height }}
      >
        No telemetry data points available
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full overflow-hidden select-none", className)}
      style={{ height, minHeight: height }}
    />
  );
}

/** Chart with a top legend row, as used in overview/dashboard panels. */
export function TimeSeriesChartPanel({
  series,
  height = 200,
  className,
  unit,
}: {
  series: TimeSeries[];
  height?: number;
  className?: string;
  unit?: string;
}) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      {series && series.length > 0 ? (
        <div className="mb-2 flex flex-wrap items-center gap-4 font-code-sm text-on-surface-variant">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span className="h-1.5 w-3 rounded-sm" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <TimeSeriesChart series={series} height={height} unit={unit} />
      </div>
    </div>
  );
}