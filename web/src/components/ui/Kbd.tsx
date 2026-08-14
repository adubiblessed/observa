import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Keyboard key / shortcut chip. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-outline-variant bg-surface-container-high px-1 font-code-sm text-[11px] text-on-surface-variant",
        className,
      )}
    >
      {children}
    </kbd>
  );
}