import { Outlet, useLocation, useParams } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar, type Crumb } from "@/components/layout/Topbar";
import { CommandPalette } from "@/components/feedback/CommandPalette";
import { useCommandPalette } from "@/hooks/use-shortcut";
import { useDisclosure } from "@/hooks/use-disclosure";

const PAGE_TITLES: Record<string, string> = {
  dashboards: "Dashboards",
  logs: "Logs",
  traces: "Traces",
  metrics: "Metrics",
  alerts: "Alerts",
  projects: "Projects",
  teams: "Teams",
  settings: "Settings",
};

const SETTINGS_LABELS: Record<string, string> = {
  credentials: "Credentials",
  profile: "Profile",
  security: "Security",
  preferences: "Preferences",
  organizations: "Organizations",
};

/** Build breadcrumbs from the active route. */
function useBreadcrumbs(): Crumb[] {
  const location = useLocation();
  const params = useParams();
  const segments = location.pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ label: "Cluster-01", path: "/app/dashboards" }];

  if (segments[0] === "app") {
    const section = segments[1];
    if (section) {
      const label = PAGE_TITLES[section] ?? section;
      const sectionPath = `/app/${section}`;
      if (section === "dashboards") {
        crumbs.push({ label: "Dashboards", path: "/app/dashboards" });
        crumbs.push({ label: "Overview" });
      } else if (section === "projects" && params.projectId) {
        crumbs.push({ label: "Projects", path: "/app/projects" });
        crumbs.push({ label: params.projectId });
      } else if (section === "teams" && params.teamId) {
        crumbs.push({ label: "Teams", path: "/app/teams" });
        crumbs.push({ label: params.teamId });
      } else if (section === "settings" && segments[2]) {
        crumbs.push({ label: "Settings", path: "/app/settings" });
        crumbs.push({ label: SETTINGS_LABELS[segments[2]] ?? segments[2] });
      } else if (segments[2]) {
        crumbs.push({ label, path: sectionPath });
        crumbs.push({ label: segments[2] });
      } else {
        crumbs.push({ label });
      }
    }
  }
  return crumbs;
}

/** Application shell: sidebar + top bar + routed content + command palette. */
export function AppLayout() {
  const crumbs = useBreadcrumbs();
  const mobileMenu = useDisclosure(false);
  const palette = useDisclosure(false);
  useCommandPalette(palette.open);

  return (
    <div className="h-screen overflow-hidden bg-background text-on-background">
      <Sidebar mobileOpen={mobileMenu.isOpen} onCloseMobile={mobileMenu.close} />
      <div className="flex h-full flex-col lg:pl-sidebar-width">
        <Topbar
          crumbs={crumbs}
          onOpenCommandPalette={palette.open}
          onOpenMobileMenu={mobileMenu.open}
        />
        <main className="min-h-0 flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={palette.isOpen} onClose={palette.close} />
    </div>
  );
}