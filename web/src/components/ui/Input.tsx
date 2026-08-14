import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: string;
  /** Right-side adornment, e.g. a kbd shortcut hint or button. */
  adornment?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leadingIcon, adornment, className, containerClassName, ...rest },
  ref,
) {
  return (
    <div
      className={cn(
        "flex h-8 items-center border border-outline-variant rounded bg-surface-container-low transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20",
        containerClassName,
      )}
    >
      {leadingIcon ? (
        <Icon name={leadingIcon} className="ml-2.5 text-[18px] text-outline shrink-0" />
      ) : null}
      <input
        ref={ref}
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent px-3 text-body-sm text-on-surface placeholder:text-outline focus:outline-none",
          leadingIcon && "pl-1.5",
          className,
        )}
        {...rest}
      />
      {adornment ? <div className="shrink-0">{adornment}</div> : null}
    </div>
  );
});