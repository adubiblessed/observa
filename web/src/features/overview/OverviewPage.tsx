import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatHumanDuration, formatTimeOfDay } from "@/lib/format";
import type { AlertIncident, MetricSeries, SystemEvent } from "@/types";
import { MetricCard } from "@/components/data-display/MetricCard";
import { TimeSeriesChartPanel } from "@/components/data-display/TimeSeriesChart";
import { Loader } from "@/components/ui/Loader";
import { Icon } from "@/components/ui/Icon";

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
  const [alerts, setAlerts] = useState<AlertIncident[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [metrics, setMetrics] = useState<MetricSeries[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [alertData, eventData, metricData] = await Promise.all([
        api.listAlerts(),
        api.listSystemEvents(),
        api.listMetrics({ expr: "http_requests_total" }),
      ]);
      if (cancelled) return;
      setAlerts(alertData.incidents.filter((a) => a.state === "firing").slice(0, 5));
      setEvents(eventData);
      setMetrics(metricData);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Loader label="Loading overview…" />;

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;

  return (
    <div className="mx-auto max-w-[1400px] p-container-padding">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-headline-lg text-on-surface">System Overview</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">High-level telemetry for Production Cluster-01.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        {/* Metrics */}
        <section className="col-span-12 mb-2 grid grid-cols-2 gap-gutter xl:grid-cols-4">
          <MetricCard label="Error Rate" value="0.02%" delta="-0.01%" icon="warning" tone="error" />
          <MetricCard label="P99 Latency" value="142ms" delta="+12ms" icon="timer" tone="warning" />
          <MetricCard label="Throughput" value="1.2k" unit="req/s" icon="swap_vert" tone="primary" />
          <MetricCard label="Ingestion Success" value="98.4%" delta="Stable" icon="cloud_upload" tone="success" />
        </section>

        {/* Active alerts */}
        <section className="col-span-12 flex min-h-[320px] flex-col overflow-hidden rounded border border-outline-variant bg-surface lg:col-span-5">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-4 py-3">
            <h3 className="text-label-caps text-on-surface">Active Alerts</h3>
            <span className="rounded bg-error-container px-2 py-0.5 text-[10px] font-bold text-on-error-container">
              {criticalCount} Critical
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            {alerts.length === 0 ? (
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
                  {alerts.map((a) => (
                    <tr key={a.id} className="h-table-row-height border-b border-outline-variant/40 transition-colors last:border-b-0 hover:bg-surface-container">
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
                        {formatHumanDuration((Date.now() - new Date(a.firedAt).getTime()) / 1000)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Telemetry volume */}
        <section className="col-span-12 flex min-h-[320px] flex-col overflow-hidden rounded border border-outline-variant bg-surface lg:col-span-7">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-4 py-3">
            <h3 className="text-label-caps text-on-surface">Telemetry Volume (Req/s)</h3>
          </div>
          <div className="flex-1 bg-surface-container-lowest p-4">
            {metrics.length > 0 ? (
              <TimeSeriesChartPanel
                unit="req/s"
                series={[
                  { name: "Logs", color: "#adc6ff", points: metrics[0].points },
                  { name: "Traces", color: "#c0c1ff", points: metrics[1]?.points ?? metrics[0].points.map((p) => ({ ...p, value: p.value * 0.5 })) },
                  { name: "Metrics", color: "#ffb786", points: metrics[0].points.map((p) => ({ ...p, value: p.value * 0.25 })) },
                ]}
              />
            ) : null}
          </div>
        </section>

        {/* Recent events */}
        <section className="col-span-12 mt-2 flex flex-col overflow-hidden rounded border border-outline-variant bg-surface">
          <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3">
            <h3 className="text-label-caps text-on-surface">Recent System Events</h3>
          </div>
          <div className="bg-surface-container-lowest p-2">
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
                  <Icon name={EVENT_ICONS[ev.type] ?? "info"} className={cn("shrink-0 text-[14px]", EVENT_TONES[ev.type] ?? "text-primary")} />
                  <span className="min-w-0 truncate text-on-surface">
                    {ev.message} <span className="text-on-surface-variant">{ev.detail}</span>
                  </span>
                  <span className="ml-auto shrink-0 text-[11px] text-outline">{ev.actor}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}