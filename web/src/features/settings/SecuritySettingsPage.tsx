import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/feedback/Toast";

const API_KEYS = [
  { id: "k1", name: "prod-read-only-tok_1a2b3c", created: "2023-10-12", lastUsed: "2 mins ago" },
  { id: "k2", name: "ci-deployment-tok_9x8y7z", created: "2023-09-01", lastUsed: "1 day ago" },
];

const SESSIONS = [
  { id: "s1", device: "Mac OS X • Chrome", ip: "192.168.1.104", location: "Seattle, WA, US", activity: "Just now", current: true },
  { id: "s2", device: "iOS 17 • Safari", ip: "10.0.0.52", location: "Bellevue, WA, US", activity: "2 hours ago", current: false },
  { id: "s3", device: "Ubuntu 22.04 • Firefox", ip: "172.16.254.1", location: "Portland, OR, US", activity: "3 days ago", current: false },
];

const SECURITY_EVENTS = [
  { time: "2023-10-25 14:32:01 UTC", type: "AUTH_SUCCESS", message: "Successful login from 192.168.1.104 (Mac OS X / Chrome)" },
  { time: "2023-10-25 14:31:50 UTC", type: "MFA_CHALLENGE", message: "TOTP challenge issued for 192.168.1.104" },
  { time: "2023-10-24 09:15:22 UTC", type: "KEY_CREATED", message: "API Key 'prod-read-only' generated via Web UI" },
  { time: "2023-10-22 18:05:41 UTC", type: "AUTH_FAILED", message: "Invalid credentials from 45.33.22.11 (Unknown OS)" },
];

const EVENT_TEXT: Record<string, string> = {
  AUTH_SUCCESS: "text-success",
  AUTH_FAILED: "text-error",
  MFA_CHALLENGE: "text-warning",
  KEY_CREATED: "text-primary",
};

export function SecuritySettingsPage() {
  const toast = useToast();
  return (
    <div className="mx-auto max-w-[820px] flex h-full flex-col gap-gutter overflow-y-auto p-container-padding">
      <div>
        <h2 className="text-headline-lg text-on-surface">Security &amp; Authentication</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">Manage your credentials, active sessions, and multi-factor settings.</p>
      </div>

      {/* Change password */}
      <section className="rounded border border-outline-variant bg-surface p-4">
        <h3 className="mb-4 flex items-center gap-2 text-label-caps text-on-surface-variant">
          <Icon name="key" className="text-[18px] text-primary" />
          Change Password
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1.5 block text-label-caps text-on-surface-variant">Current Password</label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <div>
            <label className="mb-1.5 block text-label-caps text-on-surface-variant">New Password</label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <div>
            <label className="mb-1.5 block text-label-caps text-on-surface-variant">Confirm New Password</label>
            <Input type="password" placeholder="••••••••" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="primaryContainer" size="md" onClick={() => toast.show("Password updated.", "success")}>
            Update Password
          </Button>
        </div>
      </section>

      {/* MFA */}
      <section className="rounded border border-outline-variant bg-surface p-4">
        <h3 className="mb-3 flex items-center gap-2 text-label-caps text-on-surface-variant">
          <Icon name="verified_user" className="text-[18px] text-success" />
          Multi-Factor Auth
        </h3>
        <div className="flex items-center justify-between gap-4">
          <p className="text-body-sm text-on-surface-variant">
            Authenticator app is currently enabled. Use your device to generate time-based one-time passwords (TOTP).
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone="success">ACTIVE</Badge>
            <Button variant="outline" size="sm" onClick={() => toast.show("MFA configuration opened.", "neutral")}>
              Configure
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.show("MFA disabled.", "warning")}>
              Disable
            </Button>
          </div>
        </div>
      </section>

      {/* API keys */}
      <section className="rounded border border-outline-variant bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-label-caps text-on-surface-variant">
            <Icon name="api" className="text-[18px] text-primary" />
            API Keys
          </h3>
          <button type="button" className="text-body-sm text-primary hover:underline">
            Manage Keys →
          </button>
        </div>
        <ul className="divide-y divide-outline-variant/40">
          {API_KEYS.map((k) => (
            <li key={k.id} className="flex items-center gap-3 py-2">
              <Icon name="key" className="text-[16px] text-on-surface-variant" />
              <div className="min-w-0">
                <p className="truncate font-code-sm text-on-surface">{k.name}</p>
                <p className="text-body-sm text-on-surface-variant">
                  Created: {k.created} • Last used: {k.lastUsed}
                </p>
              </div>
              <button
                type="button"
                aria-label="Delete key"
                onClick={() => toast.show(`Key "${k.name}" deleted.`, "error")}
                className="ml-auto text-on-surface-variant transition-colors hover:text-error"
              >
                <Icon name="delete" className="text-[18px]" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Sessions */}
      <section className="flex flex-col overflow-hidden rounded border border-outline-variant bg-surface">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-4 py-2.5">
          <h3 className="text-label-caps text-on-surface">Active Sessions</h3>
          <button type="button" className="text-body-sm text-primary hover:underline" onClick={() => toast.show("All other sessions revoked.", "success")}>
            Revoke All Other Sessions
          </button>
        </div>
        <div className="custom-scrollbar overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="h-8 border-b border-outline-variant bg-surface-container-lowest text-label-caps text-on-surface-variant">
                <th className="px-4 font-normal">Device &amp; Browser</th>
                <th className="px-4 font-normal">IP Address / Location</th>
                <th className="px-4 text-right font-normal">Last Activity</th>
                <th className="px-4 text-right font-normal">Action</th>
              </tr>
            </thead>
            <tbody className="font-body-sm">
              {SESSIONS.map((s) => (
                <tr key={s.id} className="h-table-row-height border-b border-outline-variant/40 last:border-b-0">
                  <td className="px-4 text-on-surface">
                    <span className="flex items-center gap-2">
                      <Icon name={s.device.includes("Mac") || s.device.includes("iOS") ? "smartphone" : "laptop_mac"} className="text-[16px] text-on-surface-variant" />
                      {s.device}
                      {s.current ? <Badge tone="primary">Current Session</Badge> : null}
                    </span>
                  </td>
                  <td className="px-4 font-code-sm text-on-surface-variant">
                    {s.ip} {s.location}
                  </td>
                  <td className="px-4 text-right font-code-sm text-on-surface-variant">{s.activity}</td>
                  <td className="px-4 text-right">
                    {s.current ? (
                      <span className="text-label-caps text-success">Active</span>
                    ) : (
                      <button type="button" className="text-body-sm text-on-surface-variant transition-colors hover:text-error">
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Security events */}
      <section className="flex flex-col overflow-hidden rounded border border-outline-variant bg-surface">
        <div className="border-b border-outline-variant bg-surface-container-low px-4 py-2.5">
          <h3 className="text-label-caps text-on-surface">Recent Security Events</h3>
        </div>
        <div className="bg-surface-container-lowest p-2">
          <ul className="font-code-sm">
            {SECURITY_EVENTS.map((ev, i) => (
              <li
                key={i}
                className={
                  i === SECURITY_EVENTS.length - 1
                    ? "flex items-center gap-3 p-2 hover:bg-surface-container"
                    : "flex items-center gap-3 border-b border-outline-variant p-2 hover:bg-surface-container"
                }
              >
                <span className="w-40 shrink-0 text-on-surface-variant">{ev.time}</span>
                <span className={EVENT_TEXT[ev.type] ?? "text-primary"}>{ev.type}</span>
                <span className="min-w-0 truncate text-on-surface-variant">{ev.message}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}