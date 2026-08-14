import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Header strip rendered above the body. */
  header?: ReactNode;
  headerClassName?: string;
  bodyClassName?: string;
  padding?: boolean;
}

/**
 * A bordered content panel ("Level 1" surface) used throughout Observa.
 * Separation is achieved with a 1px border rather than shadow.
 */
export function Panel({
  children,
  header,
  headerClassName,
  bodyClassName,
  padding = true,
  className,
  ...rest
}: PanelProps) {
  return (
    <section className={cn("flex flex-col overflow-hidden rounded border border-outline-variant bg-surface", className)} {...rest}>
      {header ? (
        <div
          className={cn(
            "flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-4 py-2.5",
            headerClassName,
          )}
        >
          {header}
        </div>
      ) : null}
      <div className={cn("min-h-0 flex-1", padding && "p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  leading?: ReactNode;
}

/** Standard panel header title + optional actions. */
export function PanelHeader({ title, subtitle, actions, leading }: PanelHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      {leading}
      <div>
        <h3 className="text-label-caps text-on-surface">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-body-sm text-on-surface-variant">{subtitle}</p> : null}
      </div>
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </div>
  );
}