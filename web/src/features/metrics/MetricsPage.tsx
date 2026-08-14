import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatTimeOfDay } from "@/lib/format";
import type { MetricSeries } from "@/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Loader } from "@/components/ui/Loader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TimeSeriesChart } from "@/components/data-display/TimeSeriesChart";

const QUERY_DEFAULT = 'rate(http_requests_total{job="api-server", status=~"5.."}[5m])';

const SERIES_COLORS = ["#adc6ff", "#ffb786", "#c0c1ff"];

interface Row {
  timestamp: string;
  metric: string;
  value: number;
  labels: Array<[string, string]>;
}

const columns: Column<Row>[] = [
  {
    id: "timestamp",
    header: "Timestamp",
    width: "160px",
    render: (r) => <span className="text-on-surface-variant">{formatTimeOfDay(r.timestamp, true)}</span>,
    sortValue: (r) => r.timestamp,
  },
  {
    id: "metric",
    header: "Metric Name",
    width: "220px",
    render: (r) => <span className="text-primary">{r.metric}</span>,
    sortValue: (r) => r.metric,
  },
  {
    id: "value",
    header: "Value",
    align: "right",
    width: "100px",
    render: (r) => <span className="text-on-surface">{r.value.toFixed(2)}</span>,
    sortValue: (r) => r.value,
  },
  {
    id: "labels",
    header: "Labels",
    render: (r) => (
      <div className="flex flex-wrap gap-1">
        {r.labels.map(([k, v]) => (
          <span
            key={k}
            className="rounded border border-outline-variant bg-surface-container-highest px-1.5 py-0.5 text-[11px] text-on-surface-variant"
          >
            {k}="{v}"
          </span>
        ))}
      </div>
    ),
  },
];

export function MetricsPage() {
  const [query, setQuery] = useState(QUERY_DEFAULT);
  const [range, setRange] = useState("1h");
  const [series, setSeries] = useState<MetricSeries[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listMetrics({ expr: query, from: range })
      .then((data) => {
        if (cancelled) return;
        setSeries(data);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, range]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    series.forEach((s) => {
      s.points.slice(-12).forEach((p) => {
        out.push({
          timestamp: p.timestamp,
          metric: s.metric,
          value: p.value,
          labels: Object.entries(s.labels),
        });
      });
    });
    return out.slice(0, 20);
  }, [series]);

  return (
    <div className="mx-auto flex h-full max-w-[1400px] flex-col gap-gutter p-container-padding">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-body-sm text-on-surface-variant">
            <span>Observa</span>
            <Icon name="chevron_right" className="text-[14px]" />
            <span>Metrics</span>
          </div>
          <h2 className="text-headline-lg text-on-surface">Metrics Explorer</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" leadingIcon="compare_arrows">
            Compare
          </Button>
          <div className="flex h-8 items-center overflow-hidden rounded border border-outline-variant">
            {["1h", "6h", "24h"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "h-full border-r border-outline-variant px-3 text-body-sm transition-colors last:border-r-0",
                  range === r
                    ? "bg-surface-container-highest text-on-surface"
                    : "bg-surface text-on-surface-variant hover:bg-surface-container",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Query builder */}
      <div className="flex shrink-0 flex-col overflow-hidden rounded border border-outline-variant bg-surface">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-outline-variant bg-surface-container-lowest p-2">
          <span className="px-2 text-label-caps text-on-surface-variant">A</span>
          <div className="flex items-center gap-1 border-l border-outline-variant pl-2">
            <button type="button" className="flex h-6 items-center gap-1 rounded border border-outline-variant bg-surface px-2 text-body-sm text-on-surface transition-colors hover:bg-surface-container">
              sum
              <Icon name="arrow_drop_down" className="text-[14px]" />
            </button>
            <span className="text-body-sm text-on-surface-variant">by (</span>
            <button type="button" className="flex h-6 items-center rounded border border-outline-variant bg-surface px-2 text-body-sm text-primary transition-colors hover:bg-surface-container">
              service
            </button>
            <span className="text-body-sm text-on-surface-variant">)</span>
          </div>
        </div>
        <div className="relative flex">
          <div className="w-10 select-none border-r border-outline-variant bg-surface-container-lowest py-2 text-center font-code-sm text-on-surface-variant opacity-50">
            <span className="block">1</span>
            <span className="block">2</span>
          </div>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
            className="h-20 w-full resize-none bg-surface p-3 font-code-md text-on-surface focus:outline-none"
          />
          <div className="absolute bottom-2 right-2 flex gap-2">
            <Button variant="outline" size="sm">
              Explain
            </Button>
            <Button variant="primaryContainer" size="sm">
              Run Query
            </Button>
          </div>
        </div>
      </div>

      {/* Visualization */}
      <div className="flex min-h-[320px] flex-1 flex-col overflow-hidden rounded border border-outline-variant bg-surface">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-4 py-3">
          <div className="flex items-center gap-4 font-code-sm text-on-surface-variant">
            {series.map((s, i) => (
              <span key={s.metric + i} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                {s.metric} ({Object.values(s.labels).join(", ")})
              </span>
            ))}
          </div>
          <button type="button" aria-label="Fullscreen" className="text-on-surface-variant transition-colors hover:text-primary">
            <Icon name="fullscreen" className="text-[18px]" />
          </button>
        </div>
        <div className="relative min-h-0 flex-1 p-4">
          {loading ? (
            <Loader />
          ) : (
            <TimeSeriesChart
              className="h-full"
              unit="ops/s"
              series={series.map((s, i) => ({
                name: `${s.metric} (${Object.values(s.labels).join(", ")})`,
                color: SERIES_COLORS[i % SERIES_COLORS.length],
                points: s.points,
                dashed: i === 1,
              }))}
            />
          )}
        </div>
      </div>

      {/* Raw data */}
      <div className="flex shrink-0 flex-col overflow-hidden rounded border border-outline-variant bg-surface">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-4 py-2">
          <h3 className="text-label-caps text-on-surface-variant">Raw Data</h3>
          <button type="button" className="flex items-center gap-1 text-body-sm text-on-surface-variant transition-colors hover:text-primary">
            <Icon name="download" className="text-[16px]" /> CSV
          </button>
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.timestamp + r.metric} zebra />
      </div>
    </div>
  );
}