import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

/** Inline loading indicator for data surfaces. */
export function Loader({ className, label = "Loading…" }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 py-10 text-body-sm text-on-surface-variant", className)}>
      <Icon name="progress_activity" className="animate-spin text-[16px] text-primary" />
      <span>{label}</span>
    </div>
  );
}

/** Empty state for tables and lists. */
export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  className,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-12 text-center", className)}>
      <Icon name={icon} className="text-[28px] text-outline" />
      <p className="text-body-md font-medium text-on-surface">{title}</p>
      {description ? <p className="max-w-sm text-body-sm text-on-surface-variant">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}