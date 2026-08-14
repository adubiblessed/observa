/**
 * Shared domain types for the Observa web application.
 *
 * These mirror the backend API contracts (see `observa/server/**` Pydantic
 * schemas) plus the UI-facing shapes produced by the mock/data layer.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  /** Optional multi-line raw payload (stack trace, etc.). */
  rawMessage?: string;
  host: string;
  pod: string;
  traceId: string | null;
  spanId: string | null;
  /** Structured key/value metadata attached to the event. */
  attributes: Record<string, string | number | boolean>;
  projectId: string;
}

export interface LogQuery {
  query?: string;
  levels?: LogLevel[];
  services?: string[];
  env?: string;
  host?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface Span {
  spanId: string;
  traceId: string;
  parentSpanId: string | null;
  service: string;
  operation: string;
  kind: string;
  startTime: string;
  /** Duration in milliseconds. */
  durationMs: number;
  status: "ok" | "error";
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];
}

export interface SpanEvent {
  name: string;
  timestamp: string;
  attributes: Record<string, string | number | boolean>;
}

export interface Trace {
  id: string;
  startTime: string;
  durationMs: number;
  services: string[];
  status: "ok" | "error";
  spanCount: number;
  rootOperation: string;
  rootService: string;
  spans: Span[];
}

export type MetricLabel = Record<string, string>;

export interface MetricPoint {
  timestamp: string;
  value: number;
}

export interface MetricSeries {
  metric: string;
  labels: MetricLabel;
  unit: string;
  points: MetricPoint[];
}

export interface MetricQuery {
  expr: string;
  from?: string;
  to?: string;
  step?: number;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  public: boolean;
  status: number;
  platform: string | null;
  firstEvent: string | null;
  createdAt: string;
  modifiedAt: string | null;
}

export type ProjectHealth = "healthy" | "warning" | "spike";

export interface ProjectDetail extends Project {
  summary: ProjectSummary;
  health: ProjectHealth;
}

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  environment: "Production" | "Staging" | "Development";
  telemetryVolGbPerDay: number;
  ingestRate: string;
  status: ProjectHealth;
  createdAt: string;
  lastActivity: string;
  platform: string | null;
}

export type TeamRole = "lead" | "admin" | "editor" | "viewer";
export type MemberStatus = "active" | "pending" | "invited" | "deactivated";

export interface TeamMemberUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  status: MemberStatus;
  joinedAt: string;
  user: TeamMemberUser;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: number;
  memberCount: number;
  projectCount: number;
  createdAt: string;
  modifiedAt: string | null;
}

export type AlertSeverity = "critical" | "warning" | "error" | "info";
export type AlertState = "firing" | "acknowledged" | "resolved";
export type AlertRuleStatus = "active" | "disabled";

export interface AlertIncident {
  id: string;
  name: string;
  severity: AlertSeverity;
  source: string;
  firedAt: string;
  state: AlertState;
  project: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  expr: string;
  frequency: string;
  channels: string[];
  status: AlertRuleStatus;
  severity: AlertSeverity;
}

export interface SystemEvent {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  detail: string;
  actor: string;
}

export interface Credential {
  id: string;
  name: string;
  keyId: string;
  type: "ingestion" | "api";
  status: "active" | "revoked";
  createdAt: string;
  lastUsedAt: string | null;
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: "metrics" | "sparkline" | "table" | "events";
  span: number;
  subtitle?: string;
}

export interface KpiMetric {
  id: string;
  label: string;
  value: string;
  delta?: string;
  tone: "neutral" | "primary" | "warning" | "error";
  icon: string;
}

export interface TimeRange {
  label: string;
  from: string;
  to: string;
}