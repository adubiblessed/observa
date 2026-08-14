import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  badge?: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

/** Underline-segmented tab control. */
export function Tabs({ items, active, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex border-b border-outline-variant", className)} role="tablist">
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-label-caps transition-colors",
              isActive
                ? "border-b-2 border-primary bg-surface-container-highest/20 text-primary"
                : "border-b-2 border-transparent text-on-surface-variant hover:border-outline hover:text-on-surface",
            )}
          >
            {item.icon ? <IconSm name={item.icon} /> : null}
            {item.label}
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}

function IconSm({ name }: { name: string }) {
  return <span className="material-symbols-outlined text-[16px] leading-none">{name}</span>;
}