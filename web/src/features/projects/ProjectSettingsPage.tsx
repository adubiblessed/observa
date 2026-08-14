import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/feedback/Toast";

const MEMBERS = [
  { name: "sarah.j@company.com", icon: "person", role: "Owner", lastActive: "2023-10-24 14:32 UTC" },
  { name: "svc-deploy-bot", icon: "smart_toy", role: "Editor", lastActive: "2023-10-25 09:15 UTC" },
  { name: "dev-team@company.com", icon: "person", role: "Viewer", lastActive: "2023-10-25 10:05 UTC" },
  { name: "alex.m@company.com", icon: "person", role: "Editor", lastActive: "2023-10-21 16:44 UTC" },
];

const ROLE_TONES: Record<string, string> = {
  Owner: "text-error",
  Editor: "text-primary",
  Viewer: "text-on-surface-variant",
};

function RetentionField({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-label-caps text-on-surface-variant">{label}</label>
      <div className="flex items-center gap-2">
        <Input type="number" value={value} className="w-24" onChange={() => {}} />
        <span className="font-label text-[11px] text-on-surface-variant">{unit}</span>
      </div>
    </div>
  );
}

export function ProjectSettingsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState("production-api");
  const [desc, setDesc] = useState("Core API gateway for production microservices cluster. Handles all external client routing.");

  return (
    <div className="mx-auto max-w-[880px] flex h-full flex-col gap-gutter overflow-y-auto p-container-padding">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-body-sm text-on-surface-variant">
            <button type="button" onClick={() => navigate("/app/projects")} className="hover:text-primary">
              Projects
            </button>
            <Icon name="chevron_right" className="text-[14px]" />
            <span className="text-on-surface">{name}</span>
          </div>
          <h2 className="text-headline-lg text-on-surface">Project Settings Configuration</h2>
        </div>
        <Button variant="primary" leadingIcon="save" onClick={() => toast.show("Project settings saved.", "success")}>
          Save Changes
        </Button>
      </div>

      {/* General Identity */}
      <section className="rounded border border-outline-variant bg-surface p-4">
        <h3 className="mb-4 flex items-center gap-2 text-label-caps text-on-surface-variant">
          <Icon name="tune" className="text-[18px] text-primary" />
          General Identity
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-label-caps text-on-surface-variant">Project Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm" />
          </div>
          <div>
            <label className="mb-1.5 block text-label-caps text-on-surface-variant">Description</label>
            <textarea
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="max-w-xl w-full resize-none rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-body-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-label-caps text-on-surface-variant">Project ID (Immutable)</label>
            <div className="flex max-w-sm items-center gap-2">
              <Input value="prj_prod_api_88f2a9x" readOnly />
              <button
                type="button"
                aria-label="Copy project ID"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-outline-variant text-on-surface-variant transition-colors hover:text-primary"
                onClick={() => toast.show("Project ID copied.", "success")}
              >
                <Icon name="content_copy" className="text-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Data retention */}
      <section className="rounded border border-outline-variant bg-surface p-4">
        <h3 className="mb-4 flex items-center gap-2 text-label-caps text-on-surface-variant">
          <Icon name="database" className="text-[18px] text-secondary" />
          Data Retention
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <RetentionField label="Log Events" value={30} unit="DAYS" />
          <RetentionField label="Metrics" value={90} unit="DAYS" />
          <RetentionField label="Traces" value={15} unit="DAYS" />
        </div>
      </section>

      {/* Alert routing */}
      <section className="rounded border border-outline-variant bg-surface p-4">
        <h3 className="mb-4 flex items-center gap-2 text-label-caps text-on-surface-variant">
          <Icon name="notifications_active" className="text-[18px] text-warning" />
          Alert Routing
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-label-caps text-on-surface-variant">PagerDuty</label>
            <Input value="prod-oncall" />
          </div>
          <div>
            <label className="mb-1.5 block text-label-caps text-on-surface-variant">Slack</label>
            <Input value="#api-alerts" />
          </div>
        </div>
      </section>

      {/* Access control */}
      <section className="flex flex-col overflow-hidden rounded border border-outline-variant bg-surface">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-4 py-2.5">
          <h3 className="flex items-center gap-2 text-label-caps text-on-surface">
            <Icon name="admin_panel_settings" className="text-[18px]" />
            Access Control
          </h3>
          <Button variant="primaryContainer" size="sm" leadingIcon="person_add" onClick={() => toast.show("Add member flow opened.", "neutral")}>
            Add Member
          </Button>
        </div>
        <div className="custom-scrollbar overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="h-8 border-b border-outline-variant bg-surface-container-lowest text-label-caps text-on-surface-variant">
                <th className="px-4 font-normal">Identity / Email</th>
                <th className="px-4 font-normal">Role</th>
                <th className="px-4 font-normal">Last Active</th>
                <th className="px-4 text-right font-normal">Actions</th>
              </tr>
            </thead>
            <tbody className="font-body-sm">
              {MEMBERS.map((m) => (
                <tr key={m.name} className="h-table-row-height border-b border-outline-variant/40 last:border-b-0">
                  <td className="px-4 text-on-surface">
                    <span className="flex items-center gap-2">
                      <Icon name={m.icon} className="text-[16px] text-on-surface-variant" />
                      {m.name}
                    </span>
                  </td>
                  <td className={cn("px-4 font-medium", ROLE_TONES[m.role])}>{m.role}</td>
                  <td className="px-4 font-code-sm text-on-surface-variant">{m.lastActive}</td>
                  <td className="px-4 text-right">
                    <button type="button" aria-label={`Actions for ${m.name}`} className="text-on-surface-variant transition-colors hover:text-on-surface">
                      <Icon name="more_vert" className="text-[20px]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}