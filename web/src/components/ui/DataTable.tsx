import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { EmptyState, Loader } from "./Loader";

export interface Column<T> {
  id: string;
  header: ReactNode;
  /** Render the cell content for a row. */
  render: (row: T) => ReactNode;
  /** Optional value used for sorting. */
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
  align?: "left" | "right" | "center";
  width?: string;
}

export interface SortState {
  key: string;
  dir: "asc" | "desc";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Optional controlled sort. When provided, sorting becomes controlled. */
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  rowClassName?: (row: T) => string;
  /** Selection support: checked keys and a toggle callback. */
  selectedKeys?: Set<string>;
  onSelectionToggle?: (key: string) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  className?: string;
  bodyClassName?: string;
  zebra?: boolean;
}

/**
 * Dense, reusable data table following the Observa design system:
 * 36px rows, label-caps headers, horizontal separators, no outer border
 * on the table element itself.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  sort,
  onSortChange,
  loading,
  error,
  emptyTitle = "No records",
  emptyDescription,
  rowClassName,
  selectedKeys,
  onSelectionToggle,
  pagination,
  className,
  bodyClassName,
  zebra = true,
}: DataTableProps<T>) {
  const [internalSort, setInternalSort] = useState<SortState | null>(null);
  const activeSort = sort !== undefined ? sort : internalSort;

  const sortedRows = useMemo(() => {
    if (!activeSort) return rows;
    const col = columns.find((c) => c.id === activeSort.key);
    if (!col?.sortValue) return rows;
    const dir = activeSort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [rows, activeSort, columns]);

  const handleSort = (col: Column<T>) => {
    if (!col.sortValue) return;
    const next: SortState = activeSort?.key === col.id && activeSort.dir === "asc"
      ? { key: col.id, dir: "desc" }
      : { key: col.id, dir: "asc" };
    if (onSortChange) onSortChange(next);
    else setInternalSort(next);
  };

  const allSelected =
    selectedKeys && rows.length > 0 && rows.every((r) => selectedKeys.has(rowKey(r)));

  const body = (() => {
    if (loading) return <Loader />;
    if (error)
      return (
        <EmptyState icon="error" title="Failed to load data" description={error} />
      );
    if (sortedRows.length === 0)
      return <EmptyState title={emptyTitle} description={emptyDescription} />;
    return sortedRows.map((row) => {
      const key = rowKey(row);
      const selected = selectedKeys?.has(key) ?? false;
      return (
        <tr
          key={key}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          className={cn(
            "h-table-row-height border-b border-outline-variant/40 transition-colors last:border-b-0",
            onRowClick && "cursor-pointer",
            zebra && "odd:bg-transparent even:bg-surface-container-lowest/40",
            onRowClick && "hover:bg-surface-container",
            selected && "bg-surface-container-high",
            rowClassName?.(row),
          )}
        >
          {onSelectionToggle ? (
            <td className="w-9 px-3 text-center" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                className="rounded-sm border-outline-variant bg-surface-container-low accent-primary"
                checked={selected}
                onChange={() => onSelectionToggle(key)}
              />
            </td>
          ) : null}
          {columns.map((col) => (
            <td
              key={col.id}
              className={cn(
                "px-3 py-1 align-middle",
                col.align === "right" && "text-right",
                col.align === "center" && "text-center",
                col.className,
              )}
              style={col.width ? { width: col.width } : undefined}
            >
              {col.render(row)}
            </td>
          ))}
        </tr>
      );
    });
  })();

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className={cn("overflow-x-auto", bodyClassName)}>
        <table className="w-full border-collapse whitespace-nowrap text-left">
          <thead className="sticky top-0 z-10">
            <tr className="h-8 border-b border-outline-variant bg-surface-container-low text-label-caps text-on-surface-variant">
              {onSelectionToggle ? (
                <th className="w-9 px-3 text-center">
                  <input
                    type="checkbox"
                    className="rounded-sm border-outline-variant bg-surface-container-low accent-primary"
                    checked={allSelected}
                    onChange={() => {
                      if (allSelected) {
                        rows.forEach((r) => {
                          if (selectedKeys?.has(rowKey(r))) onSelectionToggle(rowKey(r));
                        });
                      } else {
                        rows.forEach((r) => {
                          if (!selectedKeys?.has(rowKey(r))) onSelectionToggle(rowKey(r));
                        });
                      }
                    }}
                  />
                </th>
              ) : null}
              {columns.map((col) => {
                const isSorted = activeSort?.key === col.id;
                return (
                  <th
                    key={col.id}
                    onClick={col.sortValue ? () => handleSort(col) : undefined}
                    className={cn(
                      "whitespace-nowrap px-3 py-2 font-normal",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.sortValue && "cursor-pointer select-none hover:text-on-surface",
                      isSorted && "text-on-surface",
                      col.headerClassName,
                    )}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortValue ? (
                        <SortIcon state={isSorted ? activeSort!.dir : null} />
                      ) : null}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="font-body-sm">{body}</tbody>
        </table>
      </div>
      {pagination ? <PaginationFooter {...pagination} /> : null}
    </div>
  );
}

function SortIcon({ state }: { state: "asc" | "desc" | null }) {
  const cls = "material-symbols-outlined text-[14px] leading-none";
  if (state === null) return <span className={cn(cls, "text-outline opacity-60")}>unfold_more</span>;
  return (
    <span className={cn(cls, "text-primary")}>
      {state === "asc" ? "arrow_upward" : "arrow_downward"}
    </span>
  );
}

function PaginationFooter({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-lowest px-4 py-2 text-body-sm text-on-surface-variant">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <PagerButton disabled={page <= 1} onClick={() => onPageChange(page - 1)} icon="chevron_left" label="Previous" />
        <span className="px-2 font-code-sm text-on-surface">
          {page} / {pages}
        </span>
        <PagerButton disabled={page >= pages} onClick={() => onPageChange(page + 1)} icon="chevron_right" label="Next" />
      </div>
    </div>
  );
}

function PagerButton({
  disabled,
  onClick,
  icon,
  label,
}: {
  disabled: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:pointer-events-none disabled:opacity-40"
    >
      <span className="material-symbols-outlined text-[16px] leading-none">{icon}</span>
    </button>
  );
}