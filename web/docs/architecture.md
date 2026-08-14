# Architecture

## Tech stack

| Layer | Choice |
| --- | --- |
| Language | TypeScript (strict, `noUnusedLocals`/`noUnusedParameters`) |
| UI | React 18 + react-router-dom 6 |
| Build | Vite 5 (`vite.config.ts`) |
| Styling | Tailwind CSS 3 (design tokens in `tailwind.config.js`) |
| Icons | `material-symbols` self-hosted font (`material-symbols/outlined.css` in `main.tsx`) |
| Fonts | Geist (headlines), Inter (body), JetBrains Mono (code) via Google Fonts in `index.html` |

`node` and `npm` are required (tested on Node 24).

## Directory map

```
web/
├── src/
│   ├── main.tsx              # entry point (fonts CSS, index.css, BrowserRouter)
│   ├── App.tsx               # route table (all routes defined here)
│   ├── vite-env.d.ts         # vite/client types
│   ├── types/index.ts        # all domain types (LogEntry, Trace, Project, …)
│   ├── lib/
│   │   ├── cn.ts             # classnames helper (clsx + tailwind-merge)
│   │   ├── format.ts         # time/duration/number formatters + mulberry32 PRNG
│   │   ├── clipboard.ts      # copyText helper
│   │   ├── mock-data.ts      # seeded generators for every entity
│   │   ├── navigation.ts     # sidebar nav groups + workspace label
│   │   └── api/
│   │       ├── http.ts       # fetch wrapper + ApiError
│   │       ├── resources.ts  # typed api.* methods (mock OR live backend)
│   │       └── index.ts      # re-exports
│   ├── hooks/
│   │   ├── use-disclosure.ts   # open/close/toggle state
│   │   ├── use-shortcut.ts     # keyboard shortcuts + command palette hook
│   │   └── use-time-range.ts   # TIME_RANGES + active range selection
│   ├── components/
│   │   ├── ui/               # primitives: Icon, Button, Input, Badge, Kbd,
│   │   │                     #   Panel, Tabs, Loader, EmptyState, DataTable,
│   │   │                     #   Menu, FilterChip
│   │   ├── feedback/         # Drawer (overlay+inline), Modal, Toast, CommandPalette
│   │   ├── data-display/     # MetricCard, LineChart/ChartPanel, JsonView, KeyValueList
│   │   └── layout/           # Sidebar, Topbar
│   ├── layouts/
│   │   └── AppLayout.tsx     # app shell: sidebar + topbar + <Outlet/> + palette
│   └── features/
│       ├── landing/          # LandingPage
│       ├── overview/         # OverviewPage
│       ├── logs/             # LogsPage, LogDetailDrawer
│       ├── traces/           # TracesPage, TraceDetailDrawer
│       ├── metrics/          # MetricsPage
│       ├── dashboards/       # DashboardsPage
│       ├── alerts/           # AlertsPage
│       ├── projects/         # ProjectsPage, ProjectDetailPage
│       ├── teams/            # TeamsPage, TeamDetailPage
│       └── settings/         # SettingsPage, CredentialsPage
├── stitch_observa_engineering_platform/  # DESIGN.md + HTML mockups + screenshots
├── tailwind.config.js        # design tokens (colors, type, spacing, shadows)
├── vite.config.ts            # @ alias, /v1 + /api proxy → localhost:8000
├── .eslintrc.cjs             # eslint config (ts + react-hooks + prettier)
└── index.html                # fonts, <html class="dark">, #root
```

## Data flow

Pages call typed methods on the `api` object (`src/lib/api/resources.ts`):

```
Page component
   └─ api.listLogs({...})            → typed Promise<ListResult<T>>
        ├─ USE_MOCK (default true)   → resolves to seeded mock-data (140ms delay)
        └─ USE_MOCK === false        → fetch via http.ts against /v1 or /api
```

- **Mock mode** is the default: set env `VITE_USE_MOCK=false` to hit the live
  FastAPI backend (`localhost:8000`, proxied by Vite).
- Every mock generator is **seeded** (`mulberry32`), so data is stable across
  reloads and tests. See `src/lib/mock-data.ts`.
- Pages own their data loading: a `useEffect` + `useState` with a `cancelled`
  flag, a `loading` state rendered via `<Loader/>`, and typed results.
  Errors surface via `<EmptyState>`.

## Routing

All routes are declared in `src/App.tsx`:

- `/` → `LandingPage` (outside the app shell)
- `/login`, `/register` → auth screens (outside the app shell)
- `/app` → `AppLayout` with children:
  - index redirects to `/app/dashboards`
  - `dashboards` (System Overview), `logs`, `traces` (+ `traces/:traceId`),
    `metrics`, `alerts`
  - `projects` (+ `projects/new`, `projects/:projectId`,
    `projects/:projectId/settings`), `teams` (+ `teams/:teamId`)
  - `settings`, `settings/credentials`, `settings/profile`,
    `settings/security`, `settings/preferences`, `settings/organizations`
- `*` → redirect to `/`

`AppLayout` renders `Sidebar` + `Topbar` + `<Outlet/>` + `CommandPalette` and
derives breadcrumbs from the route segments (`src/layouts/AppLayout.tsx`).
The sidebar groups and workspace label come from `src/lib/navigation.ts`.

## Charts

All graphs render through `src/components/data-display/TimeSeriesChart.tsx`, a
thin **Chart.js** wrapper: 1.5px lines, no fills/gradients, subtle grid, mono
axis labels, and tooltips. Panels are composed via `TimeSeriesChartPanel`, which
also renders the legend (e.g. `api-server (us-east-1)`).

## Design system

- **Token source**: `web/stitch_observa_engineering_platform/observa/DESIGN.md`.
- Tokens are declared in `tailwind.config.js`: full Material color roles
  (`surface`, `surface-container-low/high/highest`, `primary`, `secondary`,
  `error`, `success`, `warning`, `info`, `log-*` log colors, `outline`).
- Typography utilities: `font-code-sm/code-md`, `text-code-sm`, `text-body-sm/md`,
  `text-headline-sm/md/lg/xl`, `text-label-caps`.
- Custom spacing: `gap-gutter` (12px), `p-container-padding` (24px),
  `h-table-row-height` (36px), `h-topbar-height`, `pl-sidebar-width`.
- **Hard rules**: no gradients anywhere; solid colors + tonal layering only;
  JetBrains Mono for IDs/timestamps/logs/technical content; dense layouts.

## Design constraints & conventions

- TypeScript `strict` — no implicit `any`, no unused locals/params (build errors).
- Prefer `type` imports: `import type { … }` (enforced by eslint).
- Reuse `DataTable` for tables (sorting, selection, pagination built in) and
  `Drawer` (`variant="inline"` for beside-table, `variant="overlay"` for slide-over)
  for detail views.
- No gradients; semantic color only for semantic meaning.
- Component APIs: check the component's props before using (e.g. `Menu`
  `align` is `"left" | "right"`, `Badge` uses `tone`, `Tabs` uses `active`).