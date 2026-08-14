import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { formatCompact } from "@/lib/format";
import type { ProjectDetail } from "@/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Loader, EmptyState } from "@/components/ui/Loader";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/data-display/MetricCard";
import { TimeSeriesChart } from "@/components/data-display/TimeSeriesChart";
import { DataTable, type Column } from "@/components/ui/DataTable";

interface SpanRow {
  operation: string;
  duration: string;
}

const spanColumns: Column<SpanRow>[] = [
  {
    id: "operation",
    header: "Operation",
    render: (r) => <span className="font-code-sm text-on-surface">{r.operation}</span>,
    sortValue: (r) => r.operation,
  },
  {
    id: "duration",
    header: "Duration",
    align: "right",
    width: "120px",
    render: (r) => <span className="font-code-sm text-on-surface-variant">{r.duration}</span>,
    sortValue: (r) => r.duration,
  },
];

const SLOWEST_SPANS: SpanRow[] = [
  { operation: "POST /v1/checkout/process", duration: "850ms" },
  { operation: "DB UPDATE users", duration: "420ms" },
  { operation: "GET /v1/config", duration: "110ms" },
];

const PROJECT_ALERTS = [
  { name: "High Error Rate (5xx) > 5% in 5m", source: "avg:rate(5xx)", fired: "2m ago" },
  { name: "DB Connection Pool Exhaustion", source: "pool_active > 90%", fired: "15m ago" },
];

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!projectId) return;
    api
      .getProject(projectId)
      .then((data) => {
        if (cancelled) return;
        setProject(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) return <Loader label="Loading project…" />;
  if (!project) return <EmptyState icon="error" title="Project not found" />;

  const p = project.summary;
  const projectIdDisplay = p.id.toUpperCase().replace("_", "-");

  return (
    <div className="mx-auto max-w-[1200px] p-container-padding">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-1 text-body-sm text-on-surface-variant">
        <Link to="/app/projects" className="hover:text-primary">
          Projects
        </Link>
        <Icon name="chevron_right" className="text-[14px]" />
        <span className="text-on-surface">{p.name}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-code-md text-on-surface-variant">{projectIdDisplay}</span>
            <button type="button" aria-label="Copy project ID" className="text-outline transition-colors hover:text-primary">
              <Icon name="content_copy" className="text-[16px]" />
            </button>
            <Badge tone={p.status === "healthy" ? "success" : p.status === "warning" ? "warning" : "error"} dot>
              {p.status === "healthy" ? "Healthy" : p.status === "warning" ? "Warning" : "Spike"}
            </Badge>
          </div>
          <h2 className="mt-1 text-headline-lg text-on-surface">{p.name}</h2>
          <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
            Core service handling transaction processing and external payment provider routing. High throughput expected
            during peak retail hours.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" leadingIcon="edit">
            Edit
          </Button>
          <Button variant="outline" leadingIcon="settings" onClick={() => navigate(`/app/projects/${p.id}/settings`)}>
            Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        {/* Latency */}
        <section className="col-span-12 xl:col-span-4">
          <MetricCard
            label="Latency (p99) · Last 1h"
            value="42.8"
            unit="ms"
            delta="+12%"
            icon="insights"
            tone="warning"
            className="h-full"
          />
        </section>

        {/* Active alerts */}
        <section className="col-span-12 flex flex-col overflow-hidden rounded border border-outline-variant bg-surface xl:col-span-8">
          <div className="flex items-center gap-2 border-b border-outline-variant bg-surface-container-low px-4 py-3">
            <Icon name="notifications_active" className="text-[18px] text-error" />
            <h3 className="text-label-caps text-on-surface">Active Alerts</h3>
            <span className="rounded bg-error-container px-1.5 py-0.5 text-[10px] font-bold text-on-error-container">2</span>
          </div>
          <ul className="divide-y divide-outline-variant/40 bg-surface-container-lowest p-1">
            {PROJECT_ALERTS.map((a) => (
              <li key={a.name} className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-surface-container">
                <span className="h-2 w-2 shrink-0 rounded-full bg-error" />
                <div className="min-w-0">
                  <p className="truncate text-body-sm text-on-surface">{a.name}</p>
                  <p className="truncate font-code-sm text-on-surface-variant">{a.source}</p>
                </div>
                <span className="ml-auto shrink-0 font-code-sm text-on-surface-variant">{a.fired}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Log volume */}
        <section className="col-span-12 flex items-center justify-between gap-4 rounded border border-outline-variant bg-surface p-4 lg:col-span-6">
          <div className="flex items-center gap-4">
            <Icon name="segment" className="text-[28px] text-primary" />
            <div>
              <p className="text-label-caps text-outline">Total Lines (1h)</p>
              <p className="font-code-md text-[22px] font-semibold text-on-surface">1.2M</p>
            </div>
            <div className="ml-4 border-l border-outline-variant pl-4">
              <p className="text-label-caps text-outline">Errors</p>
              <p className="font-code-md text-[22px] font-semibold text-error">4,892</p>
            </div>
          </div>
          <Link
            to="/app/logs"
            className="flex items-center gap-1.5 rounded border border-outline-variant px-3 py-1.5 text-body-sm text-on-surface transition-colors hover:bg-surface-container"
          >
            View Logs
            <Icon name="arrow_forward" className="text-[16px]" />
          </Link>
        </section>

        {/* Throughput chart */}
        <section className="col-span-12 flex min-h-[220px] flex-col overflow-hidden rounded border border-outline-variant bg-surface lg:col-span-6">
          <div className="border-b border-outline-variant bg-surface-container-low px-4 py-2">
            <h4 className="text-label-caps text-on-surface-variant">Requests per second · last 1h</h4>
          </div>
          <div className="flex-1 bg-surface-container-lowest p-4">
            <ThroughputChart />
          </div>
        </section>

        {/* Slowest spans */}
        <section className="col-span-12 flex flex-col overflow-hidden rounded border border-outline-variant bg-surface">
          <div className="flex items-center gap-2 border-b border-outline-variant bg-surface-container-low px-4 py-3">
            <Icon name="timeline" className="text-[18px] text-primary" />
            <h3 className="text-label-caps text-on-surface">Slowest Spans</h3>
          </div>
          <DataTable columns={spanColumns} rows={SLOWEST_SPANS} rowKey={(r) => r.operation} zebra />
        </section>
      </div>
    </div>
  );
}

function ThroughputChart() {
  const [series, setSeries] = useState<Array<{ name: string; color: string; points: Array<{ timestamp: string; value: number }> }>>([]);

  useEffect(() => {
    api.listMetrics({ expr: "http_requests_total" }).then((data) => {
      if (data[0]) {
        setSeries([{ name: "throughput", color: "#adc6ff", points: data[0].points }]);
      }
    });
  }, []);

  if (series.length === 0) return <Loader />;
  return (
    <div className="flex h-full flex-col">
      <div className="mb-1 flex items-baseline gap-3 font-code-sm text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-3 rounded-sm bg-primary" />
          {formatCompact(1_140)} req/s avg
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <TimeSeriesChart series={series} unit="req/s" />
      </div>
    </div>
  );
}