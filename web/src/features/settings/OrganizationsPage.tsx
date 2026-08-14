import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/feedback/Toast";

const MEMBERSHIPS = [
  { org: "Observa Org", role: "Owner", status: "Active", members: 12 },
  { org: "AWS Research Group", role: "Member", status: "Active", members: 34 },
  { org: "DevOps Guild", role: "Viewer", status: "Active", members: 8 },
];

const INVITATIONS = [
  { org: "Stark Industries", inviter: "Tony Stark (tony@stark.com)", role: "Owner" },
  { org: "Nightwing Labs", inviter: "Dick Grayson (dg@nwlabs.io)", role: "Member" },
];

export function OrganizationsPage() {
  const toast = useToast();
  return (
    <div className="mx-auto max-w-[820px] flex h-full flex-col gap-gutter overflow-y-auto p-container-padding">
      <div>
        <h2 className="text-headline-lg text-on-surface">Organizations &amp; Access</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">Manage your organization memberships, roles, and pending invitations.</p>
      </div>

      {/* Pending invitations */}
      {INVITATIONS.length > 0 ? (
        <section className="rounded border border-outline-variant bg-surface p-4">
          <h3 className="mb-3 text-label-caps text-on-surface-variant">
            Pending Invitations ({INVITATIONS.length})
          </h3>
          <ul className="space-y-2">
            {INVITATIONS.map((inv) => (
              <li key={inv.org} className="flex items-center justify-between gap-4 rounded border border-outline-variant bg-surface-container-lowest px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded bg-secondary-container text-body-sm font-bold text-on-secondary-container">
                    {inv.org.slice(0, 1)}
                  </span>
                  <div>
                    <p className="text-body-md text-on-surface">
                      {inv.org} <span className="text-on-surface-variant">(as {inv.role})</span>
                    </p>
                    <p className="text-body-sm text-on-surface-variant">Invited by {inv.inviter}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => toast.show(`Declined invitation to ${inv.org}.`, "warning")}>
                    Decline
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => toast.show(`Joined ${inv.org} as ${inv.role}.`, "success")}>
                    Accept
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Active memberships */}
      <section className="flex flex-col overflow-hidden rounded border border-outline-variant bg-surface">
        <div className="border-b border-outline-variant bg-surface-container-low px-4 py-2.5">
          <h3 className="text-label-caps text-on-surface">Active Memberships</h3>
        </div>
        <div className="custom-scrollbar overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="h-8 border-b border-outline-variant bg-surface-container-lowest text-label-caps text-on-surface-variant">
                <th className="px-4 font-normal">Organization</th>
                <th className="px-4 font-normal">Role</th>
                <th className="px-4 text-right font-normal">Members</th>
                <th className="px-4 text-right font-normal">Status</th>
                <th className="px-4 text-right font-normal">Action</th>
              </tr>
            </thead>
            <tbody className="font-body-sm">
              {MEMBERSHIPS.map((m) => (
                <tr key={m.org} className="h-table-row-height border-b border-outline-variant/40 last:border-b-0">
                  <td className="px-4 text-on-surface">
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-primary-container text-[11px] font-bold text-on-primary-container">
                        {m.org.slice(0, 1)}
                      </span>
                      {m.org}
                    </span>
                  </td>
                  <td className="px-4 text-on-surface-variant">{m.role}</td>
                  <td className="px-4 text-right font-code-sm text-on-surface-variant">{m.members}</td>
                  <td className="px-4 text-right">
                    <Badge tone="success">ACTIVE</Badge>
                  </td>
                  <td className="px-4 text-right">
                    {m.role === "Owner" ? (
                      <span className="text-label-caps text-outline">Owner</span>
                    ) : (
                      <button
                        type="button"
                        className="text-body-sm text-on-surface-variant transition-colors hover:text-error"
                        onClick={() => toast.show(`You left ${m.org}.`, "neutral")}
                      >
                        Leave
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create org */}
      <section className="rounded border border-outline-variant bg-surface p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Icon name="groups" className="text-[20px] text-primary" />
            <div>
              <p className="text-body-md text-on-surface">Create New Organization</p>
              <p className="text-body-sm text-on-surface-variant">Start a new organization to isolate projects, teams, and billing.</p>
            </div>
          </div>
          <Button variant="primaryContainer" size="md" leadingIcon="add" onClick={() => toast.show("Organization creation flow opened.", "neutral")}>
            Create Organization
          </Button>
        </div>
      </section>
    </div>
  );
}