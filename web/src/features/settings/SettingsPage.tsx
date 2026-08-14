import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/feedback/Toast";

const SETTINGS_SECTIONS = [
  { id: "general", label: "General", icon: "settings" },
  { id: "profile", label: "Profile", icon: "person" },
  { id: "security", label: "Security", icon: "shield" },
  { id: "preferences", label: "Preferences", icon: "tune" },
  { id: "organizations", label: "Organizations", icon: "groups" },
  { id: "credentials", label: "API Credentials", icon: "key" },
] as const;

type SectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

const SECTION_LABELS: Record<SectionId, string> = {
  general: "General",
  profile: "Profile",
  security: "Security",
  preferences: "Preferences",
  organizations: "Organizations",
  credentials: "API Credentials",
};

export function SettingsPage() {
  const [section, setSection] = useState<SectionId>("general");
  const navigate = useNavigate();
  const toast = useToast();

  const [workspaceName, setWorkspaceName] = useState("Production Cluster");
  const [retention, setRetention] = useState("30 days");

  const selectSection = (id: SectionId) => {
    setSection(id);
    const ROUTES: Partial<Record<SectionId, string>> = {
      profile: "/app/settings/profile",
      security: "/app/settings/security",
      preferences: "/app/settings/preferences",
      organizations: "/app/settings/organizations",
      credentials: "/app/settings/credentials",
    };
    if (ROUTES[id]) navigate(ROUTES[id]!);
  };

  return (
    <div className="mx-auto max-w-[1000px] p-container-padding">
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-body-sm text-on-surface-variant">
          <span>Observa</span>
          <Icon name="chevron_right" className="text-[14px]" />
          <span>Settings</span>
        </div>
        <h2 className="text-headline-lg text-on-surface">Settings</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">Workspace configuration for Production Cluster.</p>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        <aside className="col-span-12 lg:col-span-3">
          <nav className="flex flex-col gap-1">
            {SETTINGS_SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectSection(item.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded px-3 py-2 text-left text-body-sm transition-colors",
                  section === item.id
                    ? "bg-surface-container-high text-on-surface"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                )}
              >
                <Icon name={item.icon} className="text-[18px]" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="col-span-12 lg:col-span-9">
          <div className="rounded border border-outline-variant bg-surface">
            <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-4 py-3">
              <h3 className="text-label-caps text-on-surface">{SECTION_LABELS[section]}</h3>
            </div>
            <div className="space-y-5 p-4">
              <div>
                <label className="mb-1.5 block text-label-caps text-on-surface-variant">Workspace Name</label>
                <Input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} className="max-w-sm" />
              </div>

              <div>
                <label className="mb-1.5 block text-label-caps text-on-surface-variant">Data Retention</label>
                <Input value={retention} onChange={(e) => setRetention(e.target.value)} className="max-w-sm" />
                <p className="mt-1.5 text-body-sm text-on-surface-variant">
                  Telemetry older than this period is deleted from hot storage.
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t border-outline-variant pt-4">
                <Button variant="outline">Reset</Button>
                <Button
                  variant="primaryContainer"
                  onClick={() => toast.show("Settings saved.", "success")}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}