"use client";

import type { PivotResultRow } from "@/lib/types";

export function BarChart({ data }: { data: PivotResultRow[] }) {
  if (data.length === 0) return null;
  const top = data.slice(0, 15);
  const max = Math.max(...top.map((d) => Math.abs(d.value)), 1);

  return (
    <div className="flex flex-col gap-2" role="img" aria-label="Grafik batang ringkasan">
      {top.map((d) => (
        <div key={d.group} className="flex items-center gap-3">
          <div className="w-32 shrink-0 truncate text-xs text-neutral-600 sm:w-40" title={d.group}>
            {d.group}
          </div>
          <div className="h-4 flex-1 overflow-hidden rounded bg-neutral-100">
            <div
              className="h-full rounded bg-accent-600"
              style={{ width: `${Math.max((Math.abs(d.value) / max) * 100, 2)}%` }}
            />
          </div>
          <div className="w-16 shrink-0 text-right text-xs font-medium text-neutral-700">
            {d.value.toLocaleString("id-ID")}
          </div>
        </div>
      ))}
    </div>
  );
}
