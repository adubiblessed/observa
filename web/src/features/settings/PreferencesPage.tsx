import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/feedback/Toast";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={checked ? "relative h-6 w-11 rounded-full bg-primary transition-colors" : "relative h-6 w-11 rounded-full bg-surface-container-high transition-colors"}
    >
      <span
        className={checked ? "absolute top-0.5 left-5 h-5 w-5 rounded-full bg-on-primary transition-all" : "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-on-surface-variant transition-all"}
      />
    </button>
  );
}

export function PreferencesPage() {
  const toast = useToast();
  const [appearance, setAppearance] = useState<"dark" | "light" | "system">("dark");
  const [slack, setSlack] = useState(true);
  const [emailDigest, setEmailDigest] = useState(true);
  const [webhook, setWebhook] = useState(false);

  const appearanceOptions: Array<{ value: typeof appearance; label: string; hint: string }> = [
    { value: "dark", label: "Dark", hint: "Default" },
    { value: "light", label: "Light", hint: "Beta" },
    { value: "system", label: "System", hint: "" },
  ];

  return (
    <div className="mx-auto max-w-[820px] flex h-full flex-col gap-gutter overflow-y-auto p-container-padding">
      <div>
        <h2 className="text-headline-lg text-on-surface">Preferences</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">Customize the appearance, regional settings, and notification routing for your account.</p>
      </div>

      {/* Appearance */}
      <section className="rounded border border-outline-variant bg-surface p-4">
        <h3 className="mb-3 text-label-caps text-on-surface-variant">Appearance</h3>
        <div className="grid grid-cols-3 gap-3">
          {appearanceOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAppearance(opt.value)}
              className={
                appearance === opt.value
                  ? "rounded border-2 border-primary bg-primary-container/20 px-3 py-3 text-left"
                  : "rounded border border-outline-variant px-3 py-3 text-left transition-colors hover:bg-surface-container-low"
              }
            >
              <p className="text-body-sm font-semibold text-on-surface">{opt.label}</p>
              {opt.hint ? <p className="mt-0.5 text-body-sm text-on-surface-variant">{opt.hint}</p> : null}
            </button>
          ))}
        </div>
      </section>

      {/* Regional */}
      <section className="rounded border border-outline-variant bg-surface p-4">
        <h3 className="mb-3 text-label-caps text-on-surface-variant">Regional Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-label-caps text-on-surface-variant">Timezone</label>
            <Input value="(GMT-08:00) Pacific Time — US & Canada" readOnly />
          </div>
          <div>
            <label className="mb-1.5 block text-label-caps text-on-surface-variant">Date Format</label>
            <Input value="MM/DD/YYYY" readOnly />
          </div>
        </div>
      </section>

      {/* Notification routing */}
      <section className="rounded border border-outline-variant bg-surface p-4">
        <h3 className="mb-4 text-label-caps text-on-surface-variant">Notification Routing</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Icon name="mail" className="text-[18px] text-primary" />
              <div>
                <p className="text-body-md text-on-surface">Email Delivery</p>
                <p className="text-body-sm text-on-surface-variant">Weekly digest of important alerts sent to your inbox.</p>
              </div>
            </div>
            <Toggle checked={emailDigest} onChange={setEmailDigest} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded bg-[#4A154B] text-[11px] font-bold text-white">S</span>
              <div>
                <p className="text-body-md text-on-surface">Slack Integration</p>
                <p className="text-body-sm text-on-surface-variant">
                  Route alerts to a Slack channel.{" "}
                  {slack ? (
                    <span className="inline-flex items-center gap-1">
                      <Badge tone="success">CONNECTED</Badge>
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <Toggle checked={slack} onChange={setSlack} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Icon name="webhook" className="text-[18px] text-secondary" />
              <div>
                <p className="text-body-md text-on-surface">Custom Webhook</p>
                <p className="text-body-sm text-on-surface-variant">Send notifications to an arbitrary HTTPS endpoint.</p>
              </div>
            </div>
            <Toggle checked={webhook} onChange={setWebhook} />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Reset to Defaults</Button>
        <Button variant="primaryContainer" onClick={() => toast.show("Preferences saved.", "success")}>
          Save Preferences
        </Button>
      </div>
    </div>
  );
}