import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/feedback/Toast";

type EnvTier = "production" | "staging" | "development";
type ConnType = "agent" | "otel" | "prometheus" | "cloud";

const STEPS = ["Project Details", "Connection Type", "Configure"];

const ENV_OPTIONS: Array<{ value: EnvTier; icon: string; title: string; desc: string; accent: string }> = [
  { value: "production", icon: "rocket_launch", title: "Production", desc: "High availability, strict access controls.", accent: "text-error border-error" },
  { value: "staging", icon: "science", title: "Staging", desc: "Pre-release validation and testing.", accent: "text-tertiary border-tertiary" },
  { value: "development", icon: "terminal", title: "Development", desc: "Local builds and experimentation.", accent: "text-primary border-primary" },
];

const CONN_OPTIONS: Array<{ value: ConnType; icon: string; title: string; desc: string; badges: string[]; recommended?: boolean }> = [
  {
    value: "agent",
    icon: "terminal",
    title: "Agent-based",
    desc: "Install the Observa agent directly on your host machines. Provides comprehensive host-level metrics, log tailing, and auto-instrumentation.",
    badges: ["Metrics", "Logs"],
  },
  {
    value: "otel",
    icon: "hub",
    title: "OpenTelemetry",
    desc: "Ingest traces, metrics, and logs directly via OTLP gRPC/HTTP endpoints. The vendor-neutral standard for modern distributed systems.",
    badges: ["Traces", "Metrics", "Logs"],
    recommended: true,
  },
  {
    value: "prometheus",
    icon: "speed",
    title: "Prometheus",
    desc: "Configure Observa to scrape existing Prometheus endpoints or accept remote-write payloads from your current cluster setup.",
    badges: ["Metrics"],
  },
  {
    value: "cloud",
    icon: "cloud",
    title: "Cloud-native Integrations",
    desc: "Connect directly via IAM roles or Service Principals to ingest data from AWS CloudWatch, GCP Cloud Monitoring, or Azure Monitor APIs.",
    badges: ["AWS", "GCP", "Azure"],
  },
];

const YAML = `apiVersion: observa.io/v1
kind: Agent
metadata:
  name: observa-daemonset
  namespace: observa-system
spec:
  projectId: "PRJ-9942"
  collection:
    metrics: true
    logs: true
    traces: true
  endpoint: "ingress.observa.io:443"`;

const INSTALL_TABS = ["Kubernetes", "Docker", "Linux Shell"];

