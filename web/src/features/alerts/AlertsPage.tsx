import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";
import type { AlertIncident, AlertRule, AlertState, AlertSeverity } from "@/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Loader } from "@/components/ui/Loader";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, type Column } from "@/components/ui/DataTable";

const SEVERITY_TEXT: Record<AlertSeverity, string> = {
  critical: "Critical",
  error: "Error",
  warning: "Warning",
  info: "Info",
};

const SEVERITY_DOT: Record<AlertSeverity, string> = {
  critical: "bg-error",
  error: "bg-error",
  warning: "bg-warning",
  info: "bg-secondary",
};

const STATE_STYLE: Record<AlertState, string> = {
  firing: "bg-log-error-bg text-log-error-text",
  acknowledged: "bg-log-warn-bg text-log-warn-text",
  resolved: "bg-log-info-bg text-log-info-text",
};

function useIncidentColumns(): Column<AlertIncident>[] {
  return [
    {
      id: "severity",
      header: "Severity",
      width: "100px",
      render: (a) => (
        <span className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", SEVERITY_DOT[a.severity])} />
          <span className="text-body-sm text-on-surface">{SEVERITY_TEXT[a.severity]}</span>
        </span>
      ),
      sortValue: (a) => a.severity,
    },
    {
      id: "name",
      header: "Alert Name",
      render: (a) => <span className="font-code-sm text-on-surface">{a.name}</span>,
      sortValue: (a) => a.name,
    },
    {
      id: "source",
      header: "Source",
      width: "180px",
      render: (a) => <span className="font-code-sm text-on-surface-variant">{a.source}</span>,
      sortValue: (a) => a.source,
    },
    {
      id: "fired",
      header: "Firing Since",
      width: "120px",
      render: (a) => <span className="font-code-sm text-on-surface-variant">{formatRelative(a.firedAt)}</span>,
      sortValue: (a) => a.firedAt,
    },
    {
      id: "state",
      header: "State",
      width: "120px",
      render: (a) => (
        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", STATE_STYLE[a.state])}>
          {a.state}
        </span>
      ),
      sortValue: (a) => a.state,
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      width: "160px",
      render: (a) => <IncidentActions incident={a} />,
    },
  ];
}

const ruleColumns: Column<AlertRule>[] = [
  {
    id: "name",
    header: "Rule Name",
    render: (r) => <span className="text-on-surface">{r.name}</span>,
    sortValue: (r) => r.name,
  },
  {
    id: "condition",
    header: "Condition",
    render: (r) => <span className="font-code-sm text-primary">{r.condition}</span>,
    sortValue: (r) => r.condition,
  },
  {
    id: "frequency",
    header: "Frequency",
    width: "100px",
    render: (r) => <span className="font-code-sm text-on-surface-variant">{r.frequency}</span>,
    sortValue: (r) => r.frequency,
  },
  {
    id: "channels",
    header: "Channels",
    width: "120px",
    render: (r) => (
      <div className="flex flex-wrap gap-1">
        {r.channels.map((c) => (
          <span key={c} className="rounded border border-outline-variant bg-surface-container-low px-1.5 py-0.5 text-[11px] text-on-surface-variant">
            {c}
          </span>
        ))}
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    width: "90px",
    render: (r) => (
      <span
        className={cn(
          "rounded px-1.5 py-0.5 text-[10px] font-bold",
          r.status === "active" ? "bg-log-info-bg text-log-info-text" : "bg-surface-container-highest text-on-surface-variant",
        )}
      >
        {r.status === "active" ? "ACTIVE" : "DISABLED"}
      </span>
    ),
    sortValue: (r) => r.status,
  },
];

export function AlertsPage() {
  const [tab, setTab] = useState("Incidents");
  const [incidents, setIncidents] = useState<AlertIncident[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .listAlerts()
      .then((data) => {
        if (cancelled) return;
        setIncidents(data?.incidents || []);
        setRules(data?.rules || []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIncidents([]);
        setRules([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const firing = incidents.filter((a) => a.state === "firing");
  const incidentColumns = useIncidentColumns();

  return (
    <div className="mx-auto flex h-full max-w-[1400px] flex-col gap-gutter p-container-padding">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-body-sm text-on-surface-variant">
            <span>Observa</span>
            <Icon name="chevron_right" className="text-[14px]" />
            <span>Alerts</span>
          </div>
          <h2 className="text-headline-lg text-on-surface">Alerts Management</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Monitor, acknowledge, and resolve active alerts across the cluster.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" leadingIcon="filter_list">
            Filter
          </Button>
          <Button variant="outline" leadingIcon="download">
            Export
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between">
        <Tabs
          items={[
            {
              id: "Incidents",
              label: "Active Incidents",
              badge:
                firing.length > 0 ? (
                  <span className="flex items-center gap-1 rounded bg-error-container px-1.5 py-0.5 text-[10px] font-bold text-on-error-container">
                    <Icon name="local_fire_department" className="text-[12px]" />
                    {firing.length}
                  </span>
                ) : undefined,
            },
            { id: "Rules", label: "Alert Rules" },
            { id: "History", label: "History" },
          ]}
          active={tab}
          onChange={setTab}
        />
        {tab === "Rules" ? (
          <Button variant="primaryContainer" leadingIcon="add">
            New Rule
          </Button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-outline-variant bg-surface">
        {loading ? (
          <Loader />
        ) : tab === "Incidents" ? (
          <DataTable columns={incidentColumns} rows={incidents} rowKey={(a) => a.id} zebra />
        ) : tab === "Rules" ? (
          <DataTable columns={ruleColumns} rows={rules} rowKey={(r) => r.id} zebra />
        ) : (
          <DataTable columns={incidentColumns} rows={incidents.filter((a) => a.state === "resolved")} rowKey={(a) => a.id} zebra />
        )}
      </div>
    </div>
  );
}

function IncidentActions({ incident }: { incident: AlertIncident }) {
  const [state, setState] = useState<AlertState>(incident.state);
  if (state === "resolved") {
    return <span className="font-code-sm text-on-surface-variant">Resolved</span>;
  }
  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={() => setState("acknowledged")}
        disabled={state === "acknowledged"}
        className="rounded border border-outline-variant px-2 py-1 text-body-sm text-on-surface transition-colors hover:bg-surface-container disabled:opacity-40"
      >
        Ack
      </button>
      <button
        type="button"
        onClick={() => setState("resolved")}
        className="rounded bg-primary-container/15 px-2 py-1 text-body-sm text-primary transition-colors hover:bg-primary-container/30"
      >
        Resolve
      </button>
    </div>
  );
}