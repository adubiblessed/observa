import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, formatRelative } from "@/lib/format";
import type { ProjectSummary } from "@/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Loader } from "@/components/ui/Loader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";

type ViewFilter = "All Projects" | "Production Only" | "High Volume";
type StatusFilter = "Any" | "Healthy" | "Warning" | "Error";

const VIEWS: ViewFilter[] = ["All Projects", "Production Only", "High Volume"];
const STATUSES: StatusFilter[] = ["Any", "Healthy", "Warning", "Error"];

const columns: Column<ProjectSummary>[] = [
  {
    id: "name",
    header: "Project Name",
    render: (p) => <span className="font-code-sm text-primary">{p.name}</span>,
    sortValue: (p) => p.name,
  },
  {
    id: "environment",
    header: "Environment",
    width: "130px",
    render: (p) => (
      <Badge tone={p.environment === "Production" ? "primary" : p.environment === "Staging" ? "info" : "neutral"}>
        {p.environment}
      </Badge>
    ),
    sortValue: (p) => p.environment,
  },
  {
    id: "vol",
    header: "Telemetry Vol (GB/d)",
    align: "right",
    width: "150px",
    render: (p) => <span className="font-code-sm text-on-surface">{p.telemetryVolGbPerDay.toFixed(1)}</span>,
    sortValue: (p) => p.telemetryVolGbPerDay,
  },
  {
    id: "rate",
    header: "Ingest Rate",
    align: "right",
    width: "130px",
    render: (p) => <span className="font-code-sm text-on-surface-variant">{p.ingestRate}</span>,
    sortValue: (p) => p.ingestRate,
  },
  {
    id: "status",
    header: "Status",
    width: "110px",
    render: (p) => (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-body-sm",
          p.status === "healthy"
            ? "text-success"
            : p.status === "warning"
              ? "text-warning"
              : "text-error",
        )}
      >
        <Icon
          name={p.status === "healthy" ? "check_circle" : p.status === "warning" ? "warning" : "error"}
          className="text-[16px]"
        />
        {p.status === "healthy" ? "Healthy" : p.status === "warning" ? "Warning" : "Spike"}
      </span>
    ),
    sortValue: (p) => p.status,
  },
  {
    id: "created",
    header: "Created",
    width: "120px",
    render: (p) => <span className="font-code-sm text-on-surface-variant">{formatDate(p.createdAt)}</span>,
    sortValue: (p) => p.createdAt,
  },
  {
    id: "activity",
    header: "Last Activity",
    width: "120px",
    render: (p) => <span className="font-code-sm text-on-surface-variant">{formatRelative(p.lastActivity)}</span>,
    sortValue: (p) => p.lastActivity,
  },
  {
    id: "view",
    header: "",
    align: "right",
    width: "64px",
    render: () => <span className="font-code-sm text-primary">View</span>,
  },
];

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewFilter>("All Projects");
  const [status, setStatus] = useState<StatusFilter>("Any");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    api
      .listProjects()
      .then((result) => {
        if (cancelled) return;
        setProjects(result?.items || []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setProjects([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      projects.filter((p) => {
        if (view === "Production Only" && p.environment !== "Production") return false;
        if (view === "High Volume" && p.telemetryVolGbPerDay < 100) return false;
        if (status === "Healthy" && p.status !== "healthy") return false;
        if (status === "Warning" && p.status !== "warning") return false;
        if (status === "Error" && p.status !== "spike") return false;
        return true;
      }),
    [projects, view, status],
  );

  return (
    <div className="mx-auto flex h-full max-w-[1400px] flex-col gap-gutter p-container-padding">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-body-sm text-on-surface-variant">
            <span>Observa</span>
            <Icon name="chevron_right" className="text-[14px]" />
            <span>Projects</span>
          </div>
          <h2 className="text-headline-lg text-on-surface">Active Projects</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">Manage and monitor all deployed observability projects.</p>
        </div>
        <Button variant="primaryContainer" leadingIcon="add" onClick={() => navigate("/app/projects/new")}>
          Create Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="flex h-8 items-center overflow-hidden rounded border border-outline-variant">
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "h-full border-r border-outline-variant px-3 text-body-sm transition-colors last:border-r-0",
                view === v ? "bg-surface-container-highest text-on-surface" : "bg-surface text-on-surface-variant hover:bg-surface-container",
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex h-8 items-center overflow-hidden rounded border border-outline-variant">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "h-full border-r border-outline-variant px-3 text-body-sm transition-colors last:border-r-0",
                status === s ? "bg-surface-container-highest text-on-surface" : "bg-surface text-on-surface-variant hover:bg-surface-container",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="md" leadingIcon="filter_list">
          Filter
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-outline-variant bg-surface">
        {loading ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <Loader label="Loading projects…" />
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={filtered}
              rowKey={(p) => p.id}
              zebra
              onRowClick={(p) => navigate(`/app/projects/${p.id}`)}
              rowClassName={() => "cursor-pointer"}
            />
            <div className="flex h-9 shrink-0 items-center border-t border-outline-variant bg-surface-container-lowest px-4 text-body-sm text-on-surface-variant">
              Showing {filtered.length} of {projects.length} Projects
            </div>
          </>
        )}
      </div>
    </div>
  );
}