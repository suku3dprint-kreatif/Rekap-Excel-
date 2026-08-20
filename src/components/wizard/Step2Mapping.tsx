"use client";

import { useMemo, useRef, useState } from "react";
import type { Dispatch } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { extractHeaders } from "@/lib/headerDetect";
import {
  exportMappingAsJson,
  loadMappingFromLocalStorage,
  parseMappingJsonFile,
  saveMappingToLocalStorage,
} from "@/lib/mappingStorage";
import { collectSelectedColumnOccurrences, autoSuggestSchema } from "@/lib/autoMapping";
import type { CellValue, MappingSchema, UploadedFileState } from "@/lib/types";
import type { WizardAction } from "@/state/useWizardState";

function cellText(v: CellValue): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function HeaderPreview({
  file,
  sheetName,
  grid,
  headerRowIndex,
  onChangeHeaderRow,
}: {
  file: UploadedFileState;
  sheetName: string;
  grid: CellValue[][];
  headerRowIndex: number;
  onChangeHeaderRow: (rowIndex: number) => void;
}) {
  const previewRows = grid.slice(0, 10);
  const colCount = Math.min(8, Math.max(...previewRows.map((r) => r.length), 1));
  const candidateCount = Math.min(grid.length, 15);

  return (
    <div className="rounded border border-neutral-200 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-medium text-neutral-800">{file.name}</span>
          <span className="text-neutral-400"> — sheet &ldquo;{sheetName}&rdquo;</span>
        </div>
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          Baris header:
          <select
            className="rounded border border-neutral-300 px-2 py-1 text-xs"
            value={headerRowIndex}
            onChange={(e) => onChangeHeaderRow(Number(e.target.value))}
          >
            {Array.from({ length: candidateCount }).map((_, i) => (
              <option key={i} value={i}>
                Baris {i + 1}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <tbody>
            {previewRows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className={cn(
                  rIdx === headerRowIndex ? "bg-accent-50 font-semibold text-accent-800" : "text-neutral-600",
                )}
              >
                <td className="w-8 border-b border-neutral-100 px-2 py-1 text-neutral-400">{rIdx + 1}</td>
                {Array.from({ length: colCount }).map((_, cIdx) => (
                  <td key={cIdx} className="max-w-[10rem] truncate border-b border-neutral-100 px-2 py-1">
                    {cellText(row[cIdx])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Step2Mapping({
  files,
  schema,
  dispatch,
}: {
  files: UploadedFileState[];
  schema: MappingSchema;
  dispatch: Dispatch<WizardAction>;
}) {
  const [newColumnName, setNewColumnName] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  const selectedSheets = useMemo(
    () =>
      files
        .filter((f) => f.status === "parsed")
        .flatMap((f) => f.sheets.filter((s) => s.selected).map((s) => ({ file: f, sheet: s }))),
    [files],
  );

  const occurrences = useMemo(() => collectSelectedColumnOccurrences(files), [files]);

  const uniqueColumns = useMemo(() => {
    const map = new Map<string, { name: string; sources: { fileName: string; sheetName: string }[] }>();
    for (const occ of occurrences) {
      const existing = map.get(occ.originalColumn);
      if (existing) {
        existing.sources.push({ fileName: occ.fileName, sheetName: occ.sheetName });
      } else {
        map.set(occ.originalColumn, {
          name: occ.originalColumn,
          sources: [{ fileName: occ.fileName, sheetName: occ.sheetName }],
        });
      }
    }
    return Array.from(map.values());
  }, [occurrences]);

  function sampleValueFor(originalColumn: string, sources: { fileName: string; sheetName: string }[]): string {
    for (const src of sources) {
      const match = selectedSheets.find(
        (s) => s.file.name === src.fileName && s.sheet.sheetName === src.sheetName,
      );
      if (!match) continue;
      const headers = extractHeaders(match.sheet.grid, match.sheet.headerRowIndex);
      const colIdx = headers.indexOf(originalColumn);
      if (colIdx === -1) continue;
      for (let r = match.sheet.headerRowIndex + 1; r < match.sheet.grid.length; r++) {
        const v = match.sheet.grid[r]?.[colIdx];
        if (v !== null && v !== undefined && String(v).trim() !== "") return String(v);
      }
    }
    return "";
  }

  function targetIdForName(originalColumn: string): string | null {
    const entry = schema.mappings.find((m) => m.originalColumn === originalColumn);
    return entry ? entry.targetColumnId : null;
  }

  function setTargetForName(originalColumn: string, targetColumnId: string | null) {
    const relevantSources = occurrences.filter((o) => o.originalColumn === originalColumn);
    for (const occ of relevantSources) {
      dispatch({
        type: "SET_MAPPING",
        fileId: occ.fileId,
        sheetName: occ.sheetName,
        originalColumn: occ.originalColumn,
        targetColumnId,
      });
    }
  }

  function handleAddColumn() {
    const name = newColumnName.trim();
    if (!name) return;
    dispatch({ type: "UPSERT_TARGET_COLUMN", column: { id: crypto.randomUUID(), name, kind: "teks" } });
    setNewColumnName("");
  }

  function handleAutoSuggest() {
    if (schema.targetColumns.length > 0) {
      const ok = confirm("Ini akan mengganti skema pemetaan yang sudah ada. Lanjutkan?");
      if (!ok) return;
    }
    dispatch({ type: "SET_SCHEMA", schema: autoSuggestSchema(files) });
  }

  function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    file.text().then((text) => {
      try {
        const parsed = parseMappingJsonFile(text);
        dispatch({ type: "SET_SCHEMA", schema: parsed });
      } catch {
        alert("Gagal membaca skema pemetaan. Pastikan berkas JSON valid hasil ekspor Rekap Cepat.");
      }
    });
  }

  function handleLoadSaved() {
    const saved = loadMappingFromLocalStorage();
    if (!saved) {
      alert("Belum ada skema pemetaan tersimpan di perangkat ini.");
      return;
    }
    dispatch({ type: "SET_SCHEMA", schema: saved });
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-neutral-700">
          1. Periksa baris header (10 baris pertama tiap sheet)
        </h3>
        <p className="text-xs text-neutral-500">
          Baris header terdeteksi otomatis (disorot). Ubah lewat dropdown bila kop surat/judul membuat
          deteksi meleset.
        </p>
        <div className="flex flex-col gap-3">
          {selectedSheets.map(({ file, sheet }) => (
            <HeaderPreview
              key={`${file.id}-${sheet.sheetName}`}
              file={file}
              sheetName={sheet.sheetName}
              grid={sheet.grid}
              headerRowIndex={sheet.headerRowIndex}
              onChangeHeaderRow={(rowIndex) =>
                dispatch({ type: "SET_HEADER_ROW", fileId: file.id, sheetName: sheet.sheetName, rowIndex })
              }
            />
          ))}
          {selectedSheets.length === 0 && (
            <p className="text-sm text-neutral-400">Belum ada sheet terpilih dari Langkah 1.</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-neutral-700">2. Petakan kolom ke nama target</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleAutoSuggest} type="button">
              Buat saran otomatis
            </Button>
            <Button variant="ghost" onClick={() => saveMappingToLocalStorage(schema)} type="button">
              Simpan skema
            </Button>
            <Button variant="ghost" onClick={handleLoadSaved} type="button">
              Muat skema tersimpan
            </Button>
            <Button variant="ghost" onClick={() => exportMappingAsJson(schema)} type="button">
              Ekspor JSON
            </Button>
            <Button variant="ghost" onClick={() => importInputRef.current?.click()} type="button">
              Impor JSON
            </Button>
            <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJson} />
          </div>
        </div>

        <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold text-neutral-500">
                <th className="px-3 py-2">Nama kolom asli</th>
                <th className="px-3 py-2">Sumber</th>
                <th className="px-3 py-2">Contoh nilai</th>
                <th className="px-3 py-2">Kolom target</th>
              </tr>
            </thead>
            <tbody>
              {uniqueColumns.map(({ name, sources }) => (
                <tr key={name} className="border-b border-neutral-100 last:border-0">
                  <td className="px-3 py-2 font-medium text-neutral-800">{name}</td>
                  <td className="px-3 py-2 text-xs text-neutral-500">
                    {Array.from(new Set(sources.map((s) => s.fileName))).join(", ")}
                  </td>
                  <td className="max-w-[12rem] truncate px-3 py-2 text-xs text-neutral-500">
                    {sampleValueFor(name, sources)}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="w-full min-w-[10rem] rounded border border-neutral-300 px-2 py-1 text-sm"
                      value={targetIdForName(name) ?? ""}
                      onChange={(e) => setTargetForName(name, e.target.value === "" ? null : e.target.value)}
                    >
                      <option value="">— Abaikan kolom ini —</option>
                      {schema.targetColumns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {uniqueColumns.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-neutral-400">
                    Belum ada kolom untuk dipetakan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-500">Tambah kolom target baru:</span>
          <input
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
            placeholder="mis. NIM"
            className="rounded border border-neutral-300 px-2 py-1 text-sm"
          />
          <Button variant="secondary" type="button" onClick={handleAddColumn}>
            Tambah
          </Button>
        </div>

        {schema.targetColumns.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {schema.targetColumns.map((c) => (
              <span
                key={c.id}
                className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-700"
              >
                {c.name}
                <button
                  type="button"
                  onClick={() => dispatch({ type: "REMOVE_TARGET_COLUMN", id: c.id })}
                  className="text-neutral-400 hover:text-red-600"
                  aria-label={`Hapus kolom ${c.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
