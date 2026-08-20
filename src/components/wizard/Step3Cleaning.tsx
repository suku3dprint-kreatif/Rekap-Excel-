"use client";

import { useMemo } from "react";
import type { Dispatch } from "react";
import { extractHeaders } from "@/lib/headerDetect";
import type { SourceSheetInput } from "@/lib/pipeline";
import type { CleaningOptions, ColumnKind, MappingSchema, ProcessResult, TargetColumn } from "@/lib/types";
import type { WizardAction } from "@/state/useWizardState";

const KIND_OPTIONS: { value: ColumnKind; label: string }[] = [
  { value: "teks", label: "Teks biasa" },
  { value: "nama", label: "Nama (Title Case)" },
  { value: "id", label: "ID — simpan sebagai teks (NIM/NIP/NIK/telepon)" },
  { value: "tanggal", label: "Tanggal" },
  { value: "angka", label: "Angka (format Indonesia)" },
  { value: "kategori", label: "Kategori (samakan nilai)" },
];

function CheckboxRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-2.5 rounded border border-neutral-200 bg-white px-3 py-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <span>
        <span className="block text-sm font-medium text-neutral-800">{label}</span>
        {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
      </span>
    </label>
  );
}

function collectCategoryValues(
  sources: SourceSheetInput[],
  schema: MappingSchema,
  columnId: string,
): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const src of sources) {
    const headers = extractHeaders(src.sheet.grid, src.sheet.headerRowIndex);
    const mapping = schema.mappings.find(
      (m) => m.fileId === src.fileId && m.sheetName === src.sheetName && m.targetColumnId === columnId,
    );
    if (!mapping) continue;
    const colIdx = headers.indexOf(mapping.originalColumn);
    if (colIdx === -1) continue;
    for (let r = src.sheet.headerRowIndex + 1; r < src.sheet.grid.length; r++) {
      const raw = src.sheet.grid[r]?.[colIdx];
      if (raw === null || raw === undefined) continue;
      const str = String(raw).trim();
      if (str === "") continue;
      counts.set(str, (counts.get(str) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

export function Step3Cleaning({
  schema,
  cleaningOptions,
  sources,
  processResult,
  dispatch,
}: {
  schema: MappingSchema;
  cleaningOptions: CleaningOptions;
  sources: SourceSheetInput[];
  processResult: ProcessResult | null;
  dispatch: Dispatch<WizardAction>;
}) {
  const categoryColumns = schema.targetColumns.filter((c) => c.kind === "kategori");

  function updateColumn(col: TargetColumn, patch: Partial<TargetColumn>) {
    dispatch({ type: "UPSERT_TARGET_COLUMN", column: { ...col, ...patch } });
  }

  function setCategoryMapping(col: TargetColumn, rawValue: string, standardValue: string) {
    const key = rawValue.trim().toLowerCase();
    const categoryMap = { ...(col.categoryMap ?? {}) };
    if (standardValue.trim() === "") delete categoryMap[key];
    else categoryMap[key] = standardValue;
    updateColumn(col, { categoryMap });
  }

  const report = processResult?.report ?? null;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-neutral-700">1. Opsi pembersihan umum</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <CheckboxRow
            checked={cleaningOptions.trimSpaces}
            onChange={(v) => dispatch({ type: "SET_CLEANING_OPTIONS", patch: { trimSpaces: v } })}
            label="Trim spasi berlebih"
            hint="Hapus spasi di awal/akhir & rapikan spasi ganda di tengah"
          />
          <CheckboxRow
            checked={cleaningOptions.titleCaseNames}
            onChange={(v) => dispatch({ type: "SET_CLEANING_OPTIONS", patch: { titleCaseNames: v } })}
            label="Rapikan kapitalisasi nama"
            hint="Title Case, menghormati singkatan gelar (S.Pd, M.Si, dst) — untuk kolom bertipe Nama"
          />
          <CheckboxRow
            checked={cleaningOptions.preserveIdAsText}
            onChange={(v) => dispatch({ type: "SET_CLEANING_OPTIONS", patch: { preserveIdAsText: v } })}
            label="Pertahankan ID sebagai teks"
            hint="NIM/NIP/NIK/telepon tidak pernah jadi notasi ilmiah — untuk kolom bertipe ID"
          />
          <CheckboxRow
            checked={cleaningOptions.normalizeDates}
            onChange={(v) => dispatch({ type: "SET_CLEANING_OPTIONS", patch: { normalizeDates: v } })}
            label="Normalisasi tanggal ke YYYY-MM-DD"
            hint="Mendukung serial Excel, DD/MM/YYYY, dan nama bulan Indonesia — untuk kolom bertipe Tanggal"
          />
          <CheckboxRow
            checked={cleaningOptions.normalizeNumbers}
            onChange={(v) => dispatch({ type: "SET_CLEANING_OPTIONS", patch: { normalizeNumbers: v } })}
            label="Normalisasi angka gaya Indonesia"
            hint='"1.250,50" → 1250.5 — untuk kolom bertipe Angka'
          />
          <CheckboxRow
            checked={cleaningOptions.removeEmptyRows}
            onChange={(v) => dispatch({ type: "SET_CLEANING_OPTIONS", patch: { removeEmptyRows: v } })}
            label="Hapus baris yang seluruhnya kosong"
          />
          <CheckboxRow
            checked={cleaningOptions.addSourceColumns}
            onChange={(v) => dispatch({ type: "SET_CLEANING_OPTIONS", patch: { addSourceColumns: v } })}
            label="Tambahkan kolom _sumber_file & _sumber_sheet"
            hint="Agar tiap baris bisa dilacak berasal dari file & sheet mana"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-neutral-700">2. Tipe tiap kolom target</h3>
        <p className="text-xs text-neutral-500">
          Tentukan tipe supaya pembersihan yang tepat diterapkan (mis. tanggal, angka, atau ID).
        </p>
        <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold text-neutral-500">
                <th className="px-3 py-2">Kolom target</th>
                <th className="px-3 py-2">Tipe</th>
              </tr>
            </thead>
            <tbody>
              {schema.targetColumns.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-3 py-2 font-medium text-neutral-800">{c.name}</td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded border border-neutral-300 px-2 py-1 text-sm"
                      value={c.kind}
                      onChange={(e) => updateColumn(c, { kind: e.target.value as ColumnKind })}
                    >
                      {KIND_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {schema.targetColumns.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-sm text-neutral-400">
                    Belum ada kolom target. Kembali ke Langkah 2 untuk membuat pemetaan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {categoryColumns.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-neutral-700">3. Samakan nilai kategori (find &amp; replace)</h3>
          {categoryColumns.map((col) => {
            const values = collectCategoryValues(sources, schema, col.id);
            return (
              <div key={col.id} className="rounded border border-neutral-200 bg-white p-3">
                <h4 className="mb-2 text-sm font-medium text-neutral-800">{col.name}</h4>
                <div className="flex flex-col gap-1.5">
                  {values.map(({ value, count }) => (
                    <div key={value} className="flex items-center gap-2 text-sm">
                      <span className="w-40 shrink-0 truncate text-neutral-600" title={value}>
                        {value}
                      </span>
                      <span className="w-10 shrink-0 text-xs text-neutral-400">×{count}</span>
                      <span className="text-neutral-300">→</span>
                      <input
                        className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm"
                        placeholder={value}
                        defaultValue={col.categoryMap?.[value.trim().toLowerCase()] ?? ""}
                        onBlur={(e) => setCategoryMapping(col, value, e.target.value)}
                      />
                    </div>
                  ))}
                  {values.length === 0 && (
                    <p className="text-xs text-neutral-400">Belum ada nilai ditemukan untuk kolom ini.</p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-neutral-700">4. Deteksi duplikat</h3>
        <p className="text-xs text-neutral-500">
          Pilih kolom kunci (mis. NIM). Baris dengan nilai kunci sama akan ditampilkan, tidak langsung dihapus.
        </p>
        <div className="flex flex-wrap gap-3">
          {schema.targetColumns.map((c) => (
            <label key={c.id} className="flex items-center gap-1.5 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={cleaningOptions.duplicateKeyColumnIds.includes(c.id)}
                onChange={(e) => {
                  const set = new Set(cleaningOptions.duplicateKeyColumnIds);
                  if (e.target.checked) set.add(c.id);
                  else set.delete(c.id);
                  dispatch({
                    type: "SET_CLEANING_OPTIONS",
                    patch: { duplicateKeyColumnIds: Array.from(set) },
                  });
                }}
              />
              {c.name}
            </label>
          ))}
        </div>

        {report && report.duplicateGroups.length > 0 && processResult && (
          <div className="overflow-x-auto rounded border border-amber-200 bg-amber-50 p-3">
            <p className="mb-2 text-sm font-medium text-amber-800">
              {report.duplicateGroups.length} kelompok duplikat ditemukan
            </p>
            <div className="flex flex-col gap-2">
              {report.duplicateGroups.slice(0, 20).map((group, i) => (
                <div key={i} className="rounded border border-amber-200 bg-white p-2 text-xs">
                  {group.map((rowIdx) => (
                    <div key={rowIdx} className="flex gap-3 py-0.5">
                      {cleaningOptions.duplicateKeyColumnIds.map((colId) => {
                        const col = schema.targetColumns.find((c) => c.id === colId);
                        return (
                          <span key={colId} className="text-neutral-600">
                            <span className="text-neutral-400">{col?.name}: </span>
                            {String(processResult.rows[rowIdx]?.[colId] ?? "")}
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-neutral-700">Laporan Validasi</h3>
        {!report ? (
          <p className="text-sm text-neutral-400">
            Laporan akan muncul setelah kolom target &amp; pemetaan tersedia.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Baris masuk" value={report.rowsIn} />
              <StatCard label="Baris keluar" value={report.rowsOut} />
              <StatCard label="Baris kosong dihapus" value={report.emptyRowsRemoved} />
              <StatCard label="Nilai gagal parse" value={report.parseFailures.length} />
            </div>

            <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold text-neutral-500">
                    <th className="px-3 py-2">Kolom</th>
                    <th className="px-3 py-2">Sel kosong</th>
                  </tr>
                </thead>
                <tbody>
                  {schema.targetColumns.map((c) => (
                    <tr key={c.id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-3 py-2">{c.name}</td>
                      <td className="px-3 py-2">{report.emptyCellsByColumn[c.id] ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {Object.keys(report.missingColumnsByFile).length > 0 && (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="mb-1 font-medium text-amber-800">Kolom yang hilang di sebagian file:</p>
                <ul className="list-inside list-disc text-amber-700">
                  {Object.entries(report.missingColumnsByFile).map(([file, cols]) => (
                    <li key={file}>
                      {file}: {cols.join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-neutral-200 bg-white p-3">
      <div className="text-xl font-semibold text-neutral-800">{value.toLocaleString("id-ID")}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}
