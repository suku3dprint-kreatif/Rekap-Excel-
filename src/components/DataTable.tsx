"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { cn } from "@/lib/cn";
import type { OutputRow, TargetColumn } from "@/lib/types";

const COLUMN_WIDTH = 176;
const ROW_HEIGHT = 34;
const LIST_HEIGHT = 480;

type SortDir = "asc" | "desc" | null;

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

export function DataTable({ columns, rows }: { columns: TargetColumn[]; rows: OutputRow[] }) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showColumnPanel, setShowColumnPanel] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ columnId: string; dir: SortDir } | null>(null);

  const visibleColumns = useMemo(() => columns.filter((c) => !hidden.has(c.id)), [columns, hidden]);

  const filteredRows = useMemo(() => {
    let out = rows;

    const activeFilters = Object.entries(filters).filter(([, v]) => v.trim() !== "");
    if (activeFilters.length > 0) {
      out = out.filter((row) =>
        activeFilters.every(([colId, val]) =>
          cellText(row[colId]).toLowerCase().includes(val.toLowerCase()),
        ),
      );
    }

    const q = deferredSearch.trim().toLowerCase();
    if (q !== "") {
      out = out.filter((row) => columns.some((c) => cellText(row[c.id]).toLowerCase().includes(q)));
    }

    if (sort && sort.dir) {
      const { columnId, dir } = sort;
      out = [...out].sort((a, b) => {
        const av = a[columnId];
        const bv = b[columnId];
        let cmp: number;
        if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
        else cmp = cellText(av).localeCompare(cellText(bv), "id");
        return dir === "asc" ? cmp : -cmp;
      });
    }

    return out;
  }, [rows, filters, deferredSearch, columns, sort]);

  function toggleSort(columnId: string) {
    setSort((prev) => {
      if (!prev || prev.columnId !== columnId) return { columnId, dir: "asc" };
      if (prev.dir === "asc") return { columnId, dir: "desc" };
      return null;
    });
  }

  const totalWidth = Math.max(visibleColumns.length * COLUMN_WIDTH, 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari di semua kolom…"
          className="w-full max-w-xs rounded border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">
            {filteredRows.length.toLocaleString("id-ID")} dari {rows.length.toLocaleString("id-ID")} baris
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColumnPanel((v) => !v)}
              className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Kolom ({visibleColumns.length}/{columns.length})
            </button>
            {showColumnPanel && (
              <div className="absolute right-0 z-20 mt-1 max-h-72 w-56 overflow-y-auto rounded border border-neutral-200 bg-white p-2 shadow-lg">
                {columns.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 px-1 py-1 text-xs text-neutral-700">
                    <input
                      type="checkbox"
                      checked={!hidden.has(c.id)}
                      onChange={() =>
                        setHidden((prev) => {
                          const next = new Set(prev);
                          if (next.has(c.id)) next.delete(c.id);
                          else next.add(c.id);
                          return next;
                        })
                      }
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="scrollbar-thin overflow-x-auto rounded border border-neutral-200 bg-white">
        <div style={{ width: totalWidth }}>
          <div className="flex border-b border-neutral-200 bg-neutral-50">
            {visibleColumns.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleSort(c.id)}
                style={{ width: COLUMN_WIDTH }}
                className="flex shrink-0 items-center gap-1 truncate px-2 py-2 text-left text-xs font-semibold text-neutral-600 hover:text-accent-700"
                title={c.name}
              >
                <span className="truncate">{c.name}</span>
                {sort?.columnId === c.id && (
                  <span className="text-accent-600">{sort.dir === "asc" ? "▲" : sort.dir === "desc" ? "▼" : ""}</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex border-b border-neutral-200 bg-white">
            {visibleColumns.map((c) => (
              <div key={c.id} style={{ width: COLUMN_WIDTH }} className="shrink-0 px-1.5 py-1">
                <input
                  value={filters[c.id] ?? ""}
                  onChange={(e) => setFilters((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  placeholder="Filter…"
                  className="w-full rounded border border-neutral-200 px-1.5 py-1 text-xs"
                />
              </div>
            ))}
          </div>

          {filteredRows.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-neutral-400">Tidak ada baris yang cocok.</div>
          ) : (
            <List height={LIST_HEIGHT} itemCount={filteredRows.length} itemSize={ROW_HEIGHT} width={totalWidth}>
              {({ index, style }) => {
                const row = filteredRows[index];
                return (
                  <div
                    style={style}
                    className={cn("flex items-center", index % 2 === 1 ? "bg-neutral-50/60" : "bg-white")}
                  >
                    {visibleColumns.map((c) => (
                      <div
                        key={c.id}
                        style={{ width: COLUMN_WIDTH }}
                        className="shrink-0 truncate px-2 text-xs text-neutral-700"
                        title={cellText(row[c.id])}
                      >
                        {cellText(row[c.id])}
                      </div>
                    ))}
                  </div>
                );
              }}
            </List>
          )}
        </div>
      </div>
    </div>
  );
}
