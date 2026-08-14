import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { Team } from "@/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Loader } from "@/components/ui/Loader";
import { DataTable, type Column } from "@/components/ui/DataTable";

const columns: Column<Team>[] = [
  {
    id: "name",
    header: "Team Name",
    width: "200px",
    render: (t) => (
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-secondary-container text-body-sm font-bold text-on-secondary-container">
          {t.name.charAt(0)}
        </span>
        <span className="text-body-sm text-on-surface">{t.name}</span>
      </div>
    ),
    sortValue: (t) => t.name,
  },
  {
    id: "description",
    header: "Description",
    render: (t) => <span className="text-body-sm text-on-surface-variant">{t.description}</span>,
    sortValue: (t) => t.description,
  },
  {
    id: "members",
    header: "Members",
    align: "right",
    width: "90px",
    render: (t) => <span className="font-code-sm text-on-surface">{t.memberCount}</span>,
    sortValue: (t) => t.memberCount,
  },
  {
    id: "projects",
    header: "Projects",
    align: "right",
    width: "90px",
    render: (t) => <span className="font-code-sm text-on-surface">{t.projectCount}</span>,
    sortValue: (t) => t.projectCount,
  },
  {
    id: "actions",
    header: "Actions",
    align: "right",
    width: "90px",
    render: () => (
      <div className="flex items-center justify-end gap-1 text-on-surface-variant">
        <button type="button" aria-label="Edit team" className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-surface-container-high hover:text-on-surface">
          <Icon name="edit" className="text-[18px]" />
        </button>
        <button type="button" aria-label="Delete team" className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-error-container hover:text-on-error-container">
          <Icon name="delete" className="text-[18px]" />
        </button>
      </div>
    ),
  },
];

export function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    api.listTeams().then((result) => {
      if (cancelled) return;
      setTeams(result.items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Loader label="Loading teams…" />;

  return (
    <div className="mx-auto flex h-full max-w-[1400px] flex-col gap-gutter p-container-padding">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-body-sm text-on-surface-variant">
            <span>Observa</span>
            <Icon name="chevron_right" className="text-[14px]" />
            <span>Teams</span>
          </div>
          <h2 className="text-headline-lg text-on-surface">Teams Management</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">Manage platform access, roles, and project assignments.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" leadingIcon="download">
            Export
          </Button>
          <Button variant="primaryContainer" leadingIcon="group_add">
            Create Team
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-outline-variant bg-surface">
        <DataTable
          columns={columns}
          rows={teams}
          rowKey={(t) => t.id}
          zebra
          onRowClick={(t) => navigate(`/app/teams/${t.id}`)}
          rowClassName={() => "cursor-pointer"}
        />
        <div className="flex h-9 shrink-0 items-center border-t border-outline-variant bg-surface-container-lowest px-4 text-body-sm text-on-surface-variant">
          Showing 1 to {teams.length} of {teams.length} entries
        </div>
      </div>
    </div>
  );
}