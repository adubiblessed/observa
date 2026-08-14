/**
 * Typed API resource functions.
 *
 * Each method mirrors a backend route in `observa/server/**`. When the
 * `VITE_USE_MOCK` environment flag is unset/true, methods resolve with
 * deterministic sample data so the UI works without a running backend.
 * Set `VITE_USE_MOCK=false` to hit the live FastAPI service.
 */

import type {
  AlertIncident,
  AlertRule,
  Credential,
  LogEntry,
  LogQuery,
  MetricQuery,
  MetricSeries,
  Project,
  ProjectDetail,
  ProjectSummary,
  SystemEvent,
  Team,
  TeamMember,
  Trace,
} from "@/types";
import { http } from "./http";
import {
  generateAlerts,
  generateCredentials,
  generateLogs,
  generateMetricSeries,
  generateProjects,
  generateSystemEvents,
  generateTeamMembers,
  generateTeams,
  generateTraces,
} from "../mock-data";

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

function delay(ms = 140): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ListResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export const api = {
  async listLogs(query: LogQuery = {}): Promise<ListResult<LogEntry>> {
    if (USE_MOCK) {
      await delay();
      let items = generateLogs();
      if (query.levels?.length) items = items.filter((l) => query.levels?.includes(l.level));
      if (query.services?.length) items = items.filter((l) => query.services?.includes(l.service));
      if (query.query) {
        const needle = query.query.toLowerCase();
        items = items.filter(
          (l) =>
            l.message.toLowerCase().includes(needle) ||
            l.service.toLowerCase().includes(needle) ||
            l.traceId?.toLowerCase().includes(needle),
        );
      }
      return { items, total: items.length, offset: 0, limit: items.length };
    }
    const params = new URLSearchParams();
    if (query.query) params.set("query", query.query);
    return http.get<ListResult<LogEntry>>(`/v1/logs?${params.toString()}`);
  },

  async listMetrics(query: MetricQuery): Promise<MetricSeries[]> {
    if (USE_MOCK) {
      await delay();
      return generateMetricSeries();
    }
    const params = new URLSearchParams({ expr: query.expr });
    return http.get<MetricSeries[]>(`/v1/metrics/query?${params.toString()}`);
  },

  async listTraces(): Promise<ListResult<Trace>> {
    if (USE_MOCK) {
      await delay();
      const items = generateTraces();
      return { items, total: items.length, offset: 0, limit: items.length };
    }
    return http.get<ListResult<Trace>>("/v1/traces");
  },

  async getTrace(traceId: string): Promise<Trace> {
    if (USE_MOCK) {
      await delay(60);
      const trace = generateTraces().find((t) => t.id === traceId);
      if (!trace) throw new Error(`trace not found: ${traceId}`);
      return trace;
    }
    return http.get<Trace>(`/v1/traces/${traceId}`);
  },

  async listProjects(): Promise<ListResult<ProjectSummary>> {
    if (USE_MOCK) {
      await delay();
      const items = generateProjects();
      return { items, total: items.length, offset: 0, limit: items.length };
    }
    return http.get<ListResult<ProjectSummary>>("/v1/project");
  },

  async getProject(projectId: string): Promise<ProjectDetail> {
    if (USE_MOCK) {
      await delay(60);
      const summary = generateProjects().find((p) => p.id === projectId);
      if (!summary) throw new Error(`project not found: ${projectId}`);
      const project: Project = {
        id: summary.id,
        name: summary.name,
        slug: summary.slug,
        public: true,
        status: 1,
        platform: summary.platform,
        firstEvent: "2023-10-12T00:00:00Z",
        createdAt: summary.createdAt,
        modifiedAt: summary.lastActivity,
      };
      return { ...project, summary, health: summary.status };
    }
    return http.get<ProjectDetail>(`/v1/project/${projectId}`);
  },

  async listTeams(): Promise<ListResult<Team>> {
    if (USE_MOCK) {
      await delay();
      const items = generateTeams();
      return { items, total: items.length, offset: 0, limit: items.length };
    }
    return http.get<ListResult<Team>>("/api/teams");
  },

  async getTeam(teamId: string): Promise<Team> {
    if (USE_MOCK) {
      await delay(60);
      const team = generateTeams().find((t) => t.id === teamId);
      if (!team) throw new Error(`team not found: ${teamId}`);
      return team;
    }
    return http.get<Team>(`/api/teams/${teamId}`);
  },

  async listTeamMembers(teamId: string): Promise<ListResult<TeamMember>> {
    if (USE_MOCK) {
      await delay();
      const items = generateTeamMembers(teamId);
      return { items, total: items.length, offset: 0, limit: items.length };
    }
    return http.get<ListResult<TeamMember>>(`/api/teams/${teamId}/members`);
  },

  async listAlerts(): Promise<{ incidents: AlertIncident[]; rules: AlertRule[] }> {
    if (USE_MOCK) {
      await delay();
      return generateAlerts();
    }
    return http.get<{ incidents: AlertIncident[]; rules: AlertRule[] }>("/v1/alerts");
  },

  async listSystemEvents(): Promise<SystemEvent[]> {
    if (USE_MOCK) {
      await delay(80);
      return generateSystemEvents();
    }
    return http.get<SystemEvent[]>("/v1/events");
  },

  async listCredentials(): Promise<ListResult<Credential>> {
    if (USE_MOCK) {
      await delay();
      const items = generateCredentials();
      return { items, total: items.length, offset: 0, limit: items.length };
    }
    return http.get<ListResult<Credential>>("/v1/credentials");
  },
};