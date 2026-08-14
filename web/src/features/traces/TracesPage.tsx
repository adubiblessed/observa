import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";
import type { Trace } from "@/types";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, Loader } from "@/components/ui/Loader";
import { Drawer } from "@/components/feedback/Drawer";
import { TraceDetailDrawer } from "./TraceDetailDrawer";

const SERVICE_COLORS: Record<string, string> = {
  "api-gateway": "#adc6ff",
  "auth-service": "#c0c1ff",
  "database-cluster": "#ffb786",
  "payment-gateway": "#6ee7b7",
  "inventory-sync-worker": "#f0abfc",
};

export function TracesPage() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Trace | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    api.listTraces().then((result) => {
      if (cancelled) return;
      setTraces(result.items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full flex-col gap-gutter p-container-padding">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-body-sm text-on-surface-variant">
            <span>Observa</span>
            <Icon name="chevron_right" className="text-[14px]" />
            <span>Traces</span>
          </div>
          <h2 className="text-headline-lg text-on-surface">Traces</h2>
        </div>
        <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <Icon name="info" className="text-[16px]" />
          <span>Select a trace to inspect its waterfall</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded border border-outline-variant bg-surface">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex h-[36px] shrink-0 items-center border-b border-outline-variant bg-surface-container-low px-4 text-label-caps text-outline">
            <div className="w-[200px] shrink-0">TRACE ID</div>
            <div className="w-[140px] shrink-0">ROOT SERVICE</div>
            <div className="flex-1">OPERATION</div>
            <div className="w-[70px] shrink-0 text-center">SPANS</div>
            <div className="w-[90px] shrink-0 text-right">DURATION</div>
            <div className="w-[70px] shrink-0 text-right">STATUS</div>
          </div>
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-surface">
            {loading ? (
              <Loader />
            ) : traces.length === 0 ? (
              <EmptyState icon="route" title="No traces" description="Traces will appear here once the service starts emitting." />
            ) : (
              traces.map((t) => {
                const isSelected = selected?.id === t.id;
                return (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelected(isSelected ? null : t);
                      navigate(`/app/traces/${t.id}`);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && navigate(`/app/traces/${t.id}`)}
                    className={cn(
                      "flex h-[36px] cursor-pointer items-center border-b border-outline-variant/30 border-l-2 border-transparent px-4 transition-colors odd:bg-transparent even:bg-surface-container-lowest/40",
                      isSelected && "border-l-2 border-primary bg-surface-container-high",
                    )}
                  >
                    <div className="w-[200px] shrink-0 font-code-sm text-primary">{t.id}</div>
                    <div className="w-[140px] shrink-0 text-body-sm text-on-surface">{t.rootService}</div>
                    <div className="min-w-0 flex-1 truncate text-body-sm text-on-surface">{t.rootOperation}</div>
                    <div className="w-[70px] shrink-0 text-center font-code-sm text-on-surface-variant">{t.spanCount}</div>
                    <div className="w-[90px] shrink-0 text-right font-code-sm text-on-surface">{formatDuration(t.durationMs)}</div>
                    <div className="w-[70px] shrink-0 text-right">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-bold",
                          t.status === "error" ? "bg-log-error-bg text-log-error-text" : "bg-log-info-bg text-log-info-text",
                        )}
                      >
                        {t.status === "error" ? "ERROR" : "OK"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex h-9 shrink-0 items-center justify-between border-t border-outline-variant bg-surface-container-lowest px-4 text-body-sm text-on-surface-variant">
            <span>{traces.length} traces · last 15 minutes</span>
            <span className="font-code-sm">sampling rate 100%</span>
          </div>
        </div>

        <Drawer
          open={selected !== null}
          onClose={() => setSelected(null)}
          variant="inline"
          widthClass="w-[320px] shrink-0 lg:w-[40%] lg:max-w-[560px]"
          title={
            selected ? (
              <span className="truncate font-code-md text-on-surface">{selected.id}</span>
            ) : undefined
          }
          headerActions={
            <button
              type="button"
              aria-label="Copy trace ID"
              className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-surface-container-high"
            >
              <Icon name="content_copy" className="text-[20px]" />
            </button>
          }
        >
          {selected ? <TraceDetailDrawer trace={selected} serviceColors={SERVICE_COLORS} /> : null}
        </Drawer>
      </div>
    </div>
  );
}