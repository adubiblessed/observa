import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

type Variant = "primary" | "primaryContainer" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leadingIcon?: string;
  trailingIcon?: string;
  children?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-fixed-dim",
  primaryContainer:
    "bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-colors",
  secondary: "bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-dim",
  outline:
    "border border-outline-variant bg-surface text-on-surface hover:bg-surface-container",
  ghost: "text-on-surface-variant hover:text-on-surface hover:bg-surface-container",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-body-sm gap-1.5",
  md: "h-8 px-3 text-body-sm gap-2",
  icon: "h-8 w-8 justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "outline", size = "md", leadingIcon, trailingIcon, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {leadingIcon ? <Icon name={leadingIcon} className="text-[16px]" /> : null}
      {children}
      {trailingIcon ? <Icon name={trailingIcon} className="text-[16px]" /> : null}
    </button>
  );
});