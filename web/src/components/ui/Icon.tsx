import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

interface IconProps {
  name: string;
  className?: string;
  /** Fill the glyph (Material Symbols FILL axis). */
  fill?: boolean;
  style?: CSSProperties;
  "aria-hidden"?: boolean;
  title?: string;
}

/**
 * Material Symbols outlined icon wrapper. Uses the locally-bundled
 * `material-symbols` font; sizing is controlled via className.
 */
export function Icon({ name, className, fill = false, style, ...rest }: IconProps) {
  return (
    <span
      aria-hidden
      className={cn("material-symbols-outlined select-none leading-none", className)}
      style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400`, ...style }}
      {...rest}
    >
      {name}
    </span>
  );
}