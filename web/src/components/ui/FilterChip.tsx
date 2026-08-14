import { cn } from "@/lib/cn";
import { Icon } from "./Icon";
import { Menu, MenuItem, MenuSeparator } from "./Menu";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterChipProps {
  label: string;
  /** Displayed value. Use an empty string for "Any". */
  value: string;
  options: FilterOption[];
  onSelect: (value: string) => void;
  /** Allow clearing back to "Any" (empty). */
  clearable?: boolean;
  className?: string;
}

/** Compact query filter chip (`SEVERITY: ERROR, WARN ▾`). */
export function FilterChip({ label, value, options, onSelect, clearable = true, className }: FilterChipProps) {
  const active = options.some((o) => value.split(",").includes(o.value));

  return (
    <Menu
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "flex items-center gap-2 rounded border border-outline-variant bg-surface-container-low px-2 py-1 transition-colors hover:border-outline",
            className,
          )}
        >
          <span className="text-label-caps text-outline">{label}:</span>
          <span className={cn("text-body-sm", active ? "text-on-surface" : "italic text-outline")}>{value || "Any"}</span>
          <Icon name="arrow_drop_down" className="text-[14px] text-outline" />
        </button>
      )}
    >
      {clearable ? (
        <>
          <MenuItem label="Any" active={!value} onSelect={() => onSelect("")} />
          <MenuSeparator />
        </>
      ) : null}
      {options.map((opt) => (
        <MenuItem
          key={opt.value}
          label={opt.label}
          active={value.split(",").includes(opt.value)}
          onSelect={() => {
            const current = value.split(",").filter(Boolean);
            const next = current.includes(opt.value)
              ? current.filter((v) => v !== opt.value)
              : [...current, opt.value];
            onSelect(next.join(","));
          }}
        />
      ))}
    </Menu>
  );
}