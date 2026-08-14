/**
 * Deterministic sample data used by the UI until the live API is wired up.
 *
 * Every generator is seeded so renders are stable across reloads and tests.
 * Content mirrors the reference interface: real-looking service names,
 * traces, and incidents — no invented company statistics.
 */

import { mulberry32 } from "./format";
import type {
  AlertIncident,
  AlertRule,
  Credential,
  LogEntry,
  LogLevel,
  MetricSeries,
  ProjectSummary,
  Span,
  SystemEvent,
  Team,
  TeamMember,
  Trace,
} from "@/types";

const SERVICES = [
  "auth-service",
  "api-gateway",
  "database-cluster",
  "payment-gateway",
  "cache-node-02",
  "inventory-sync-worker",
  "notification-service",
  "frontend-client-app",
  "search-indexer",
  "webhook-dispatcher",
];

const HOSTS = [
  "db-node-primary-us-east-1a",
  "web-node-worker-us-east-1b",
  "cache-node-us-west-1a",
  "api-node-prod-us-east-1a",
  "worker-pool-a-node-03",
];

const PODS = [
  "auth-service-85bc5f897-k9m2j",
  "api-gateway-7d8f9c4b2-l4p3q",
  "database-cluster-85bc5f897-k9m2j",
  "payment-gateway-f8e7d6c5b-r7s8t",
  "cache-node-02-2a3b4c5d6-v4w5x",
];

const TRACE_IDS = [
  "5b8a9c2d1e4f6a7b8c9d0e1f2a3b4c5d",
  "a1f3b2c4d5e6f7a8b9c0d1e2f3a4b5c6",
  "9c8d7e6f5a4b3c2d1e0f1a2b3c4d5e6f",
  "f0e1d2c3b4a5968778695a4b3c2d1e0f",
  "3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e",
];

function iso(offsetMs: number): string {
  return new Date(Date.now() - offsetMs).toISOString();
}

const LEVELS: LogLevel[] = ["info", "info", "info", "warn", "error", "debug"];

const LOG_MESSAGES: Record<LogLevel, string[]> = {
  info: [
    "User authentication successful for user_id: {n}",
    "Transaction {tx} processing started",
    "Eviction policy triggered, cleared {n}MB of stale keys",
    "Batch job completed in {t}s",
    "Service restarted successfully",
    "Cache hit ratio stable at {n}%",
    "Replica lag within acceptable bounds ({t}ms)",
    "Message acknowledged by consumer group",
  ],
  warn: [
    "High latency detected in {path} endpoint ({t}ms)",
    "High memory usage on {host}",
    "Connection pool utilization above 80%",
    "Retry budget nearly exhausted for {svc}",
    "Disk usage exceeds warning threshold ({n}%)",
    "Slow query detected (>{t}ms) on table {tbl}",
  ],
  error: [
    "Connection timeout parsing query for table '{tbl}'",
    "Failed to validate JWT token: signature invalid",
    "Upstream service returned 5xx after {n} retries",
    "Deadlock detected between transactions {a} and {b}",
    "Kafka consumer lag exceeded {n} partitions threshold",
    "Certificate expired for endpoint {path}",
  ],
  debug: [
    "Context propagation completed trace={trace}",
    "Resolved configuration key={key}",
    "Span attributes serialized for {svc}",
  ],
};

const PATHS = [
  "/api/v1/data",
  "/api/v1/checkout/process",
  "/v1/checkout/process",
  "/api/v1/config",
  "/v1/auth/login",
  "/v1/users/me",
];

const TABLES = ["metrics_rollup", "events_partitioned", "user_profiles", "orders"];

