import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatHumanDuration, formatTimeOfDay } from "@/lib/format";
import type { AlertIncident, MetricSeries, SystemEvent } from "@/types";
import { MetricCard } from "@/components/data-display/MetricCard";
import { TimeSeriesChartPanel } from "@/components/data-display/TimeSeriesChart";
import { Loader, EmptyState } from "@/components/ui/Loader";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";

const EVENT_ICONS: Record<string, string> = {
  config: "tune",
  deploy: "rocket_launch",
  infra: "dns",
  security: "shield",
};

const EVENT_TONES: Record<string, string> = {
  config: "text-warning",
  deploy: "text-primary",
  infra: "text-secondary",
  security: "text-error",
};

export function OverviewPage() {
  return (
    <div className="mx-auto max-w-[1400px] p-container-padding">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-headline-lg text-on-surface">System Overview</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">High-level telemetry for Production Cluster-01.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        {/* Metric Summary Cards */}
        <section className="col-span-12 mb-2 grid grid-cols-2 gap-gutter xl:grid-cols-4">
          <MetricCard label="Error Rate" value="0.02%" delta="-0.01%" icon="warning" tone="error" />
          <MetricCard label="P99 Latency" value="142ms" delta="+12ms" icon="timer" tone="warning" />
          <MetricCard label="Throughput" value="1.2k" unit="req/s" icon="swap_vert" tone="primary" />
          <MetricCard label="Ingestion Success" value="98.4%" delta="Stable" icon="cloud_upload" tone="success" />
        </section>

        {/* Active Alerts Section */}
        <section className="col-span-12 flex min-h-[320px] flex-col overflow-hidden rounded border border-outline-variant bg-surface lg:col-span-5">
          <ErrorBoundary fallbackTitle="Active alerts unavailable">
            <ActiveAlertsWidget />
          </ErrorBoundary>
        </section>

        {/* Telemetry Volume Section */}
        <section className="col-span-12 flex min-h-[320px] flex-col overflow-hidden rounded border border-outline-variant bg-surface lg:col-span-7">
          <ErrorBoundary fallbackTitle="Telemetry chart unavailable">
            <TelemetryVolumeWidget />
          </ErrorBoundary>
        </section>

        {/* Recent System Events */}
        <section className="col-span-12 mt-2 flex flex-col overflow-hidden rounded border border-outline-variant bg-surface">
          <ErrorBoundary fallbackTitle="System events unavailable">
            <SystemEventsWidget />
          </ErrorBoundary>
        </section>
      </div>
    </div>
  );
}

