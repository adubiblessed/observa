import { cn } from "@/lib/cn";
import logoImg from "@/logo/logo.png";
import logoRoundedImg from "@/logo/logo_rounded.png";
import logoWithBrandNameImg from "@/logo/logo_with_brand_name.png";

export type LogoVariant = "mark" | "rounded" | "with-text";
export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  alt?: string;
}

const SIZE_CLASSES: Record<LogoVariant, Record<LogoSize, string>> = {
  mark: {
    xs: "h-5 w-5",
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
    xl: "h-12 w-12",
  },
  rounded: {
    xs: "h-5 w-5",
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
    xl: "h-12 w-12",
  },
  "with-text": {
    xs: "h-5 w-auto",
    sm: "h-7 w-auto",
    md: "h-9 w-auto",
    lg: "h-12 w-auto",
    xl: "h-16 w-auto",
  },
};

/**
 * Official Observa Application Logo.
 * Single source of truth referencing the brand assets inside `src/logo/`.
 */
export function Logo({
  variant = "mark",
  size = "md",
  className,
  alt = "Observa Logo",
}: LogoProps) {
  let src = logoImg;
  if (variant === "rounded") {
    src = logoRoundedImg;
  } else if (variant === "with-text") {
    src = logoWithBrandNameImg;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn("select-none object-contain", SIZE_CLASSES[variant][size], className)}
      draggable={false}
    />
  );
}