export function generateLogs(count = 120): LogEntry[] {
  const rand = mulberry32(1337);
  const logs: LogEntry[] = [];
  for (let i = 0; i < count; i++) {
    const level = LEVELS[Math.floor(rand() * LEVELS.length)];
    const service = SERVICES[Math.floor(rand() * SERVICES.length)];
    const template =
      LOG_MESSAGES[level][Math.floor(rand() * LOG_MESSAGES[level].length)];
    const payload = {
      n: Math.floor(rand() * 10_000),
      t: (rand() * 900 + 50).toFixed(0),
      tx: `tx_${Math.floor(rand() * 100_000)}`,
      host: HOSTS[Math.floor(rand() * HOSTS.length)],
      svc: service,
      path: PATHS[Math.floor(rand() * PATHS.length)],
      tbl: TABLES[Math.floor(rand() * TABLES.length)],
      trace: TRACE_IDS[Math.floor(rand() * TRACE_IDS.length)],
      key: `feature.${service}.enabled`,
      a: Math.floor(rand() * 1000),
      b: Math.floor(rand() * 1000),
    };
    const message = template.replace(/\{(\w+)\}/g, (_, k: string) =>
      String((payload as Record<string, unknown>)[k]),
    );

    const attributes: Record<string, string | number | boolean> = {
      query_hash: `q_${Math.floor(rand() * 0xffffff).toString(16)}`,
      connection_pool_size: 100,
      active_connections: Math.floor(rand() * 40 + 58),
      wait_time_ms: Math.floor(rand() * 200),
    };
    if (rand() > 0.5) {
      attributes.partition = `p2023_10`;
      attributes.region = ["us-east-1", "eu-west-1"][Math.floor(rand() * 2)];
    }

    logs.push({
      id: `log_${String(i).padStart(4, "0")}`,
      timestamp: iso(i * 2500),
      level,
      service,
      message,
      rawMessage:
        level === "error" && rand() > 0.6
          ? `${message}\n    at org.postgresql.core.v3.QueryExecutorImpl.receiveErrorResponse(QueryExecutorImpl.java:2440)\n    at com.observa.DataSource.execute(DataSource.java:118)`
          : undefined,
      host: HOSTS[Math.floor(rand() * HOSTS.length)],
      pod: PODS[Math.floor(rand() * PODS.length)],
      traceId: rand() > 0.35 ? TRACE_IDS[Math.floor(rand() * TRACE_IDS.length)] : null,
      spanId: rand() > 0.35 ? `span_${Math.floor(rand() * 0xffffff).toString(16)}` : null,
      attributes,
      projectId: `prj_${Math.floor(rand() * 9)}`,
    });
  }
  return logs.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

export function generateMetricSeries(): MetricSeries[] {
  const pointsFor = (seed: number, base: number, volatility: number) => {
    const r = mulberry32(seed);
    const points = [];
    for (let i = 0; i < 40; i++) {
      const value = base + (r() - 0.5) * 2 * volatility;
      points.push({ timestamp: iso((39 - i) * 15_000), value: Math.max(0, value) });
    }
    return points;
  };
  return [
    {
      metric: "http_requests_total",
      unit: "ops/s",
      labels: { job: "api-server", status: "5xx" },
      points: pointsFor(1, 80, 25),
    },
    {
      metric: "http_requests_total",
      unit: "ops/s",
      labels: { job: "api-server", region: "eu-west-1" },
      points: pointsFor(2, 55, 20),
    },
    {
      metric: "p99_latency",
      unit: "ms",
      labels: { service: "payment-gateway" },
      points: pointsFor(3, 140, 35),
    },
  ];
}

function buildSpanTree(traceId: string, service: string, seed: number): Span[] {
  const rand = mulberry32(seed);
  const spans: Span[] = [];
  const now = Date.now();
  const rootStart = now - 80_000;

  const push = (
    spanId: string,
    parentSpanId: string | null,
    svc: string,
    operation: string,
    kind: string,
    startMs: number,
    durationMs: number,
    status: "ok" | "error" = "ok",
  ) => {
    spans.push({
      spanId,
      traceId,
      parentSpanId,
      service: svc,
      operation,
      kind,
      startTime: new Date(rootStart + startMs).toISOString(),
      durationMs,
      status,
      attributes: {
        "http.method": kind === "server" ? operation.split(" ")[0] ?? "" : "",
        "http.route": operation.split(" ")[1] ?? "",
        component: svc,
      },
      events: [],
    });
  };

  const total = 30_000 + rand() * 40_000;
  push("s_root", null, service, "GET /api/v1/checkout/process", "server", 0, total);
  push("s_auth", "s_root", "auth-service", "auth.validate", "client", 1200, 1500 + rand() * 2000);
  push("s_psp", "s_root", "payment-gateway", "psp.authorize", "client", 4000, 12_000 + rand() * 15_000);
  const dbDuration = 20_000 + rand() * 15_000;
  push("s_db", "s_psp", "database-cluster", "db.query orders", "client", 6000, dbDuration);
  if (rand() > 0.6) {
    push("s_cache", "s_psp", "cache-node-02", "cache.get order", "client", 6200, 800);
  }
  if (rand() > 0.5) {
    push("s_err", "s_root", "api-gateway", "rate_limiter.check", "internal", 1500, 300);
  }
  const root = spans.find((s) => s.spanId === "s_root");
  if (root) root.events.push({ name: "http.response", timestamp: root.startTime, attributes: { status_code: 200 } });
  return spans;
}

export function generateTraces(count = 60): Trace[] {
  const rand = mulberry32(4242);
  const traces: Trace[] = [];
  for (let i = 0; i < count; i++) {
    const service = SERVICES[Math.floor(rand() * SERVICES.length)];
    const id = TRACE_IDS[i % TRACE_IDS.length];
    const status: "ok" | "error" = rand() > 0.75 ? "error" : "ok";
    const spans = buildSpanTree(id, service, 9000 + i);
    const total = spans[0]?.durationMs ?? 20_000;
    const services = new Set(spans.map((s) => s.service));
    traces.push({
      id,
      startTime: iso(i * 30_000 + 60_000),
      durationMs: total,
      services: Array.from(services),
      status,
      spanCount: spans.length,
      rootOperation: spans[0]?.operation ?? "unknown",
      rootService: service,
      spans,
    });
  }
  return traces;
}

export function generateProjects(): ProjectSummary[] {
  return [
    {
      id: "prj_9942",
      name: "auth-service-core",
      slug: "auth-service-core",
      environment: "Production",
      telemetryVolGbPerDay: 145.2,
      ingestRate: "4,210 logs/s",
      status: "healthy",
      createdAt: "2023-10-12T00:00:00Z",
      lastActivity: iso(2 * 60_000),
      platform: "python",
    },
    {
      id: "prj_8817",
      name: "payment-gateway-v2",
      slug: "payment-gateway-v2",
      environment: "Staging",
      telemetryVolGbPerDay: 8.4,
      ingestRate: "120 logs/s",
      status: "warning",
      createdAt: "2023-11-05T00:00:00Z",
      lastActivity: iso(15 * 60_000),
      platform: "go",
    },
    {
      id: "prj_7701",
      name: "inventory-sync-worker",
      slug: "inventory-sync-worker",
      environment: "Production",
      telemetryVolGbPerDay: 892.1,
      ingestRate: "18,500 logs/s",
      status: "spike",
      createdAt: "2023-08-22T00:00:00Z",
      lastActivity: iso(30_000),
      platform: "python",
    },
    {
      id: "prj_6602",
      name: "frontend-client-app",
      slug: "frontend-client-app",
      environment: "Production",
      telemetryVolGbPerDay: 45.0,
      ingestRate: "850 logs/s",
      status: "healthy",
      createdAt: "2023-01-15T00:00:00Z",
      lastActivity: iso(60 * 60_000),
      platform: "javascript",
    },
    {
      id: "prj_5519",
      name: "search-indexer",
      slug: "search-indexer",
      environment: "Production",
      telemetryVolGbPerDay: 210.7,
      ingestRate: "3,900 logs/s",
      status: "healthy",
      createdAt: "2023-06-01T00:00:00Z",
      lastActivity: iso(25 * 60_000),
      platform: "rust",
    },
    {
      id: "prj_4410",
      name: "webhook-dispatcher",
      slug: "webhook-dispatcher",
      environment: "Development",
      telemetryVolGbPerDay: 0.6,
      ingestRate: "12 logs/s",
      status: "warning",
      createdAt: "2024-02-11T00:00:00Z",
      lastActivity: iso(3 * 60 * 60_000),
      platform: "node",
    },
  ];
}

const TEAM_ROLE_COLOR: Record<string, string> = {};
void TEAM_ROLE_COLOR;

export function generateTeams(): Team[] {
  return [
    {
      id: "t_inf_sre_092",
      name: "Infrastructure SRE",
      slug: "infrastructure-sre",
      description:
        "Responsible for the reliability, scaling, and maintenance of core Kubernetes clusters and networking infrastructure globally.",
      status: 1,
      memberCount: 24,
      projectCount: 8,
      createdAt: "2022-10-15T00:00:00Z",
      modifiedAt: iso(86_400_000),
    },
    {
      id: "t_data_eng_118",
      name: "Data Engineering",
      slug: "data-engineering",
      description: "Pipelines, data lakes, and streaming architectures.",
      status: 1,
      memberCount: 8,
      projectCount: 3,
      createdAt: "2023-04-02T00:00:00Z",
      modifiedAt: iso(3 * 86_400_000),
    },
    {
      id: "t_frontend_204",
      name: "Frontend Platform",
      slug: "frontend-platform",
      description: "Web applications, UI components, and BFF APIs.",
      status: 1,
      memberCount: 24,
      projectCount: 15,
      createdAt: "2023-01-09T00:00:00Z",
      modifiedAt: iso(86_400_000),
    },
    {
      id: "t_security_ops_077",
      name: "Security Ops",
      slug: "security-ops",
      description: "Compliance monitoring, IAM, and vulnerability scanning.",
      status: 1,
      memberCount: 5,
      projectCount: 2,
      createdAt: "2023-09-21T00:00:00Z",
      modifiedAt: iso(6 * 86_400_000),
    },
  ];
}

export function generateTeamMembers(teamId: string): TeamMember[] {
  const base: Array<{
    role: TeamMember["role"];
    status: TeamMember["status"];
    joinedAt: string;
    user: TeamMember["user"];
  }> = [
    {
      role: "lead",
      status: "active",
      joinedAt: "2022-10-15T00:00:00Z",
      user: { id: "u_1", email: "sarah.j@observa.com", firstName: "Sarah", lastName: "Jenkins", avatarUrl: null },
    },
    {
      role: "admin",
      status: "active",
      joinedAt: "2023-01-22T00:00:00Z",
      user: { id: "u_2", email: "m.chen@observa.com", firstName: "Marcus", lastName: "Chen", avatarUrl: null },
    },
    {
      role: "editor",
      status: "pending",
      joinedAt: "2023-11-05T00:00:00Z",
      user: { id: "u_3", email: "aisha.k@observa.com", firstName: "Aisha", lastName: "Khan", avatarUrl: null },
    },
    {
      role: "viewer",
      status: "active",
      joinedAt: "2021-08-14T00:00:00Z",
      user: { id: "u_4", email: "d.torres@observa.com", firstName: "David", lastName: "Torres", avatarUrl: null },
    },
    {
      role: "viewer",
      status: "active",
      joinedAt: "2023-03-30T00:00:00Z",
      user: { id: "u_5", email: "l.martinez@observa.com", firstName: "Lena", lastName: "Martinez", avatarUrl: null },
    },
    {
      role: "editor",
      status: "deactivated",
      joinedAt: "2022-05-18T00:00:00Z",
      user: { id: "u_6", email: "p.okafor@observa.com", firstName: "Peter", lastName: "Okafor", avatarUrl: null },
    },
  ];
  return base.map((m, i) => ({
    id: `tm_${teamId}_${i}`,
    teamId,
    userId: m.user.id,
    role: m.role,
    status: m.status,
    joinedAt: m.joinedAt,
    user: m.user,
  }));
}

export function generateAlerts(): { incidents: AlertIncident[]; rules: AlertRule[] } {
  return {
    incidents: [
      {
        id: "al_001",
        name: "Database Connection Pool Exhausted",
        severity: "critical",
        source: "svc-postgres-primary",
        firedAt: iso(2 * 60_000 + 14_000),
        state: "firing",
        project: "auth-service-core",
      },
      {
        id: "al_002",
        name: "High Memory Usage Detected",
        severity: "warning",
        source: "node-worker-04",
        firedAt: iso(15 * 60_000 + 30_000),
        state: "firing",
        project: "inventory-sync-worker",
      },
      {
        id: "al_003",
        name: "API Latency Spike (>500ms)",
        severity: "warning",
        source: "gateway-service",
        firedAt: iso(60 * 60_000 + 4 * 60_000),
        state: "firing",
        project: "payment-gateway-v2",
      },
      {
        id: "al_004",
        name: "Elevated 5xx Responses",
        severity: "warning",
        source: "api-gateway",
        firedAt: iso(2 * 60_000),
        state: "acknowledged",
        project: "auth-service-core",
      },
      {
        id: "al_005",
        name: "Kafka Lag Increasing",
        severity: "warning",
        source: "search-indexer",
        firedAt: iso(60_000),
        state: "resolved",
        project: "search-indexer",
      },
      {
        id: "al_006",
        name: "Certificate Expiring",
        severity: "info",
        source: "gateway-service",
        firedAt: iso(3 * 60 * 60_000),
        state: "resolved",
        project: "payment-gateway-v2",
      },
    ],
    rules: [
      {
        id: "ar_01",
        name: "CPU Usage Critical",
        expr: "avg(cpu) > 90%",
        condition: "> 90%",
        frequency: "1m",
        channels: ["slack", "pagerduty"],
        status: "active",
        severity: "critical",
      },
      {
        id: "ar_02",
        name: "Disk Space Warning",
        expr: "disk_free < 15%",
        condition: "< 15%",
        frequency: "5m",
        channels: ["slack"],
        status: "active",
        severity: "warning",
      },
      {
        id: "ar_03",
        name: "OOM Kills",
        expr: "rate(oom_kills)[5m] > 0",
        condition: "> 0",
        frequency: "1m",
        channels: ["pagerduty"],
        status: "disabled",
        severity: "critical",
      },
      {
        id: "ar_04",
        name: "P95 Latency Breach",
        expr: "p95(http_request_duration) > 500ms",
        condition: "> 500ms",
        frequency: "2m",
        channels: ["slack"],
        status: "active",
        severity: "warning",
      },
    ],
  };
}

export function generateSystemEvents(): SystemEvent[] {
  return [
    {
      id: "ev_1",
      timestamp: iso(15 * 60_000),
      type: "config",
      message: "ConfigMap Updated:",
      detail: "api-gateway-config",
      actor: "user: ops-admin",
    },
    {
      id: "ev_2",
      timestamp: iso(18 * 60_000),
      type: "deploy",
      message: "Deployment Rolled Out:",
      detail: "payment-service-v2.1.0",
      actor: "sys: ci-cd",
    },
    {
      id: "ev_3",
      timestamp: iso(22 * 60_000),
      type: "infra",
      message: "Node Autoscaling Triggered:",
      detail: "+2 nodes added to worker-pool-a",
      actor: "sys: cluster-autoscaler",
    },
    {
      id: "ev_4",
      timestamp: iso(30 * 60_000),
      type: "security",
      message: "IAM Role Rotation:",
      detail: "roles/ingest-agent rotated",
      actor: "user: ops-admin",
    },
    {
      id: "ev_5",
      timestamp: iso(45 * 60_000),
      type: "deploy",
      message: "Canary Released:",
      detail: "webhook-dispatcher@0.4.1",
      actor: "sys: ci-cd",
    },
  ];
}

export function generateCredentials(): Credential[] {
  return [
    {
      id: "ck_1",
      name: "prod-ingest-eu-west",
      keyId: "obs_ik_a8f92...jkl3",
      type: "ingestion",
      status: "active",
      createdAt: "2023-10-12T00:00:00Z",
      lastUsedAt: iso(2 * 60_000),
    },
    {
      id: "ck_2",
      name: "ci-cd-automation",
      keyId: "obs_ak_m4x21...pqr9",
      type: "api",
      status: "active",
      createdAt: "2023-09-28T00:00:00Z",
      lastUsedAt: iso(60 * 60_000),
    },
    {
      id: "ck_3",
      name: "legacy-ingest-us-east",
      keyId: "obs_ik_z9y87...abc1",
      type: "ingestion",
      status: "revoked",
      createdAt: "2023-01-15T00:00:00Z",
      lastUsedAt: "2023-10-10T00:00:00Z",
    },
    {
      id: "ck_4",
      name: "grafana-proxy",
      keyId: "obs_ak_2d8f0...mn4z",
      type: "api",
      status: "active",
      createdAt: "2024-01-05T00:00:00Z",
      lastUsedAt: iso(5 * 60_000),
    },
  ];
}