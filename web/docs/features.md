# Features & Pages

This document inventories every route, page, and interaction in the Observa
frontend, and where each maps to in the design reference
(`web/stitch_observa_engineering_platform/`).

## Auth

| Route | Page | Key interactions |
| --- | --- | --- |
| `/login` | `features/auth/LoginPage` | SSO (GitHub/Google) quick links, email+password form, forgot-password, link to `/register`. Submission drops into the app (`/app/dashboards`). |
| `/register` | `features/auth/RegisterPage` | SSO quick links, name/email/password form, terms notice, link to `/login`. |

## App shell

`layouts/AppLayout` wraps all `/app/*` routes with:

- `Sidebar` — primary navigation (Logs, Traces, Metrics, Dashboards, Alerts,
  Projects, Teams, Settings, Profile) + "New Dashboard" quick action.
- `Topbar` — cluster breadcrumbs, refresh (hover stays blue, never white), and
  command-palette trigger.
- `CommandPalette` (`Ctrl/Cmd+K`) — global navigation + account quick actions.

## Dashboards

| Route | Page | Key interactions |
| --- | --- | --- |
| `/app/dashboards` | `features/overview/OverviewPage` (System Overview) | KPI cards (Ingest Volume, Requests, 5xx Rate, Avg Latency), **Chart.js** telemetry panels (thin lines), Active Alerts list with severity chips ("3 Critical"), events feed, refresh button. `/app/overview` redirects here. |

## Logs

| Route | Page | Key interactions |
| --- | --- | --- |
| `/app/logs` | `features/logs/LogsPage` | Query bar + time-range selector, live/pause toggle, log table with mono IDs and severity chips, expandable inline detail drawer with fields and JSON payload. |

## Traces

| Route | Page | Key interactions |
| --- | --- | --- |
| `/app/traces` | `features/traces/TracesPage` | Trace table (ID, root service, operation, spans, duration, status), click row to navigate to detail. |
| `/app/traces/:traceId` | `features/traces/TraceDetailPage` | Header stats (total duration, spans, errors), waterfall timeline with colored service bars and error highlights, span attributes, infrastructure, related logs with link to Logs explorer. |

## Metrics

| Route | Page | Key interactions |
| --- | --- | --- |
| `/app/metrics` | `features/metrics/MetricsPage` | Metric query + legend (e.g. `api-server (us-east-1)`, `(eu-west-1)`), 1h/6h/24h range, **Chart.js** time-series panel (thin lines), raw data table, time range selector. |

## Alerts

| Route | Page | Key interactions |
| --- | --- | --- |
| `/app/alerts` | `features/alerts/AlertsPage` | Tabs: **Active Incidents / Alert Rules / History**. Firing-count chip, per-row Acknowledge / Resolve, Filter + Export buttons, severity + status badges. |

## Projects

| Route | Page | Key interactions |
| --- | --- | --- |
| `/app/projects` | `features/projects/ProjectsPage` | Project **table** (name, environment, telemetry volume, ingest rate, status badge, created, last activity, View), Environment & Status segmented filters. |
| `/app/projects/new` | `features/projects/CreateProjectPage` | 3-step wizard: **Project Details** (name, generated ID, description, environment tier) → **Connection Type** (Agent / OpenTelemetry / Prometheus / Cloud) → **Configure** (project ID copy, Kubernetes/Docker/Shell tabs, YAML, apply command). |
| `/app/projects/:projectId` | `features/projects/ProjectDetailPage` | Project Hub: PRJ-style ID, Healthy badge, description, Latency p99 card, Active Alerts, Log Volume (lines/errors) with View Logs, Slowest Spans table, Edit + Settings buttons. |
| `/app/projects/:projectId/settings` | `features/projects/ProjectSettingsPage` | General identity (name/description/immutable ID), data retention (logs/metrics/traces days), alert routing (PagerDuty/Slack), access-control member table with Add Member + role actions. |

## Teams

| Route | Page | Key interactions |
| --- | --- | --- |
| `/app/teams` | `features/teams/TeamsPage` | Team **table** (name, description, members, projects, actions), Export + Create Team, edit/delete row actions. |
| `/app/teams/:teamId` | `features/teams/TeamDetailPage` | Team header, member search, member table with roles (**Team Lead / Admin / Editor / Viewer**), edit/delete actions, pagination footer, Invite Member. |

## Settings

| Route | Page | Key interactions |
| --- | --- | --- |
| `/app/settings` | `features/settings/SettingsPage` | Section nav (General, Profile, Security, Preferences, Organizations, API Credentials); general tab edits workspace name + retention. |
| `/app/settings/credentials` | `features/settings/CredentialsPage` | Credential table (name, key ID, type, status, created, last used, actions), Create New Key, CLI Access, **one-time secret modal** with copy. |
| `/app/settings/profile` | `features/settings/ProfileSettingsPage` | Avatar, immutable user ID + copy, last login, personal info form, danger zone (delete account). |
| `/app/settings/security` | `features/settings/SecuritySettingsPage` | Change password, MFA status + configure/disable, API key list, active sessions table with revoke, recent security events. |
| `/app/settings/preferences` | `features/settings/PreferencesPage` | Appearance (Dark/Light/System), timezone + date format, notification routing toggles (email digest, Slack, webhook). |
| `/app/settings/organizations` | `features/settings/OrganizationsPage` | Pending invitations (accept/decline), active memberships table (role, members, status, leave), create organization. |

## Global interactions

- **Refresh**: Topbar refresh re-fetches current page data; hover color stays
  `primary` (never white) per design.
- **Charts**: all graphs render via `TimeSeriesChart` (Chart.js, thin 1.5px
  lines, no gradients, mono axis labels).
- **Toasts**: confirmations for save/copy/create/ack actions via `useToast`.
- **Command palette**: `Ctrl/Cmd+K` for navigation + account actions.
