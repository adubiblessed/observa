import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { formatDuration, formatTimestamp } from "@/lib/format";
import type { Span, Trace } from "@/types";
import { KeyValueList } from "@/components/data-display/KeyValueList";

/**
 * Trace waterfall: spans rendered as a tree with duration bars scaled to the
 * trace's total duration. Solid colors only.
 */
export function TraceDetailDrawer({
  trace,
  serviceColors,
}: {
  trace: Trace;
  serviceColors: Record<string, string>;
}) {
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

  const serviceList = Array.from(new Set(trace.services));

  return (
    <div className="space-y-6 p-4">
      <section>
        <h4 className="mb-2 text-label-caps text-outline">Overview</h4>
        <div className="rounded border border-outline-variant bg-surface p-3">
          <div className="flex items-center justify-between">
            <span className="text-body-md font-semibold text-on-surface">{trace.rootOperation}</span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-bold",
                trace.status === "error" ? "bg-log-error-bg text-log-error-text" : "bg-log-info-bg text-log-info-text",
              )}
            >
              {trace.status === "error" ? "ERROR" : "OK"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {serviceList.map((s) => (
              <span key={s} className="flex items-center gap-1.5 rounded border border-outline-variant bg-surface-container-low px-1.5 py-0.5 text-body-sm text-on-surface-variant">
                <span className="h-2 w-2 rounded-sm" style={{ background: serviceColors[s] ?? "#adc6ff" }} />
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-label-caps text-outline">Attributes</h4>
        <KeyValueList
          items={[
            { label: "Trace ID", value: trace.id, mono: true },
            { label: "Root Service", value: trace.rootService, mono: true },
            { label: "Started", value: formatTimestamp(trace.startTime, true), mono: true },
            { label: "Total Duration", value: formatDuration(trace.durationMs), mono: true },
            { label: "Spans", value: String(trace.spanCount), mono: true },
          ]}
        />
      </section>

      <section>
        <h4 className="mb-2 text-label-caps text-outline">Waterfall</h4>
        <div className="custom-scrollbar overflow-x-auto rounded border border-outline-variant bg-surface">
          {rows.map(({ span, depth }) => {
            const start = (new Date(span.startTime).getTime() - baseline) / scale;
            const width = Math.max(span.durationMs / scale, 0.002);
            const color = serviceColors[span.service] ?? "#adc6ff";
            return (
              <div
                key={span.spanId}
                className="flex h-7 items-center border-b border-outline-variant/30 px-2 last:border-b-0 odd:bg-transparent even:bg-surface-container-lowest/40"
              >
                <div className="flex w-[45%] min-w-0 items-center gap-1.5 pr-2" style={{ paddingLeft: depth * 16 + 4 }}>
                  <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: color }} />
                  <span className="truncate text-body-sm text-on-surface">{span.operation}</span>
                </div>
                <div className="relative h-full flex-1">
                  <div
                    className={cn(
                      "absolute top-1/2 h-[10px] -translate-y-1/2 rounded-sm",
                      span.status === "error" && "bg-log-error-bg",
                    )}
                    style={{
                      left: `${(start * 100).toFixed(2)}%`,
                      width: `${(width * 100).toFixed(2)}%`,
                      background: span.status === "error" ? undefined : color,
                      opacity: span.status === "error" ? 1 : 0.75,
                    }}
                  />
                </div>
                <div className="w-16 shrink-0 pl-2 text-right font-code-sm text-on-surface-variant">
                  {formatDuration(span.durationMs)}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}