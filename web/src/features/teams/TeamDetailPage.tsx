import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { Team, TeamMember, TeamRole } from "@/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Loader, EmptyState } from "@/components/ui/Loader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { MemberStatusBadge } from "@/components/ui/Badge";

const ROLE_LABELS: Record<TeamRole, string> = {
  lead: "Team Lead",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

const ROLE_CLASS: Record<TeamRole, string> = {
  lead: "bg-primary-container/25 text-primary",
  admin: "bg-secondary-container text-on-secondary-container",
  editor: "bg-surface-container-highest text-on-surface-variant",
  viewer: "bg-surface-container-high text-on-surface-variant",
};

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!teamId) return;
    Promise.all([api.getTeam(teamId), api.listTeamMembers(teamId)])
      .then(([t, m]) => {
        if (cancelled) return;
        setTeam(t);
        setMembers(m.items);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const filtered = useMemo(
    () =>
      members.filter((m) => {
        const q = search.toLowerCase();
        if (!q) return true;
        return (
          m.user.email.toLowerCase().includes(q) ||
          fullName(m.user).toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q)
        );
      }),
    [members, search],
  );

  if (loading) return <Loader label="Loading team…" />;
  if (!team) return <EmptyState icon="error" title="Team not found" />;

  const columns = buildMemberColumns();

  return (
    <div className="mx-auto max-w-[1200px] flex h-full flex-col gap-gutter p-container-padding">
      <div className="mb-1 flex items-center gap-1 text-body-sm text-on-surface-variant">
        <Link to="/app/teams" className="hover:text-primary">
          Teams
        </Link>
        <Icon name="chevron_right" className="text-[14px]" />
        <span className="text-on-surface">{team.name}</span>
      </div>

      <div className="flex shrink-0 items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-secondary-container text-headline-md font-bold text-on-secondary-container">
            {team.name.charAt(0)}
          </span>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-headline-lg text-on-surface">{team.name}</h2>
              <span className="rounded bg-surface-container-high px-2 py-0.5 font-code-sm text-on-surface-variant">
                ID: {team.id}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">{team.description}</p>
          </div>
        </div>
        <Button variant="primaryContainer" leadingIcon="person_add">
          Invite Member
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-outline-variant bg-surface">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-outline-variant bg-surface-container-low px-4 py-2.5">
          <h3 className="text-label-caps text-on-surface">Members ({team.memberCount})</h3>
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members…"
              leadingIcon="search"
              className="w-64"
            />
            <Button variant="outline" size="md" leadingIcon="filter_list">
              Filter
            </Button>
          </div>
        </div>
        <DataTable columns={columns} rows={filtered} rowKey={(m) => m.id} zebra />
        <div className="flex h-9 shrink-0 items-center border-t border-outline-variant bg-surface-container-lowest px-4 text-body-sm text-on-surface-variant">
          Showing 1-{filtered.length} of {team.memberCount} members
        </div>
      </div>
    </div>
  );
}

function buildMemberColumns(): Column<TeamMember>[] {
  return [
    {
      id: "user",
      header: "User",
      render: (m) => (
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-body-sm font-semibold text-primary">
            {initials(m.user)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-body-sm text-on-surface">{fullName(m.user)}</p>
            <p className="truncate text-body-sm text-on-surface-variant">{m.user.email}</p>
          </div>
        </div>
      ),
      sortValue: (m) => fullName(m.user),
    },
    {
      id: "role",
      header: "Role",
      width: "130px",
      render: (m) => <RoleCell member={m} />,
      sortValue: (m) => m.role,
    },
    {
      id: "status",
      header: "Status",
      width: "100px",
      render: (m) => <MemberStatusBadge status={m.status} />,
      sortValue: (m) => m.status,
    },
    {
      id: "joined",
      header: "Joined",
      width: "110px",
      render: (m) => <span className="font-code-sm text-on-surface-variant">{formatDate(m.joinedAt)}</span>,
      sortValue: (m) => m.joinedAt,
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      width: "90px",
      render: () => (
        <div className="flex items-center justify-end gap-1 text-on-surface-variant">
          <button type="button" aria-label="Edit member" className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-surface-container-high hover:text-on-surface">
            <Icon name="edit" className="text-[18px]" />
          </button>
          <button type="button" aria-label="Remove member" className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-error-container hover:text-on-error-container">
            <Icon name="delete" className="text-[18px]" />
          </button>
        </div>
      ),
    },
  ];
}

function RoleCell({ member }: { member: TeamMember }) {
  const [role, setRole] = useState<TeamRole>(member.role);
  return (
    <Menu
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "flex items-center gap-1.5 rounded border border-outline-variant px-1.5 py-0.5 text-body-sm transition-colors hover:border-outline",
            ROLE_CLASS[role],
          )}
        >
          {ROLE_LABELS[role]}
          <Icon name="arrow_drop_down" className="text-[14px]" />
        </button>
      )}
    >
      <MenuItem label="Team Lead" active={role === "lead"} onSelect={() => setRole("lead")} />
      <MenuItem label="Admin" active={role === "admin"} onSelect={() => setRole("admin")} />
      <MenuSeparator />
      <MenuItem label="Editor" active={role === "editor"} onSelect={() => setRole("editor")} />
      <MenuItem label="Viewer" active={role === "viewer"} onSelect={() => setRole("viewer")} />
    </Menu>
  );
}

function fullName(m: TeamMember["user"]): string {
  return [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email;
}

function initials(m: TeamMember["user"]): string {
  const name = fullName(m);
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}