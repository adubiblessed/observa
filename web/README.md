# Observa Web — Frontend

React + TypeScript + Vite + Tailwind frontend for the Observa observability
platform. All UI work described here lives in `web/`.

- **Docs index**: see `docs/` — [Architecture](docs/architecture.md),
  [Features & Pages](docs/features.md).
- **Design reference** (the "one and only" source of truth): `web/stitch_observa_engineering_platform/`.
- **Backend**: FastAPI service in `../src` (the workspace root `src/`), proxied
  under `/v1` and `/api`.

---

## Quick start

```bash
cd web
npm install            # once, installs dependencies
npm run dev            # starts Vite dev server on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

- `/` → marketing landing page
- `/login`, `/register` → sign-in / sign-up screens
- `/app/dashboards` → the application (sign-in link on the landing page drops you
  straight into the app)

No backend is required. The data layer resolves to deterministic mock data
unless `VITE_USE_MOCK=false` is set (see [Architecture](docs/architecture.md)).

### Production build

```bash
npm run build          # typecheck + production bundle into dist/
npm run preview        # serve the production build locally
```

### Verification commands

```bash
npm run typecheck      # tsc -b --noEmit
npm run lint           # eslint . (0 errors expected)
npm run build          # tsc -b && vite build
```

---

## What is implemented

The frontend ships all pages from the design reference:

| Route | Page | Design source |
| --- | --- | --- |
| `/` | Marketing landing page | `observa_homepage` |
| `/login` | Sign in | `login` |
| `/register` | Sign up | `register` |
| `/app/dashboards` | System Overview (KPIs, alerts, Chart.js telemetry) | `dashboard_overview` |
| `/app/logs` | Log explorer + inline detail drawer | `logs_explorer` / `logs_explorer_1` / `logs_explorer_2` |
| `/app/traces` | Trace table + span waterfall drawer | designed to match (no reference) |
| `/app/traces/:traceId` | Trace detail (waterfall, span attributes, related logs) | `trace_detail` |
| `/app/metrics` | Metrics explorer (Chart.js, query, raw data) | `metrics_explorer` |
| `/app/alerts` | Incidents, rules & history tabs | `alert_management` |
| `/app/projects` | Project table with filters | `projects_management` |
| `/app/projects/new` | Create project wizard (Details → Connection Type → Configure) | `create_project_*` |
| `/app/projects/:id` | Project Hub (latency, alerts, log volume, slowest spans) | `project_detail_production_api_updated` |
| `/app/projects/:id/settings` | Project settings (retention, alert routing, access control) | `project_settings_production_api` |
| `/app/teams` | Team table | `teams_management` |
| `/app/teams/:id` | Team detail (members, roles, search, actions) | `team_detail_infrastructure_sre` |
| `/app/settings` | Workspace settings | designed to match |
| `/app/settings/credentials` | API credential management | `api_credentials_management` |
| `/app/settings/profile` | User profile | `profile_settings` |
| `/app/settings/security` | Security & authentication | `security_authentication` |
| `/app/settings/preferences` | Preferences (appearance, regional, routing) | `preferences` |
| `/app/settings/organizations` | Organizations & access | `access_organizations` |

Charts use **Chart.js** via `TimeSeriesChart` (thin 1.5px lines, no gradients).
Dashboards routes to the System Overview page; `/app/overview` redirects.

See [Features & Pages](docs/features.md) for the full interaction inventory.