import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { useTimeRange } from "@/hooks/use-time-range";
import { useToast } from "@/components/feedback/Toast";

export interface Crumb {
  label: string;
  path?: string;
}

interface TopbarProps {
  crumbs: Crumb[];
  onOpenCommandPalette: () => void;
  onOpenMobileMenu: () => void;
}

/** 56px top bar with breadcrumbs, global search, and page actions. */
export function Topbar({ crumbs, onOpenCommandPalette, onOpenMobileMenu }: TopbarProps) {
  const navigate = useNavigate();
  const { range, select, options } = useTimeRange();
  const { show } = useToast();

  return (
    <header className="flex h-topbar-height shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-container-padding">
      {/* Left: mobile menu + breadcrumbs */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation"
          className="flex h-8 w-8 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface lg:hidden"
        >
          <Icon name="menu" className="text-[20px]" />
        </button>
        <nav className="flex min-w-0 items-center gap-1.5 font-code-md text-code-sm text-on-surface-variant">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={crumb.label} className="flex min-w-0 items-center gap-1.5">
                {i > 0 ? <Icon name="chevron_right" className="shrink-0 text-[16px] text-outline-variant" /> : null}
                {crumb.path ? (
                  <button
                    type="button"
                    onClick={() => navigate(crumb.path!)}
                    className="truncate transition-colors hover:text-primary"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className={cn("truncate", isLast && "font-semibold text-on-surface")}>{crumb.label}</span>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden h-8 items-center gap-2 rounded border border-outline-variant bg-surface-container-low px-3 text-body-sm text-on-surface-variant transition-colors hover:border-outline hover:text-on-surface md:flex"
        >
          <Icon name="search" className="text-[16px]" />
          <span className="text-on-surface-variant">Search</span>
          <KbdHint />
        </button>

        <Menu
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="flex h-8 items-center gap-1.5 rounded border border-outline-variant bg-surface px-2.5 text-body-sm text-on-surface transition-colors hover:bg-surface-container"
            >
              <Icon name="schedule" className="text-[16px]" />
              <span className="hidden sm:inline">{range.label}</span>
              <Icon name="arrow_drop_down" className="text-[16px] text-on-surface-variant" />
            </button>
          )}
        >
          {options.map((o) => (
            <MenuItem key={o.label} label={o.label} active={o.label === range.label} onSelect={() => select(o.label)} />
          ))}
          <MenuSeparator />
          <MenuItem label="Custom range…" icon="edit_calendar" onSelect={() => show("Custom ranges arrive with the query API", "neutral")} />
        </Menu>

        <div className="flex items-center gap-1">
          <IconButton icon="history" label="Query history" />
          <IconButton icon="terminal" label="Open API console" />
        </div>

        <Button
          variant="primaryContainer"
          size="md"
          leadingIcon="refresh"
          onClick={() => show("Workspace refreshed", "success")}
        >
          Refresh
        </Button>

        <button
          type="button"
          aria-label="Account menu"
          className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container-high text-label-caps text-primary"
        >
          SJ
        </button>
      </div>
    </header>
  );
}

function KbdHint() {
  return (
    <kbd className="inline-flex h-5 items-center rounded border border-outline-variant bg-surface-container-high px-1 font-code-sm text-[11px] text-on-surface-variant">
      ⌘K
    </kbd>
  );
}

function IconButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
    >
      <Icon name={icon} className="text-[20px]" />
    </button>
  );
}