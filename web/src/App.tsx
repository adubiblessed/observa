import { Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "@/components/feedback/Toast";
import { AppLayout } from "@/layouts/AppLayout";
import { LandingPage } from "@/features/landing/LandingPage";
import { OverviewPage } from "@/features/overview/OverviewPage";
import { LogsPage } from "@/features/logs/LogsPage";
import { TracesPage } from "@/features/traces/TracesPage";
import { TraceDetailPage } from "@/features/traces/TraceDetailPage";
import { MetricsPage } from "@/features/metrics/MetricsPage";
import { AlertsPage } from "@/features/alerts/AlertsPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { ProjectDetailPage } from "@/features/projects/ProjectDetailPage";
import { ProjectSettingsPage } from "@/features/projects/ProjectSettingsPage";
import { CreateProjectPage } from "@/features/projects/CreateProjectPage";
import { TeamsPage } from "@/features/teams/TeamsPage";
import { TeamDetailPage } from "@/features/teams/TeamDetailPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { CredentialsPage } from "@/features/settings/CredentialsPage";
import { ProfileSettingsPage } from "@/features/settings/ProfileSettingsPage";
import { SecuritySettingsPage } from "@/features/settings/SecuritySettingsPage";
import { PreferencesPage } from "@/features/settings/PreferencesPage";
import { OrganizationsPage } from "@/features/settings/OrganizationsPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="/app/dashboards" replace />} />
          <Route path="dashboards" element={<OverviewPage />} />
          <Route path="overview" element={<Navigate to="/app/dashboards" replace />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="traces" element={<TracesPage />} />
          <Route path="traces/:traceId" element={<TraceDetailPage />} />
          <Route path="metrics" element={<MetricsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/new" element={<CreateProjectPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="projects/:projectId/settings" element={<ProjectSettingsPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="teams/:teamId" element={<TeamDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/credentials" element={<CredentialsPage />} />
          <Route path="settings/profile" element={<ProfileSettingsPage />} />
          <Route path="settings/security" element={<SecuritySettingsPage />} />
          <Route path="settings/preferences" element={<PreferencesPage />} />
          <Route path="settings/organizations" element={<OrganizationsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}