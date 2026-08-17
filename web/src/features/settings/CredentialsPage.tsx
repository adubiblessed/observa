import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, formatRelative } from "@/lib/format";
import { copyText } from "@/lib/clipboard";
import type { Credential } from "@/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Loader } from "@/components/ui/Loader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/feedback/Modal";
import { useToast } from "@/components/feedback/Toast";

function useColumns(): Column<Credential>[] {
  return [
    {
      id: "name",
      header: "Key Name",
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <span className={cn("flex h-7 w-7 items-center justify-center rounded", c.type === "ingestion" ? "bg-primary-container/20 text-primary" : "bg-secondary-container text-on-secondary-container")}>
            <Icon name={c.type === "ingestion" ? "upload" : "api"} className="text-[16px]" />
          </span>
          <span className="text-body-sm text-on-surface">{c.name}</span>
        </div>
      ),
      sortValue: (c) => c.name,
    },
    {
      id: "keyId",
      header: "Key ID",
      width: "200px",
      render: (c) => <span className="font-code-sm text-on-surface-variant">{c.keyId}</span>,
      sortValue: (c) => c.keyId,
    },
    {
      id: "type",
      header: "Type",
      width: "110px",
      render: (c) => (
        <span className="rounded border border-outline-variant bg-surface-container-low px-1.5 py-0.5 text-[10px] font-bold uppercase text-on-surface-variant">
          {c.type}
        </span>
      ),
      sortValue: (c) => c.type,
    },
    {
      id: "status",
      header: "Status",
      width: "90px",
      render: (c) => (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
            c.status === "active" ? "bg-log-info-bg text-log-info-text" : "bg-surface-container-highest text-on-surface-variant",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", c.status === "active" ? "bg-success" : "bg-outline")} />
          {c.status}
        </span>
      ),
      sortValue: (c) => c.status,
    },
    {
      id: "created",
      header: "Created Date",
      width: "120px",
      render: (c) => <span className="font-code-sm text-on-surface-variant">{formatDate(c.createdAt)}</span>,
      sortValue: (c) => c.createdAt,
    },
    {
      id: "lastUsed",
      header: "Last Used",
      width: "110px",
      render: (c) => <span className="font-code-sm text-on-surface-variant">{c.lastUsedAt ? formatRelative(c.lastUsedAt) : "Never"}</span>,
      sortValue: (c) => c.lastUsedAt ?? "",
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      width: "120px",
      render: (c) => <RowActions credential={c} />,
    },
  ];
}

