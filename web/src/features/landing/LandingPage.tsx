import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";

const NAV_LINKS = ["Product", "Solutions", "Docs", "OpenTelemetry", "Pricing"];

const FEATURES = [
  {
    title: "Logs",
    description: "Explore structured and unstructured logs with a fast query engine.",
    icon: "article",
  },
  {
    title: "Metrics",
    description: "Query and visualize metrics with a PromQL-compatible explorer.",
    icon: "monitoring",
  },
  {
    title: "Traces",
    description: "Follow requests end-to-end with distributed tracing and waterfalls.",
    icon: "route",
  },
  {
    title: "Errors",
    description: "Group exceptions automatically and track resolution over time.",
    icon: "bug_report",
  },
];

const RECENT_EVENTS = [
  { level: "error", message: "Connection timeout on db-cluster-main" },
  { level: "info", message: "User auth successful uid=8943" },
  { level: "info", message: "Batch job completed in 1.2s" },
  { level: "warn", message: "High memory usage on worker-04" },
  { level: "info", message: "Service restarted successfully" },
];

const LEVEL_CLASS: Record<string, string> = {
  error: "text-log-error-text",
  info: "text-log-info-text",
  warn: "text-log-warn-text",
};

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <header className="flex h-16 items-center justify-between px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <Logo variant="rounded" size="md" />
          <span className="text-headline-sm font-semibold tracking-tight">Observa</span>
        </div>
        <nav className="hidden items-center gap-6 text-body-sm text-on-surface-variant md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link} href="#" className="transition-colors hover:text-on-surface">
              {link}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/app/dashboards" className="text-body-sm text-on-surface-variant transition-colors hover:text-on-surface">
            Sign In
          </Link>
          <Link
            to="/app/dashboards"
            className="rounded bg-primary-container px-4 py-2 text-body-sm font-semibold text-on-primary-container transition-opacity hover:opacity-90"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="flex flex-col items-center px-6 pb-20 pt-24 text-center">
          <h1 className="max-w-3xl text-[40px] font-semibold leading-[52px] tracking-[-0.02em] lg:text-[48px] lg:leading-[56px]">
            See what your systems are really doing.
          </h1>
          <p className="mt-6 max-w-2xl text-body-lg text-on-surface-variant">
            Observa brings logs, metrics, traces, and errors into one fast, developer-first observability platform.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/app/dashboards"
              className="rounded bg-primary px-6 py-3 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90"
            >
              Start monitoring
            </Link>
            <Link
              to="/app/dashboards"
              className="flex items-center gap-2 rounded border border-outline-variant px-6 py-3 text-body-md text-on-surface transition-colors hover:bg-surface-container"
            >
              Explore the platform
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          </div>

          {/* Terminal preview */}
          <div className="mt-16 w-full max-w-4xl overflow-hidden rounded-lg border border-outline-variant bg-surface text-left shadow-modal">
            <div className="flex items-center gap-2 border-b border-outline-variant bg-surface-container-low px-4 py-2.5">
              <span className="font-code-sm text-on-surface-variant">observa-production-cluster-01</span>
              <span className="ml-auto flex items-center gap-1 rounded bg-log-info-bg px-2 py-0.5 text-[10px] font-bold text-log-info-text">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                LIVE
              </span>
            </div>
            <div className="grid grid-cols-4 divide-x divide-outline-variant border-b border-outline-variant">
              <Stat label="Availability" value="98.7%" />
              <Stat label="Total Events (24h)" value="1.2M" />
              <Stat label="P95 Latency" value="42ms" />
              <Stat label="Error Rate" value="0.02%" />
            </div>
            <div className="p-4">
              <p className="mb-2 font-code-sm text-on-surface-variant">Recent Events</p>
              <ul className="space-y-1 font-code-sm">
                {RECENT_EVENTS.map((ev, i) => (
                  <li key={i} className="flex gap-2">
                    <span className={cn("w-10 shrink-0 font-bold", LEVEL_CLASS[ev.level])}>{ev.level.toUpperCase()}</span>
                    <span className="text-on-surface">{ev.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-outline-variant bg-surface py-20">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-headline-xl text-on-surface">
              Your systems are connected. Your observability shouldn't be fragmented.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-body-md text-on-surface-variant">
              Logs tell you what happened. Metrics tell you how often. Traces tell you where it happened.
            </p>
            <div className="mt-12 grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded border border-outline-variant bg-surface-container-lowest p-5">
                  <Icon name={feature.icon} className="text-[24px] text-primary" />
                  <h3 className="mt-3 text-body-md font-semibold text-on-surface">{feature.title}</h3>
                  <p className="mt-1.5 text-body-sm text-on-surface-variant">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant px-6 py-10 lg:px-10">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="text-label-caps text-on-surface-variant">Developer-first observability.</p>
            <p className="mt-1 font-code-sm text-on-surface-variant">observa · open-source</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-body-sm text-on-surface-variant">
            <a href="#" className="hover:text-on-surface">Documentation</a>
            <a href="#" className="hover:text-on-surface">API Reference</a>
            <a href="#" className="hover:text-on-surface">GitHub</a>
            <a href="#" className="hover:text-on-surface">Company</a>
            <a href="#" className="hover:text-on-surface">Blog</a>
            <a href="#" className="hover:text-on-surface">Careers</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-label-caps text-outline">{label}</p>
      <p className="mt-0.5 font-code-md text-on-surface">{value}</p>
    </div>
  );
}