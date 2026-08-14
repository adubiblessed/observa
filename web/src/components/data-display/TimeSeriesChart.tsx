import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type ChartData,
} from "chart.js";
import { cn } from "@/lib/cn";
import type { MetricPoint } from "@/types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export interface TimeSeries {
  name: string;
  color: string;
  points: MetricPoint[];
  dashed?: boolean;
}

interface TimeSeriesChartProps {
  series: TimeSeries[];
  height?: number;
  className?: string;
  /** Human-friendly axis formatting for the value axis (e.g. `ops/s`). */
  unit?: string;
  xLabels?: string[];
  yMax?: number;
}

const FONT_FAMILY = '"JetBrains Mono", ui-monospace, monospace';

/**
 * Line chart backed by Chart.js. Thin 1.5px solid lines, subtle grid,
 * no fills and no gradients — readability over decoration.
 */
export function TimeSeriesChart({
  series,
  height = 200,
  className,
  unit = "",
  xLabels,
  yMax,
}: TimeSeriesChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const labels = xLabels ?? series[0]?.points.map((p) => p.timestamp) ?? [];
    const data: ChartData<"line"> = {
      labels,
      datasets: series.map((s) => ({
        label: s.name,
        data: s.points.map((p) => p.value),
        borderColor: s.color,
        pointRadius: 0,
        pointHoverRadius: 3,
        borderWidth: 1.5,
        borderDash: s.dashed ? [4, 4] : undefined,
        fill: false,
        tension: 0.15,
        spanGaps: true,
      })),
    };

    const options: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "nearest", axis: "x", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#171f33",
          borderColor: "#424754",
          borderWidth: 1,
          titleColor: "#c2c6d6",
          bodyColor: "#dae2fd",
          titleFont: { family: FONT_FAMILY, size: 11 },
          bodyFont: { family: FONT_FAMILY, size: 12 },
          padding: 8,
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y ?? 0;
              return `${ctx.dataset.label}: ${Number.isInteger(v) ? v : v.toFixed(1)}${unit ? ` ${unit}` : ""}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#8c909f",
            font: { family: FONT_FAMILY, size: 10 },
            maxTicksLimit: 6,
            maxRotation: 0,
          },
          border: { display: false },
        },
        y: {
          suggestedMax: yMax,
          grid: { color: "rgba(139, 148, 158, 0.12)" },
          ticks: {
            color: "#8c909f",
            font: { family: FONT_FAMILY, size: 10 },
            maxTicksLimit: 5,
            padding: 6,
          },
          border: { display: false },
        },
      },
    };

    chartRef.current = new ChartJS(canvasRef.current, { type: "line", data, options });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [series, unit, xLabels, yMax]);

  return (
    <div className={cn("relative", className)} style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
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
      {series.length > 1 ? (
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