export function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    api
      .listCredentials()
      .then((result) => {
        if (cancelled) return;
        setCredentials(result?.items || []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCredentials([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      credentials.filter((c) => {
        const q = search.toLowerCase();
        if (!q) return true;
        return c.name.toLowerCase().includes(q) || c.keyId.toLowerCase().includes(q) || c.type.includes(q);
      }),
    [credentials, search],
  );

  const createCredential = () => {
    const count = credentials.length + 1;
    const name = `key-${count}`;
    const credential: Credential = {
      id: `ck_${Date.now()}`,
      name,
      keyId: `obs_ik_${Math.random().toString(36).slice(2, 7)}...${Math.random().toString(36).slice(2, 5)}`,
      type: "ingestion",
      status: "active",
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    };
    const secretToken = `obs_secret_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    setCredentials((prev) => [credential, ...prev]);
    setCreateOpen(false);
    setSecret(secretToken);
    toast.show(`Key "${name}" created.`, "success");
  };

  const columns = useColumns();

  return (
    <div className="mx-auto max-w-[1200px] flex h-full flex-col gap-gutter p-container-padding">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-body-sm text-on-surface-variant">
            <span>Cluster-01</span>
            <Icon name="chevron_right" className="text-[14px]" />
            <span>Settings</span>
            <Icon name="chevron_right" className="text-[14px]" />
            <span>Credentials</span>
          </div>
          <h2 className="text-headline-lg text-on-surface">API Credentials</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Manage and rotate ingestion keys and API access tokens.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" leadingIcon="terminal" onClick={() => toast.show("CLI access: use `observa login` in your terminal.", "neutral")}>
            CLI Access
          </Button>
          <Button variant="primaryContainer" leadingIcon="add" onClick={() => setCreateOpen(true)}>
            Create New Key
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search keys…"
          leadingIcon="search"
          className="w-72"
        />
        <Button variant="outline" leadingIcon="filter_list">
          Filter
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-outline-variant bg-surface">
        {loading ? (
          <Loader />
        ) : (
          <DataTable columns={columns} rows={filtered} rowKey={(c) => c.id} zebra />
        )}
        <div className="flex h-9 shrink-0 items-center border-t border-outline-variant bg-surface-container-lowest px-4 text-body-sm text-on-surface-variant">
          Showing 1-{filtered.length} of {credentials.length} keys
        </div>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Key"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primaryContainer" onClick={createCredential}>
              Generate Key
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-body-md text-on-surface-variant">
            Generate a new ingestion key. The full secret is shown only once after creation.
          </p>
          <div>
            <label className="mb-1.5 block text-label-caps text-on-surface-variant">Key Name</label>
            <Input placeholder="e.g. staging-ingestion" autoFocus />
          </div>
          <div>
            <label className="mb-1.5 block text-label-caps text-on-surface-variant">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["ingestion", "api"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={cn(
                    "rounded border px-3 py-2 text-left transition-colors",
                    type === "ingestion"
                      ? "border-primary bg-primary-container/15 text-on-surface"
                      : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-outline",
                  )}
                >
                  <p className="text-body-sm font-semibold capitalize">{type}</p>
                  <p className="mt-0.5 text-body-sm">
                    {type === "ingestion" ? "Ingest logs, metrics, and traces" : "Query the Observa REST API"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={secret !== null} onClose={() => setSecret(null)} title="Key generated successfully">
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded border border-warning/30 bg-warning-bg p-3">
            <Icon name="warning" className="mt-0.5 text-[18px] text-warning" />
            <p className="text-body-sm text-on-surface">
              <span className="font-semibold text-warning">One-Time Secret:</span> This secret will only be shown once.
              Store it securely. You will not be able to view it again.
            </p>
          </div>
          <SecretRow label="Key ID" value="obs_ik_a8f92j3l9k2jkl3" />
          <SecretRow label="Secret Token" value={secret ?? ""} />
          <Button variant="primaryContainer" className="w-full" onClick={() => setSecret(null)}>
            I have saved this secret
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function SecretRow({ label, value }: { label: string; value: string }) {
  const toast = useToast();
  return (
    <div className="rounded border border-outline-variant bg-surface-container-lowest p-3">
      <div className="flex items-center justify-between">
        <span className="text-label-caps text-on-surface-variant">{label}</span>
        <button
          type="button"
          aria-label={`Copy ${label}`}
          onClick={async () => {
            if (await copyText(value)) toast.show(`${label} copied.`, "success");
          }}
          className="text-on-surface-variant transition-colors hover:text-primary"
        >
          <Icon name="content_copy" className="text-[18px]" />
        </button>
      </div>
      <p className="mt-1.5 break-all font-code-sm text-on-surface">{value}</p>
    </div>
  );
}

function RowActions({ credential }: { credential: Credential }) {
  const toast = useToast();
  const revoked = credential.status === "revoked";
  return (
    <div className="flex items-center justify-end gap-1 text-on-surface-variant">
      <button type="button" aria-label="Rotate key" className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-surface-container-high hover:text-on-surface" onClick={() => toast.show(`Rotate "${credential.name}"?`, "warning")}>
        <Icon name="sync" className="text-[18px]" />
      </button>
      <button type="button" aria-label={revoked ? "Reactivate key" : "Block key"} className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-surface-container-high hover:text-on-surface" onClick={() => toast.show(revoked ? `"${credential.name}" reactivated.` : `"${credential.name}" blocked.`, revoked ? "success" : "warning")}>
        <Icon name={revoked ? "restore" : "block"} className="text-[18px]" />
      </button>
      <button type="button" aria-label="Delete key" className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-error-container hover:text-on-error-container" onClick={() => toast.show(`"${credential.name}" deleted.`, "error")}>
        <Icon name="delete" className="text-[18px]" />
      </button>
    </div>
  );
}