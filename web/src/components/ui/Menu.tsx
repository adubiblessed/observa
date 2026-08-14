import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface MenuProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}

/** Lightweight dropdown menu with outside-click and Escape handling. */
export function Menu({ trigger, children, align = "right", className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute z-50 mt-1 min-w-[180px] rounded border border-outline-variant bg-surface p-1 shadow-overlay",
            align === "right" ? "right-0" : "left-0",
            className,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export interface MenuItemProps {
  label: string;
  onSelect: () => void;
  icon?: string;
  active?: boolean;
  right?: ReactNode;
  tone?: "default" | "danger";
}

export function MenuItem({ label, onSelect, icon, active, right, tone = "default" }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onSelect();
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-body-sm transition-colors hover:bg-surface-container-high",
        active ? "text-primary" : tone === "danger" ? "text-error" : "text-on-surface",
      )}
    >
      {icon ? <IconSm name={icon} className={tone === "danger" ? "text-error" : undefined} /> : null}
      <span className="flex-1">{label}</span>
      {right}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-outline-variant" />;
}

function IconSm({ name, className }: { name: string; className?: string }) {
  return <span className={cn("material-symbols-outlined text-[16px] leading-none text-on-surface-variant", className)}>{name}</span>;
}