import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { AlertSeverity, LogLevel, MemberStatus, ProjectHealth } from "@/types";

/* ------------------------------------------------------------------ */
/* Generic badge                                                       */
/* ------------------------------------------------------------------ */

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "error" | "info";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-variant text-on-surface-variant border border-outline-variant",
  primary: "bg-primary/10 text-primary border border-primary/20",
  success: "bg-success-bg text-success border border-success/20",
  warning: "bg-warning-bg text-warning border border-warning/20",
  error: "bg-error/15 text-error border border-error/30",
  info: "bg-info-bg text-info border border-info/20",
};

interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
  dot?: boolean;
}

export function Badge({ tone = "neutral", className, children, dot = false }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-label-caps",
        BADGE_TONES[tone],
        className,
      )}
    >
      {dot ? <Dot tone={tone} /> : null}
      {children}
    </span>
  );
}

function Dot({ tone }: { tone: BadgeTone }) {
  const color =
    tone === "success"
      ? "bg-success"
      : tone === "warning"
        ? "bg-warning"
        : tone === "error"
          ? "bg-error"
          : tone === "primary"
            ? "bg-primary"
            : tone === "info"
              ? "bg-info"
              : "bg-on-surface-variant";
  return <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", color)} />;
}

/* ------------------------------------------------------------------ */
/* Severity (log levels and alert severities)                          */
/* ------------------------------------------------------------------ */

const LEVEL_STYLES: Record<LogLevel, string> = {
  debug: "bg-surface-container-highest text-on-surface-variant",
  info: "bg-log-info-bg text-log-info-text",
  warn: "bg-log-warn-bg text-log-warn-text",
  error: "bg-log-error-bg text-log-error-text",
};

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  info: "bg-info-bg text-info",
  warning: "bg-warning-bg text-warning",
  error: "bg-error/15 text-error",
  critical: "bg-error/15 text-error",
};

export function SeverityBadge({
  level,
  className,
  label,
}: {
  level: LogLevel | AlertSeverity;
  className?: string;
  label?: string;
}) {
  const isLogLevel = ["debug", "info", "warn"].includes(level) || level === "error";
  const styles = isLogLevel
    ? LEVEL_STYLES[level as LogLevel]
    : SEVERITY_STYLES[level as AlertSeverity];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 font-label-caps",
        styles,
        className,
      )}
    >
      {label ?? level.toUpperCase()}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Entity status                                                       */
/* ------------------------------------------------------------------ */

const PROJECT_STATUS: Record<ProjectHealth, { tone: BadgeTone; icon: string; label: string }> = {
  healthy: { tone: "success", icon: "check_circle", label: "Healthy" },
  warning: { tone: "warning", icon: "warning", label: "Warning" },
  spike: { tone: "error", icon: "error", label: "Spike" },
};

export function ProjectStatusBadge({ status, className }: { status: ProjectHealth; className?: string }) {
  const cfg = PROJECT_STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1 font-body-sm", className)}>
      <IconDot icon={cfg.icon} tone={cfg.tone} />
      <span className={TONE_TEXT[cfg.tone]}>{cfg.label}</span>
    </span>
  );
}

const MEMBER_STATUS: Record<MemberStatus, BadgeTone> = {
  active: "primary",
  pending: "warning",
  invited: "warning",
  deactivated: "neutral",
};

export function MemberStatusBadge({ status, className }: { status: MemberStatus; className?: string }) {
  return (
    <Badge tone={MEMBER_STATUS[status]} dot className={className}>
      {status}
    </Badge>
  );
}

const TONE_TEXT: Record<BadgeTone, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  info: "text-info",
  neutral: "text-on-surface-variant",
};

function IconDot({ icon, tone }: { icon: string; tone: BadgeTone }) {
  return <span className={cn("material-symbols-outlined text-[14px] leading-none", TONE_TEXT[tone])}>{icon}</span>;
}