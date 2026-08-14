import { Link, NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { NAV_GROUPS, WORKSPACE_LABEL } from "@/lib/navigation";

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      ) : null}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-sidebar-width flex-col border-r border-outline-variant bg-surface py-unit transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-outline-variant px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary-container text-headline-md font-bold text-on-primary-container">
            O
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-headline-md text-on-surface">Observa</h1>
            <p className="truncate text-body-sm text-on-surface-variant">{WORKSPACE_LABEL}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="px-4 py-3">
          <Button
            variant="primary"
            className="w-full"
            size="md"
            leadingIcon="add"
            onClick={() => {
              onCloseMobile();
            }}
            aria-label="New Dashboard"
          >
            New Dashboard
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label ?? "primary"} className="mb-1">
              {group.label ? (
                <p className="px-3 pb-1 pt-3 text-label-caps text-outline">{group.label}</p>
              ) : null}
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/app/dashboards"}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    cn(
                      "mb-0.5 flex items-center gap-3 rounded px-3 py-2 text-body-md transition-colors",
                      isActive
                        ? "border-l-2 border-primary bg-secondary-container text-on-secondary-container"
                        : "border-l-2 border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        name={item.icon}
                        fill={isActive}
                        className={cn("text-[20px]", isActive ? "text-on-secondary-container" : "text-on-surface-variant")}
                      />
                      <span className={isActive ? "font-medium" : ""}>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-outline-variant p-2">
          <Link
            to="/app/settings"
            onClick={onCloseMobile}
            className="flex items-center gap-3 rounded px-3 py-2 text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            <Icon name="account_circle" className="text-[20px]" />
            <span>Profile</span>
          </Link>
        </div>
      </aside>
    </>
  );
}