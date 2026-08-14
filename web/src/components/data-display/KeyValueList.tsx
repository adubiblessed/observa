import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface KeyValueItem {
  label: string;
  value: ReactNode;
  mono?: boolean;
  action?: ReactNode;
}

interface KeyValueListProps {
  items: KeyValueItem[];
  className?: string;
  /** Show label on a fixed one-third column. */
  layout?: "rows" | "grid";
}

/** Structured metadata list used inside detail drawers and settings. */
export function KeyValueList({ items, className, layout = "rows" }: KeyValueListProps) {
  if (layout === "grid") {
    return (
      <dl className={cn("grid grid-cols-2 gap-x-6 gap-y-3", className)}>
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-label-caps text-on-surface-variant">{item.label}</dt>
            <dd className="mt-0.5 text-body-sm text-on-surface">{item.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <div className={cn("divide-y divide-outline-variant rounded border border-outline-variant bg-surface", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex px-3 py-2">
          <div className="w-1/3 shrink-0 text-body-sm text-on-surface-variant">{item.label}</div>
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 text-body-sm text-on-surface",
              item.mono && "font-code-sm",
            )}
          >
            <span className="min-w-0 break-words">{item.value}</span>
            {item.action}
          </div>
        </div>
      ))}
    </div>
  );
}