import type { LogEntry } from "@/types";
import { formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/cn";
import { KeyValueList } from "@/components/data-display/KeyValueList";
import { JsonView } from "@/components/data-display/JsonView";

/** Body of the log detail drawer: message, metadata, structured data. */
export function LogDetailDrawer({ log }: { log: LogEntry }) {
  return (
    <div className="space-y-6 p-4">
      {/* Full message */}
      <section>
        <h4 className="mb-2 text-label-caps text-outline">Message</h4>
        <div
          className={cn(
            "whitespace-pre-wrap rounded border border-outline-variant bg-surface p-3 font-code-sm",
            log.level === "error" ? "text-error" : "text-on-surface",
          )}
        >
          {log.rawMessage ?? log.message}
        </div>
      </section>

      {/* Metadata */}
      <section>
        <h4 className="mb-2 text-label-caps text-outline">Metadata</h4>
        <KeyValueList
          items={[
            { label: "Timestamp", value: formatTimestamp(log.timestamp, true), mono: true },
            {
              label: "Trace ID",
              value: log.traceId ?? "—",
              mono: true,
              action: log.traceId ? (
                <span className="cursor-pointer text-primary hover:underline">open</span>
              ) : undefined,
            },
            { label: "Span ID", value: log.spanId ?? "—", mono: true },
            { label: "Service", value: log.service, mono: true },
            { label: "Host", value: log.host, mono: true },
            { label: "Pod", value: log.pod, mono: true },
          ]}
        />
      </section>

      {/* Structured data */}
      <section>
        <h4 className="mb-2 text-label-caps text-outline">Structured Data</h4>
        <div className="custom-scrollbar overflow-x-auto rounded border border-outline-variant bg-surface p-3">
          <JsonView data={{ ...log.attributes, level: log.level, service: log.service }} />
        </div>
      </section>
    </div>
  );
}