export function CreateProjectPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [env, setEnv] = useState<EnvTier>("staging");
  const [conn, setConn] = useState<ConnType>("otel");
  const [tab, setTab] = useState(0);

  const canContinue = step !== 0 || name.trim().length > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <main className="flex w-full max-w-[800px] flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-dim shadow-2xl">
        {/* Header & Progress */}
        <header className="border-b border-outline-variant bg-surface-container-lowest/50 p-6">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="font-headline text-2xl font-semibold tracking-tight text-on-surface">Create New Project</h1>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                {step === 0 && "Configure foundational details for your new environment."}
                {step === 1 && "Select how Observa should ingest telemetry for this project. This dictates the primary ingestion pipeline and initial dashboard configuration."}
                {step === 2 && "Deploy the Observa agent to your environment to begin ingesting metrics, logs, and traces. Use the critical Project ID below to authenticate your instances."}
              </p>
            </div>
            <button
              type="button"
              aria-label="Cancel"
              onClick={() => navigate("/app/projects")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-on-surface-variant transition-colors hover:border-outline-variant hover:bg-surface-variant hover:text-on-surface"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>

          {/* Stepper */}
          <nav aria-label="Progress">
            <ol className="flex items-center" role="list">
              {STEPS.map((label, i) => (
                <li key={label} className={cn("relative", i < STEPS.length - 1 && "pr-8 sm:pr-20")}>
                  {i < STEPS.length - 1 && (
                    <div aria-hidden="true" className="absolute inset-0 flex items-center">
                      <div className={cn("h-px w-full", i < step ? "bg-primary" : "bg-outline-variant")} />
                    </div>
                  )}
                  <a
                    aria-current={i === step ? "step" : undefined}
                    className={cn(
                      "relative flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant ring-2 ring-surface transition-colors",
                      i === step ? "bg-primary text-on-primary" : i < step ? "bg-primary/40 text-on-primary" : "bg-surface-container text-on-surface-variant hover:border-outline",
                    )}
                  >
                    {i < step ? <Icon name="check" className="text-[16px]" /> : <span className="font-label text-xs">{i + 1}</span>}
                  </a>
                  <span
                    className={cn(
                      "absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs",
                      i === step ? "font-semibold text-primary" : "text-on-surface-variant",
                    )}
                  >
                    {label}
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        </header>

        {/* Content */}
        <div className="mt-4 flex-grow space-y-8 bg-surface p-6 md:p-8">
          {step === 0 && (
            <>
              <div className="grid items-start gap-4 md:grid-cols-[200px_1fr] md:gap-8">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-on-surface" htmlFor="project-name">
                    Project Name
                  </label>
                  <p className="text-xs text-on-surface-variant">A unique, human-readable identifier.</p>
                </div>
                <div className="space-y-2">
                  <Input id="project-name" placeholder="e.g. core-auth-service" value={name} onChange={(e) => setName(e.target.value)} />
                  <div className="flex items-center gap-1.5 font-label text-[11px] text-on-surface-variant">
                    <Icon name="id_card" className="text-[14px]" />
                    Generated ID: <span className="font-medium text-primary">obs-proj-xxxx</span>
                  </div>
                </div>
              </div>
              <hr className="border-outline-variant/50" />
              <div className="grid items-start gap-4 md:grid-cols-[200px_1fr] md:gap-8">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-on-surface" htmlFor="description">
                    Description
                  </label>
                  <p className="text-xs text-on-surface-variant">Optional context about workloads.</p>
                </div>
                <textarea
                  id="description"
                  placeholder="Describe the purpose of this project..."
                  rows={3}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full resize-none rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <hr className="border-outline-variant/50" />
              <div className="grid items-start gap-4 md:grid-cols-[200px_1fr] md:gap-8">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-on-surface">Environment Tier</label>
                  <p className="text-xs text-on-surface-variant">Sets default retention and scale policies.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {ENV_OPTIONS.map((opt) => {
                    const active = env === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEnv(opt.value)}
                        className={cn(
                          "rounded-lg border p-4 text-left transition-all",
                          active ? cn("bg-primary-container/10", opt.accent.split(" ")[1]) : "border-outline-variant bg-surface-container hover:border-outline",
                        )}
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <Icon name={opt.icon} className={cn("text-[20px]", opt.accent.split(" ")[0])} />
                          <span
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded-full border transition-opacity",
                              active ? "opacity-100" : "border-outline-variant opacity-0 group-hover:opacity-100",
                            )}
                            style={{ borderColor: active ? undefined : undefined }}
                          >
                            <span className={cn("h-2 w-2 rounded-full", active ? "scale-100" : "scale-0", opt.accent.split(" ")[1])} style={{ background: "currentColor" }} />
                          </span>
                        </div>
                        <h3 className="mb-1 text-sm font-semibold text-on-surface">{opt.title}</h3>
                        <p className="text-[11px] leading-tight text-on-surface-variant">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CONN_OPTIONS.map((opt) => {
                const active = conn === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setConn(opt.value)}
                    className={cn(
                      "rounded-lg border p-4 text-left transition-all",
                      active ? "border-primary bg-primary-container/10" : "border-outline-variant bg-surface-container hover:border-outline",
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <Icon name={opt.icon} className={cn("text-[20px]", active ? "text-primary" : "text-on-surface-variant")} />
                      {opt.recommended ? (
                        <span className="rounded-full bg-secondary-container px-2 py-0.5 font-label text-[10px] font-semibold text-on-secondary-container">RECOMMENDED</span>
                      ) : null}
                    </div>
                    <h3 className="text-sm font-semibold text-on-surface">{opt.title}</h3>
                    <p className="mt-1 text-xs leading-tight text-on-surface-variant">{opt.desc}</p>
                    <div className="mt-3 flex gap-1.5">
                      {opt.badges.map((b) => (
                        <span key={b} className="rounded bg-surface-variant px-1.5 py-0.5 font-label text-[10px] text-on-surface-variant">
                          {b}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container p-4">
                <div className="flex items-center gap-3">
                  <Icon name="key" className="text-[20px] text-primary" />
                  <div>
                    <p className="text-label-caps text-on-surface-variant">Active Project ID</p>
                    <p className="font-code-md text-on-surface">PRJ-9942</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" leadingIcon="content_copy" onClick={() => toast.show("Project ID copied.", "success")}>
                  Copy ID
                </Button>
              </div>

              <div>
                <div className="flex gap-1 border-b border-outline-variant">
                  {INSTALL_TABS.map((t, i) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(i)}
                      className={cn(
                        "border-b-2 px-4 py-2 text-body-sm transition-colors",
                        tab === i ? "border-primary font-semibold text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-body-sm text-on-surface-variant">
                  Apply the Observa Agent DaemonSet to your cluster. Ensure you have appropriate RBAC permissions configured in your current context.
                </p>
                <div className="mt-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-code-sm text-on-surface-variant">observa-agent.yaml</span>
                    <button type="button" aria-label="Copy config" className="text-on-surface-variant transition-colors hover:text-primary">
                      <Icon name="content_copy" className="text-[18px]" />
                    </button>
                  </div>
                  <pre className="custom-scrollbar overflow-x-auto font-code-sm leading-relaxed text-on-surface">{YAML}</pre>
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-body-sm text-on-surface-variant">
                  <Icon name="info" className="mt-0.5 shrink-0 text-[16px]" />
                  After saving the file, apply it using <span className="font-code-sm text-primary">kubectl apply -f observa-agent.yaml</span>. The agent will automatically
                  detect running pods and begin instrumentation.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-outline-variant bg-surface-container-lowest p-4">
          {step > 0 ? (
            <Button variant="ghost" leadingIcon="arrow_back" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/app/projects")}
              className="px-4 py-2 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Cancel
            </button>
          )}
          {step < 2 ? (
            <Button variant="primary" trailingIcon="arrow_forward" disabled={!canContinue} onClick={() => setStep(step + 1)}>
              {step === 0 ? "Next: Connection Type" : "Next Step"}
            </Button>
          ) : (
            <Button
              variant="primary"
              leadingIcon="check_circle"
              onClick={() => {
                toast.show("Project created. Telemetry setup pending verification.", "success");
                navigate("/app/projects");
              }}
            >
              Complete Setup
            </Button>
          )}
        </footer>
      </main>
    </div>
  );
}