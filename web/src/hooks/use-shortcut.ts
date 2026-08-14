import { useCallback, useEffect } from "react";

/**
 * Fires `onOpen` when the given modifier+key combination is pressed while the
 * element is not focused inside an input/textarea.
 */
export function useShortcut(
  key: string,
  onOpen: () => void,
  options: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; shiftKey?: boolean } = {},
) {
  const { ctrlKey = false, metaKey = false, altKey = false, shiftKey = false } = options;

  const handler = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const typing =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable;

      const modifier = (event.ctrlKey || event.metaKey) === (ctrlKey || metaKey);
      if (!modifier) return;

      const pressed =
        event.key.toLowerCase() === key.toLowerCase() &&
        event.altKey === altKey &&
        event.shiftKey === shiftKey &&
        ((ctrlKey || metaKey) ? event.ctrlKey === ctrlKey && event.metaKey === metaKey : !event.ctrlKey && !event.metaKey);

      if (pressed && !typing) {
        event.preventDefault();
        onOpen();
      }
    },
    [key, onOpen, ctrlKey, metaKey, altKey, shiftKey],
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}

/** Global command palette shortcut: Cmd/Ctrl+K. */
export function useCommandPalette(onOpen: () => void) {
  useShortcut("k", onOpen, { ctrlKey: true, metaKey: true });
}