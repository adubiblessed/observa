import { cn } from "@/lib/cn";

/**
 * Lightweight syntax-colored JSON renderer. Colors follow the design tokens
 * (keys = primary, strings = tertiary, numbers = secondary).
 */
export function JsonView({ data, className }: { data: unknown; className?: string }) {
  return (
    <pre className={cn("m-0 whitespace-pre-wrap font-code-sm text-on-surface-variant", className)}>
      {renderValue(data, 0)}
    </pre>
  );
}

function renderValue(value: unknown, depth: number): React.ReactNode {
  if (value === null) return <span className="text-secondary-fixed">null</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-primary">[]</span>;
    const indent = "  ".repeat(depth + 1);
    const closeIndent = "  ".repeat(depth);
    return (
      <>
        <span className="text-primary">[</span>
        {"\n"}
        {value.map((item, i) => (
          <span key={i}>
            {indent}
            {renderValue(item, depth + 1)}
            {i < value.length - 1 ? "," : ""}
            {"\n"}
          </span>
        ))}
        {closeIndent}
        <span className="text-primary">]</span>
      </>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-tertiary">{"{}"}</span>;
    const indent = "  ".repeat(depth + 1);
    const closeIndent = "  ".repeat(depth);
    return (
      <>
        <span className="text-tertiary">{"{"}</span>
        {"\n"}
        {entries.map(([key, val], i) => (
          <span key={key}>
            {indent}
            <span className="text-primary-fixed-dim">"{key}"</span>
            <span className="text-outline">: </span>
            {renderValue(val, depth + 1)}
            {i < entries.length - 1 ? "," : ""}
            {"\n"}
          </span>
        ))}
        {closeIndent}
        <span className="text-tertiary">{"}"}</span>
      </>
    );
  }
  if (typeof value === "string") {
    return <span className="text-tertiary-fixed-dim">"{value}"</span>;
  }
  return <span className="text-secondary-fixed">{String(value)}</span>;
}