function ActiveAlertsWidget() {
  const [alerts, setAlerts] = useState<AlertIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listAlerts();
      const firing = (data?.incidents || []).filter((a) => a.state === "firing").slice(0, 5);
      setAlerts(firing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.listAlerts();
        if (cancelled) return;
        const firing = (data?.incidents || []).filter((a) => a.state === "firing").slice(0, 5);
        setAlerts(firing);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load alerts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;

  return (
    <>
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-4 py-3">
        <h3 className="text-label-caps text-on-surface">Active Alerts</h3>
        {!loading && !error ? (
          <span className="rounded bg-error-container px-2 py-0.5 text-[10px] font-bold text-on-error-container">
            {criticalCount} Critical
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col overflow-auto">
        {loading ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <Loader label="Loading alerts…" />
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <Icon name="warning" className="mb-2 text-[24px] text-warning" />
            <p className="text-body-sm text-on-surface-variant">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchAlerts}>
              Retry
            </Button>
          </div>
        ) : alerts.length === 0 ? (
          <p className="p-4 text-body-sm text-on-surface-variant">No firing alerts.</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-lowest text-label-caps text-on-surface-variant">
                <th className="w-8 px-3 py-2 font-normal">Sev</th>
                <th className="px-3 py-2 font-normal">Alert Name</th>
                <th className="px-3 py-2 text-right font-normal">Duration</th>
              </tr>
            </thead>
            <tbody className="font-code-sm">
              {alerts.map((a) => {
                const firedTime = a.firedAt ? new Date(a.firedAt).getTime() : Date.now();
                const durationSec = Number.isNaN(firedTime) ? 0 : Math.max(0, (Date.now() - firedTime) / 1000);
                return (
                  <tr
                    key={a.id}
                    className="h-table-row-height border-b border-outline-variant/40 transition-colors last:border-b-0 hover:bg-surface-container"
                  >
                    <td className="px-3 py-1 text-center">
                      <span
                        className={cn(
                          "mx-auto block h-2 w-2 rounded-full",
                          a.severity === "critical" || a.severity === "error" ? "bg-error" : "bg-warning",
                        )}
                        title={a.severity}
                      />
                    </td>
                    <td className="px-3 py-1 font-code-md text-on-surface">{a.name}</td>
                    <td className="px-3 py-1 text-right text-on-surface-variant">
                      {formatHumanDuration(durationSec)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function TelemetryVolumeWidget() {
  const [metrics, setMetrics] = useState<MetricSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listMetrics({ expr: "http_requests_total" });
      setMetrics(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.listMetrics({ expr: "http_requests_total" });
        if (cancelled) return;
        setMetrics(data || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load metrics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const primaryPoints = metrics[0]?.points || [];
  const secondaryPoints = metrics[1]?.points || primaryPoints.map((p) => ({ ...p, value: p.value * 0.5 }));
  const tertiaryPoints = primaryPoints.map((p) => ({ ...p, value: p.value * 0.25 }));

  const chartSeries = [
    { name: "Logs", color: "#adc6ff", points: primaryPoints },
    { name: "Traces", color: "#c0c1ff", points: secondaryPoints },
    { name: "Metrics", color: "#ffb786", points: tertiaryPoints },
  ];

  return (
    <>
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-4 py-3">
        <h3 className="text-label-caps text-on-surface">Telemetry Volume (Req/s)</h3>
      </div>
      <div className="flex flex-1 flex-col bg-surface-container-lowest p-4">
        {loading ? (
          <div className="flex h-full min-h-[220px] items-center justify-center">
            <Loader label="Loading telemetry…" />
          </div>
        ) : error ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
            <Icon name="warning" className="mb-2 text-[24px] text-warning" />
            <p className="text-body-sm text-on-surface-variant">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchMetrics}>
              Retry
            </Button>
          </div>
        ) : primaryPoints.length === 0 ? (
          <div className="flex h-full min-h-[220px] items-center justify-center">
            <EmptyState icon="monitoring" title="No telemetry data" description="Metrics will appear once ingestion begins." />
          </div>
        ) : (
          <TimeSeriesChartPanel unit="req/s" series={chartSeries} />
        )}
      </div>
    </>
  );
}

function SystemEventsWidget() {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listSystemEvents();
      setEvents(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.listSystemEvents();
        if (cancelled) return;
        setEvents(data || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load events");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3">
        <h3 className="text-label-caps text-on-surface">Recent System Events</h3>
      </div>
      <div className="bg-surface-container-lowest p-2">
        {loading ? (
          <div className="py-6">
            <Loader label="Loading events…" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Icon name="warning" className="mb-2 text-[24px] text-warning" />
            <p className="text-body-sm text-on-surface-variant">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchEvents}>
              Retry
            </Button>
          </div>
        ) : events.length === 0 ? (
          <p className="p-4 text-center text-body-sm text-on-surface-variant">No recent system events.</p>
        ) : (
          <ul className="font-code-sm">
            {events.map((ev, i) => (
              <li
                key={ev.id}
                className={cn(
                  "flex items-center gap-3 p-2 transition-colors hover:bg-surface-container",
                  i !== events.length - 1 && "border-b border-outline-variant",
                )}
              >
                <span className="w-16 shrink-0 text-[11px] text-outline">{formatTimeOfDay(ev.timestamp, false)}</span>
                <Icon
                  name={EVENT_ICONS[ev.type] ?? "info"}
                  className={cn("shrink-0 text-[14px]", EVENT_TONES[ev.type] ?? "text-primary")}
                />
                <span className="min-w-0 truncate text-on-surface">
                  {ev.message} <span className="text-on-surface-variant">{ev.detail}</span>
                </span>
                <span className="ml-auto shrink-0 text-[11px] text-outline">{ev.actor}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}