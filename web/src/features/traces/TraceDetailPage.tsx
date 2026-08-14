import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";
import type { Span, Trace } from "@/types";
import { Icon } from "@/components/ui/Icon";
import { Loader, EmptyState } from "@/components/ui/Loader";
import { KeyValueList } from "@/components/data-display/KeyValueList";

const SERVICE_COLORS: Record<string, string> = {
  "api-gateway": "#adc6ff",
  "auth-service": "#c0c1ff",
  "database-cluster": "#ffb786",
  "payment-gateway": "#6ee7b7",
  "inventory-sync-worker": "#f0abfc",
};

interface RelatedLog {
  time: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
}

const RELATED_LOGS: RelatedLog[] = [
  { time: "10:42:01.124", level: "INFO", message: "Validating order payload for user u_78129" },
  { time: "10:42:01.350", level: "INFO", message: "Order ID o_99812 created successfully in DB" },
  { time: "10:42:01.890", level: "ERROR", message: "Payment gateway timeout attempting to charge card ending in 4242. Retrying..." },
];

const LEVEL_TEXT: Record<RelatedLog["level"], string> = {
  INFO: "text-log-info-text",
  WARN: "text-log-warn-text",
  ERROR: "text-log-error-text",
};

export function TraceDetailPage() {
  const { traceId } = useParams<{ traceId: string }>();
  const [trace, setTrace] = useState<Trace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!traceId) return;
    api
      .getTrace(traceId)
      .then((data) => {
        if (cancelled) return;
        setTrace(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [traceId]);

  if (loading) return <Loader label="Loading trace…" />;
  if (!trace) return <EmptyState icon="error" title="Trace not found" />;

  const errorSpans = trace.spans.filter((s) => s.status === "error").length;

  return (
    <div className="mx-auto max-w-[1200px] p-container-padding">
      <div className="mb-4 flex items-center gap-1 text-body-sm text-on-surface-variant">
        <Link to="/app/traces" className="hover:text-primary">
          Traces
        </Link>
        <Icon name="chevron_right" className="text-[14px]" />
        <span className="truncate font-code-sm text-on-surface">{trace.id.slice(0, 14)}…</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-headline-lg text-on-surface">{trace.rootOperation}</h2>
            <button type="button" aria-label="Copy trace ID" className="text-outline transition-colors hover:text-primary">
              <Icon name="content_copy" className="text-[18px]" />
            </button>
          </div>
          <p className="mt-1 truncate font-code-sm text-on-surface-variant">{trace.id}</p>
        </div>
        <div className="flex shrink-0 items-center gap-4 rounded border border-outline-variant bg-surface px-4 py-2.5">
          <div>
            <p className="text-label-caps text-outline">Total Duration</p>
            <p className="font-code-md text-on-surface">{formatDuration(trace.durationMs)}</p>
          </div>
          <div className="h-8 w-px bg-outline-variant" />
          <div>
            <p className="text-label-caps text-outline">Spans</p>
            <p className="font-code-md text-on-surface">{trace.spanCount}</p>
          </div>
          <div className="h-8 w-px bg-outline-variant" />
          <div>
            <p className="text-label-caps text-outline">Errors</p>
            <p className={cn("font-code-md", errorSpans > 0 ? "text-error" : "text-on-surface")}>
              {errorSpans > 0 ? `error ${errorSpans}` : 0}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        {/* Waterfall */}
        <section className="col-span-12 flex flex-col overflow-hidden rounded border border-outline-variant bg-surface xl:col-span-8">
          <div className="border-b border-outline-variant bg-surface-container-low px-4 py-2">
            <h3 className="text-label-caps text-on-surface-variant">Service &amp; Operation</h3>
          </div>
          <TraceWaterfall trace={trace} />
        </section>

        {/* Right column */}
        <aside className="col-span-12 flex flex-col gap-gutter xl:col-span-4">
          <section className="rounded border border-outline-variant bg-surface p-4">
            <h3 className="mb-3 text-label-caps text-on-surface">Span Attributes</h3>
            <KeyValueList
              layout="grid"
              items={[
                { label: "http.method", value: "POST", mono: true },
                { label: "http.status_code", value: "201", mono: true },
                { label: "net.peer.ip", value: "10.24.1.105", mono: true },
                { label: "db.system", value: "postgresql", mono: true },
              ]}
            />
          </section>

          <section className="rounded border border-outline-variant bg-surface p-4">
            <h3 className="mb-3 text-label-caps text-on-surface">Infrastructure</h3>
            <ul className="space-y-2 font-code-sm text-on-surface-variant">
              <li className="flex items-center gap-2">
                <Icon name="deployed_code" className="text-[18px] text-primary" />
                pod-order-sv-82b4x
              </li>
              <li className="flex items-center gap-2">
                <Icon name="dns" className="text-[18px] text-secondary" />
                node-pool-us-east-1
              </li>
            </ul>
          </section>
        </aside>

        {/* Related logs */}
        <section className="col-span-12 flex flex-col overflow-hidden rounded border border-outline-variant bg-surface">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-4 py-2.5">
            <h3 className="text-label-caps text-on-surface">Related Logs ({RELATED_LOGS.length})</h3>
            <Link to="/app/logs" className="flex items-center gap-1 text-body-sm text-primary hover:underline">
              Explore Logs
              <Icon name="open_in_new" className="text-[16px]" />
            </Link>
          </div>
          <div className="bg-surface-container-lowest p-2">
            <ul className="font-code-sm">
              {RELATED_LOGS.map((log, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-center gap-3 p-2 transition-colors hover:bg-surface-container",
                    i !== RELATED_LOGS.length - 1 && "border-b border-outline-variant",
                  )}
                >
                  <span className="w-24 shrink-0 text-on-surface-variant">{log.time}</span>
                  <span className={cn("w-14 shrink-0 font-bold", LEVEL_TEXT[log.level])}>{log.level}</span>
                  <span className="min-w-0 truncate text-on-surface">{log.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

function TraceWaterfall({ trace }: { trace: Trace }) {
  const baseline = useMemo(() => new Date(trace.startTime).getTime(), [trace.startTime]);
  const scale = trace.durationMs || 1;

  const rows = useMemo(() => {
    const byId = new Map<string, Span>();
    const children = new Map<string, Span[]>();
    const roots: Span[] = [];
    for (const span of trace.spans) {
      byId.set(span.spanId, span);
      if (span.parentSpanId && byId.has(span.parentSpanId)) {
        const list = children.get(span.parentSpanId) ?? [];
        list.push(span);
        children.set(span.parentSpanId, list);
      } else {
        roots.push(span);
      }
    }
    const walk = (span: Span, depth: number): Array<{ span: Span; depth: number }> => {
      const out: Array<{ span: Span; depth: number }> = [{ span, depth }];
      for (const child of children.get(span.spanId) ?? []) out.push(...walk(child, depth + 1));
      return out;
    };
    const list: Array<{ span: Span; depth: number }> = [];
    for (const root of roots) list.push(...walk(root, 0));
    return list;
  }, [trace.spans]);

  return (
    <div className="custom-scrollbar overflow-x-auto">
      <div className="flex h-7 items-center border-b border-outline-variant bg-surface-container-lowest px-2 font-code-sm text-outline">
        <div className="w-[42%] min-w-0 pr-2">Service &amp; Operation</div>
        <div className="relative h-full flex-1">
          <span className="absolute left-0 top-1/2 -translate-y-1/2">0ms</span>
          <span className="absolute left-1/3 top-1/2 -translate-y-1/2">{(scale * 0.25).toFixed(0)}ms</span>
          <span className="absolute left-2/3 top-1/2 -translate-y-1/2">{(scale * 0.5).toFixed(0)}ms</span>
          <span className="absolute left-full top-1/2 -translate-x-full -translate-y-1/2">{(scale * 0.75).toFixed(0)}ms</span>
        </div>
        <div className="w-16 shrink-0" />
      </div>
      {rows.map(({ span, depth }) => {
        const start = (new Date(span.startTime).getTime() - baseline) / scale;
        const width = Math.max(span.durationMs / scale, 0.002);
        const color = SERVICE_COLORS[span.service] ?? "#adc6ff";
        return (
          <div
            key={span.spanId}
            className="flex h-7 items-center border-b border-outline-variant/30 px-2 last:border-b-0 odd:bg-transparent even:bg-surface-container-lowest/40"
          >
            <div className="flex w-[42%] min-w-0 items-center gap-1.5 pr-2" style={{ paddingLeft: depth * 16 + 4 }}>
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: color }} />
              <span className="truncate text-body-sm text-on-surface">
                {span.service} <span className="text-on-surface-variant">{span.operation}</span>
              </span>
            </div>
            <div className="relative h-full flex-1">
              <div
                className="absolute top-1/2 h-[10px] -translate-y-1/2 rounded-sm"
                style={{
                  left: `${(start * 100).toFixed(2)}%`,
                  width: `${(width * 100).toFixed(2)}%`,
                  background: span.status === "error" ? "#93000a" : color,
                  opacity: span.status === "error" ? 1 : 0.75,
                }}
                title={`${span.service} ${span.operation} · ${formatDuration(span.durationMs)}`}
              />
            </div>
            <div className="w-16 shrink-0 pl-2 text-right font-code-sm text-on-surface-variant">
              {formatDuration(span.durationMs)}
            </div>
          </div>
        );
      })}
    </div>
  );
}