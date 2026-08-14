import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatTimeOfDay } from "@/lib/format";
import type { LogEntry, LogLevel } from "@/types";
import { SeverityBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { FilterChip } from "@/components/ui/FilterChip";
import { EmptyState, Loader } from "@/components/ui/Loader";
import { Drawer } from "@/components/feedback/Drawer";
import { LogDetailDrawer } from "./LogDetailDrawer";

const LEVEL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "debug", label: "DEBUG" },
  { value: "info", label: "INFO" },
  { value: "warn", label: "WARN" },
  { value: "error", label: "ERROR" },
];

const SERVICE_OPTIONS = [
  "auth-service",
  "api-gateway",
  "database-cluster",
  "payment-gateway",
  "cache-node-02",
  "inventory-sync-worker",
].map((s) => ({ value: s, label: s }));

const ENV_OPTIONS = ["production", "staging", "development"].map((v) => ({ value: v, label: v }));
const HOST_OPTIONS = [
  "db-node-primary-us-east-1a",
  "web-node-worker-us-east-1b",
  "cache-node-us-west-1a",
  "api-node-prod-us-east-1a",
].map((h) => ({ value: h, label: h }));

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
].map((s) => ({ value: s.value, label: s.label }));

export function LogsPage() {
  const [queryText, setQueryText] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [levels, setLevels] = useState("ERROR,WARN");
  const [service, setService] = useState("");
  const [env, setEnv] = useState("production");
  const [host, setHost] = useState("");
  const [sort, setSort] = useState("newest");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LogEntry | null>(null);

  const runQuery = (text: string, reset: boolean) => {
    if (reset) setQueryText(text);
    setActiveQuery(text);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listLogs({
        query: activeQuery,
        levels: levels.split(",").filter(Boolean) as LogLevel[],
        services: service ? [service] : undefined,
        host: host || undefined,
      })
      .then((result) => {
        if (cancelled) return;
        const items = [...result.items];
        if (sort === "oldest") items.reverse();
        setLogs(items);
        setTotal(result.total);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load logs");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeQuery, levels, service, host, sort]);

  const services = useMemo(
    () => Array.from(new Set([...SERVICE_OPTIONS.map((s) => s.value), ...logs.map((l) => l.service)])).map((s) => ({ value: s, label: s })),
    [logs],
  );

  return (
    <div className="flex h-full flex-col gap-4 p-container-padding">
      {/* Query bar */}
      <div className="flex shrink-0 flex-col overflow-hidden rounded border border-outline-variant bg-surface">
        <div className="flex items-center border-b border-outline-variant bg-surface-container-low px-4 py-2">
          <Icon name="terminal" className="mr-3 shrink-0 text-[18px] text-primary" />
          <input
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runQuery(queryText, false);
            }}
            placeholder='{service="auth-service"} |= "error" | json | line_format "{{.message}}"'
            className="h-7 min-w-0 flex-1 bg-transparent p-0 font-code-sm text-on-surface placeholder:text-outline focus:outline-none"
          />
          <button
            type="button"
            onClick={() => runQuery(queryText, false)}
            className="ml-4 shrink-0 rounded border border-outline-variant bg-surface-container-high px-3 py-1 font-code-sm text-on-surface transition-colors hover:bg-surface-bright"
          >
            Run Query
          </button>
        </div>
        <div className="custom-scrollbar flex items-center gap-3 overflow-x-auto bg-surface px-4 py-2">
          <FilterChip label="SEVERITY" value={levels} options={LEVEL_OPTIONS} onSelect={setLevels} />
          <FilterChip label="SERVICE" value={service} options={services} onSelect={setService} />
          <FilterChip label="ENV" value={env} options={ENV_OPTIONS} onSelect={setEnv} clearable={false} />
          <FilterChip label="HOST" value={host} options={HOST_OPTIONS} onSelect={setHost} />
          <div className="flex-1" />
          <FilterChip label="SORT" value={sort} options={SORT_OPTIONS} onSelect={setSort} clearable={false} />
        </div>
      </div>

      {/* Log table + drawer */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded border border-outline-variant bg-surface">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex h-[36px] shrink-0 items-center border-b border-outline-variant bg-surface-container-low px-4 text-label-caps text-outline">
            <div className="w-[180px] shrink-0">TIMESTAMP</div>
            <div className="w-[80px] shrink-0">LEVEL</div>
            <div className="w-[140px] shrink-0">SERVICE</div>
            <div className="flex-1">MESSAGE</div>
          </div>
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-surface">
            {loading ? (
              <Loader />
            ) : error ? (
              <EmptyState icon="error" title="Failed to load logs" description={error} />
            ) : logs.length === 0 ? (
              <EmptyState
                icon="manage_search"
                title="No matching log entries"
                description="Adjust the query or filters to widen the result set."
              />
            ) : (
              logs.map((log) => {
                const isSelected = selected?.id === log.id;
                return (
                  <LogRow
                    key={log.id}
                    log={log}
                    selected={isSelected}
                    onClick={() => setSelected(isSelected ? null : log)}
                  />
                );
              })
            )}
          </div>
          <div className="flex h-9 shrink-0 items-center justify-between border-t border-outline-variant bg-surface-container-lowest px-4 text-body-sm text-on-surface-variant">
            <span>
              {loading ? "Querying…" : `${total} log${total === 1 ? "" : "s"} matched`}
            </span>
            <span className="font-code-sm">{activeQuery || "unfiltered"}</span>
          </div>
        </div>
        <Drawer
          open={selected !== null}
          onClose={() => setSelected(null)}
          variant="inline"
          widthClass="w-[320px] shrink-0 lg:w-[40%] lg:max-w-[600px]"
          title={selected ? <DrawerTitle log={selected} /> : undefined}
          headerActions={
            selected ? (
              <button
                type="button"
                aria-label="Copy entry"
                className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-surface-container-high"
              >
                <Icon name="content_copy" className="text-[20px]" />
              </button>
            ) : null
          }
        >
          {selected ? <LogDetailDrawer log={selected} /> : null}
        </Drawer>
      </div>
    </div>
  );
}

function LogRow({
  log,
  selected,
  onClick,
}: {
  log: LogEntry;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-selected={selected}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "flex h-[36px] cursor-pointer items-center border-b border-outline-variant/30 border-l-2 border-transparent px-4 transition-colors",
        log.level === "error" ? "odd:bg-log-error-bg/20 even:bg-log-error-bg/5" : "odd:bg-transparent even:bg-surface-container-lowest/40",
        selected && "border-l-2 border-primary bg-surface-container-high",
      )}
    >
      <div className="w-[180px] shrink-0 font-code-sm text-on-surface-variant">{formatTimeOfDay(log.timestamp, true)}</div>
      <div className="w-[80px] shrink-0">
        <SeverityBadge level={log.level} />
      </div>
      <div className="w-[140px] shrink-0 text-body-sm text-on-surface">{log.service}</div>
      <div
        className={cn(
          "min-w-0 flex-1 truncate font-code-sm",
          log.level === "error" ? "text-error" : "text-on-surface",
        )}
      >
        {log.message}
      </div>
    </div>
  );
}

function DrawerTitle({ log }: { log: LogEntry }) {
  return (
    <>
      <SeverityBadge level={log.level} />
      <span className="truncate font-code-md text-on-surface">{log.service}</span>
    </>
  );
}