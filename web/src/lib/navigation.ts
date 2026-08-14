export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

/** Primary navigation groups rendered in the sidebar. */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "Logs", path: "/app/logs", icon: "segment" },
      { label: "Traces", path: "/app/traces", icon: "timeline" },
      { label: "Metrics", path: "/app/metrics", icon: "insights" },
      { label: "Dashboards", path: "/app/dashboards", icon: "dashboard" },
      { label: "Alerts", path: "/app/alerts", icon: "notifications" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Projects", path: "/app/projects", icon: "folder" },
      { label: "Teams", path: "/app/teams", icon: "group" },
      { label: "Settings", path: "/app/settings", icon: "settings" },
    ],
  },
];

export const WORKSPACE_LABEL = "Production Cluster";