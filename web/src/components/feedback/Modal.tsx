import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

/** Centered modal dialog. */
export function Modal({ open, onClose, title, children, footer, maxWidth = "max-w-md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4">
      <div className={cn("flex h-fit w-full flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-modal", maxWidth)}>
        {title ? (
          <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
            <h3 className="text-headline-md text-on-surface">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>
        ) : null}
        <div className={cn("overflow-y-auto p-6")}>{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-outline-variant bg-surface-container-lowest px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}