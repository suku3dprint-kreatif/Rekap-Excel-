"use client";

import { useMemo } from "react";
import type { Dispatch } from "react";
import { BarChart } from "@/components/BarChart";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/Button";
import { copyResultToClipboard, exportToCsv, exportToXlsx } from "@/lib/exportFile";
import { computePivot } from "@/lib/pivot";
import type { AggregationType, PivotConfig, ProcessResult } from "@/lib/types";
import type { WizardAction } from "@/state/useWizardState";

const AGG_OPTIONS: { value: AggregationType; label: string }[] = [
  { value: "count", label: "Jumlah baris" },
  { value: "sum", label: "Jumlah (sum)" },
  { value: "avg", label: "Rata-rata" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maksimum" },
  { value: "countUnique", label: "Hitung unik" },
];

export function Step4Results({
  processResult,
  pivotConfig,
  dispatch,
}: {
  processResult: ProcessResult;
  pivotConfig: PivotConfig;
  dispatch: Dispatch<WizardAction>;
}) {
  const { columns, rows } = processResult;

  const pivotRows = useMemo(() => computePivot(rows, pivotConfig), [rows, pivotConfig]);

  const groupLabel = columns.find((c) => c.id === pivotConfig.groupByColumnId)?.name ?? "-";
  const valueLabel =
    pivotConfig.aggregation === "count"
      ? "Jumlah baris"
      : (columns.find((c) => c.id === pivotConfig.valueColumnId)?.name ?? "-");

  function handleExportXlsx() {
    exportToXlsx(
      processResult,
      pivotRows.length > 0 ? { config: pivotConfig, rows: pivotRows, groupLabel, valueLabel } : null,
    );
  }

  async function handleCopy() {
    try {
      await copyResultToClipboard(columns, rows);
      alert("Data berhasil disalin ke clipboard.");
    } catch {
      alert("Gagal menyalin ke clipboard. Coba lagi atau gunakan ekspor file.");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-neutral-700">Data gabungan</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" type="button" onClick={handleExportXlsx}>
              Ekspor .xlsx
            </Button>
            <Button variant="secondary" type="button" onClick={() => exportToCsv(processResult)}>
              Ekspor .csv
            </Button>
            <Button variant="secondary" type="button" onClick={handleCopy}>
              Salin ke clipboard
            </Button>
          </div>
        </div>
        <DataTable columns={columns} rows={rows} />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-neutral-700">Ringkasan / Pivot sederhana</h3>
        <div className="flex flex-wrap items-end gap-3 rounded border border-neutral-200 bg-white p-3">
          <label className="flex flex-col gap-1 text-xs text-neutral-600">
            Kelompokkan berdasarkan
            <select
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              value={pivotConfig.groupByColumnId ?? ""}
              onChange={(e) =>
                dispatch({
                  type: "SET_PIVOT_CONFIG",
                  patch: { groupByColumnId: e.target.value === "" ? null : e.target.value },
                })
              }
            >
              <option value="">— Pilih kolom —</option>
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-neutral-600">
            Kolom nilai
            <select
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm disabled:bg-neutral-50 disabled:text-neutral-400"
              value={pivotConfig.valueColumnId ?? ""}
              disabled={pivotConfig.aggregation === "count"}
              onChange={(e) =>
                dispatch({
                  type: "SET_PIVOT_CONFIG",
                  patch: { valueColumnId: e.target.value === "" ? null : e.target.value },
                })
              }
            >
              <option value="">— Pilih kolom —</option>
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-neutral-600">
            Agregasi
            <select
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              value={pivotConfig.aggregation}
              onChange={(e) =>
                dispatch({
                  type: "SET_PIVOT_CONFIG",
                  patch: { aggregation: e.target.value as AggregationType },
                })
              }
            >
              {AGG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {pivotRows.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold text-neutral-500">
                    <th className="px-3 py-2">{groupLabel}</th>
                    <th className="px-3 py-2">{valueLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {pivotRows.map((r) => (
                    <tr key={r.group} className="border-b border-neutral-100 last:border-0">
                      <td className="px-3 py-2">{r.group}</td>
                      <td className="px-3 py-2">{r.value.toLocaleString("id-ID")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded border border-neutral-200 bg-white p-4">
              <BarChart data={pivotRows} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Pilih kolom untuk membuat ringkasan.</p>
        )}
      </section>
    </div>
  );
}
