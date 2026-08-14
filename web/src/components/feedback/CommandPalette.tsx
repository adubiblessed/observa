import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Kbd } from "@/components/ui/Kbd";

interface Command {
  id: string;
  label: string;
  keywords?: string;
  icon: string;
  hint?: string;
  group: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/** Centered command palette triggered by Cmd/Ctrl+K. */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      { id: "go-logs", label: "Go to Logs", keywords: "log explorer search", icon: "segment", group: "Navigate", run: () => navigate("/app/logs") },
      { id: "go-traces", label: "Go to Traces", keywords: "trace span waterfall", icon: "timeline", group: "Navigate", run: () => navigate("/app/traces") },
      { id: "go-metrics", label: "Go to Metrics", keywords: "metric query prometheus", icon: "insights", group: "Navigate", run: () => navigate("/app/metrics") },
      { id: "go-dashboards", label: "Go to Dashboards", keywords: "dashboard overview", icon: "dashboard", group: "Navigate", run: () => navigate("/app/dashboards") },
      { id: "go-overview", label: "Go to System Overview", keywords: "system overview kpi", icon: "dashboard", group: "Navigate", run: () => navigate("/app/dashboards") },
      { id: "go-alerts", label: "Go to Alerts", keywords: "alert incident rule", icon: "notifications", group: "Navigate", run: () => navigate("/app/alerts") },
      { id: "go-projects", label: "Go to Projects", keywords: "project list", icon: "folder", group: "Navigate", run: () => navigate("/app/projects") },
      { id: "go-teams", label: "Go to Teams", keywords: "team members roles", icon: "group", group: "Navigate", run: () => navigate("/app/teams") },
      { id: "go-settings", label: "Go to Settings", keywords: "config preferences", icon: "settings", group: "Navigate", run: () => navigate("/app/settings") },
      { id: "go-credentials", label: "Go to API Credentials", keywords: "api key token ingest", icon: "key", group: "Navigate", run: () => navigate("/app/settings/credentials") },
      { id: "acct-profile", label: "Open Profile", keywords: "account user", icon: "account_circle", group: "Account", run: () => navigate("/app/settings/profile") },
      { id: "acct-security", label: "Open Security", keywords: "password mfa session", icon: "shield", group: "Account", run: () => navigate("/app/settings/security") },
      { id: "acct-preferences", label: "Open Preferences", keywords: "appearance notification", icon: "tune", group: "Account", run: () => navigate("/app/settings/preferences") },
      { id: "acct-orgs", label: "Open Organizations", keywords: "membership access invite", icon: "groups", group: "Account", run: () => navigate("/app/settings/organizations") },
      { id: "acct-new-dashboard", label: "New Dashboard", keywords: "create dashboard widget", icon: "add", group: "Account", run: () => navigate("/app/dashboards") },
      { id: "acct-new-project", label: "Create Project", keywords: "new project wizard", icon: "add", group: "Account", run: () => navigate("/app/projects/new") },
      { id: "acct-new-dashboard", label: "New Dashboard", keywords: "create dashboard widget", icon: "add", group: "Account", run: () => navigate("/app/dashboards") },
      { id: "help-shortcuts", label: "Keyboard shortcuts", keywords: "keys cmd ctrl k", icon: "keyboard", group: "Help", run: () => onClose() },
    ],
    [navigate, onClose],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.keywords ?? "").toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && filtered[activeIndex]) {
        e.preventDefault();
        filtered[activeIndex].run();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, activeIndex, onClose]);

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  const groups = Array.from(new Set(filtered.map((c) => c.group)));

  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface shadow-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 border-b border-outline-variant px-4">
          <Icon name="search" className="text-[20px] text-on-surface-variant" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search commands, pages, or resources…"
            className="h-12 flex-1 bg-transparent text-body-md text-on-surface placeholder:text-outline focus:outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div ref={listRef} className="max-h-[45vh] overflow-y-auto p-2">
          {groups.map((group) => (
            <div key={group} className="mb-1">
              <p className="px-2 py-1.5 text-label-caps text-on-surface-variant">{group}</p>
              {filtered
                .filter((c) => c.group === group)
                .map((command) => {
                  const idx = filtered.indexOf(command);
                  return (
                    <button
                      key={command.id}
                      data-active={idx === activeIndex}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => {
                        command.run();
                        onClose();
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded px-2 py-2 text-left transition-colors",
                        idx === activeIndex ? "bg-surface-container-high" : "bg-transparent",
                      )}
                    >
                      <Icon name={command.icon} className="text-[18px] text-on-surface-variant" />
                      <span className="text-body-md text-on-surface">{command.label}</span>
                      {command.hint ? (
                        <span className="ml-auto flex items-center gap-1.5 text-code-sm text-outline">
                          <Kbd>{command.hint}</Kbd>
                        </span>
                      ) : null}
                    </button>
                  );
                })}
            </div>
          ))}
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-body-sm text-on-surface-variant">
              No matching commands
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-4 border-t border-outline-variant bg-surface-container-lowest px-4 py-2 text-code-sm text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd> select
          </span>
        </div>
      </div>
    </div>
  );
}