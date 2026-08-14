import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Rendered in the header, typically a badge + monospaced identifier. */
  title?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  /**
   * `overlay` — floats above content, slides from the right edge.
   * `inline` — a bordered panel beside the main content (log explorer layout).
   */
  variant?: "overlay" | "inline";
  className?: string;
  widthClass?: string;
}

/**
 * Detail drawer for technical entities (logs, traces, spans, alerts).
 * Overlay variant opens from the right at ~40% viewport width.
 */
export function Drawer({
  open,
  onClose,
  title,
  headerActions,
  children,
  variant = "overlay",
  className,
  widthClass = "w-full max-w-[40%] min-w-[360px] lg:max-w-[640px]",
}: DrawerProps) {
  useEffect(() => {
    if (!open || variant !== "overlay") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, variant, onClose]);

  if (variant === "inline") {
    if (!open) return null;
    return (
      <aside
        role="dialog"
        aria-modal="false"
        className={cn("flex shrink-0 flex-col overflow-hidden border-l border-outline-variant bg-surface-container-low", widthClass, className)}
      >
        <DrawerHeader title={title} headerActions={headerActions} onClose={onClose} />
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">{children}</div>
      </aside>
    );
  }

  if (!open) return null;

  return (
    <div className={cn("fixed inset-0 z-50 flex justify-end", className)}>
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-black/40" />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex h-full flex-col border-l border-outline-variant bg-surface-container-low shadow-overlay",
          widthClass,
        )}
      >
        <DrawerHeader title={title} headerActions={headerActions} onClose={onClose} />
        <div className="custom-scrollbar flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}

function DrawerHeader({
  title,
  headerActions,
  onClose,
}: {
  title?: ReactNode;
  headerActions?: ReactNode;
  onClose: () => void;
}) {
  return (
    <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-4">
      <div className="flex min-w-0 items-center gap-3">{title}</div>
      <div className="flex shrink-0 items-center gap-1 text-outline">
        {headerActions}
        <div className="mx-1 h-4 w-px bg-outline-variant" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
        >
          <Icon name="close" className="text-[20px]" />
        </button>
      </div>
    </header>
  );
}