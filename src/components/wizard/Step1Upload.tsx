"use client";

import { useCallback, useRef, useState } from "react";
import type { Dispatch } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { generateSampleFiles } from "@/lib/sampleData";
import type { ParsedSheet, SheetSelection, UploadedFileState } from "@/lib/types";
import { parseFilesInWorker } from "@/lib/worker/parseClient";
import type { WizardAction } from "@/state/useWizardState";

const ACCEPTED_EXT = [".xlsx", ".xls", ".csv"];

function extOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx).toLowerCase();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toSheetSelections(sheets: ParsedSheet[]): SheetSelection[] {
  return sheets.map((s) => ({
    sheetName: s.sheetName,
    selected: true,
    headerRowIndex: s.suggestedHeaderRow,
    grid: s.grid,
    rowCount: s.rowCount,
    colCount: s.colCount,
  }));
}

function statusBadge(status: UploadedFileState["status"]) {
  const map: Record<UploadedFileState["status"], string> = {
    pending: "bg-neutral-100 text-neutral-600",
    parsing: "bg-accent-50 text-accent-700",
    parsed: "bg-green-50 text-green-700",
    error: "bg-red-50 text-red-700",
  };
  const label: Record<UploadedFileState["status"], string> = {
    pending: "Menunggu",
    parsing: "Memproses…",
    parsed: "Siap",
    error: "Gagal",
  };
  return (
    <span className={cn("rounded px-2 py-0.5 text-xs font-medium", map[status])}>
      {label[status]}
    </span>
  );
}

export function Step1Upload({
  files,
  dispatch,
}: {
  files: UploadedFileState[];
  dispatch: Dispatch<WizardAction>;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ingestFiles = useCallback(
    (list: File[]) => {
      const accepted = list.filter((f) => ACCEPTED_EXT.includes(extOf(f.name)));
      const rejected = list.filter((f) => !ACCEPTED_EXT.includes(extOf(f.name)));

      if (accepted.length === 0 && rejected.length > 0) {
        alert(
          `Format file tidak didukung: ${rejected.map((f) => f.name).join(", ")}. Hanya .xlsx, .xls, dan .csv yang didukung.`,
        );
        return;
      }

      const entries = accepted.map((file) => ({ id: crypto.randomUUID(), file }));
      dispatch({ type: "ADD_FILES", entries });
      entries.forEach((e) => dispatch({ type: "SET_FILE_PARSING", fileId: e.id }));

      parseFilesInWorker(entries, (ev) => {
        if (ev.status === "done" && ev.sheets) {
          dispatch({ type: "SET_FILE_PARSED", fileId: ev.fileId, sheets: toSheetSelections(ev.sheets) });
        } else if (ev.status === "error") {
          dispatch({ type: "SET_FILE_ERROR", fileId: ev.fileId, error: ev.error ?? "Gagal memproses file." });
        }
      }).catch(() => {
        entries.forEach((e) =>
          dispatch({ type: "SET_FILE_ERROR", fileId: e.id, error: "Terjadi kesalahan tak terduga saat memproses file." }),
        );
      });

      if (rejected.length > 0) {
        alert(
          `${rejected.length} file dilewati karena formatnya tidak didukung: ${rejected.map((f) => f.name).join(", ")}`,
        );
      }
    },
    [dispatch],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      ingestFiles(Array.from(e.dataTransfer.files));
    },
    [ingestFiles],
  );

  const handleLoadSample = useCallback(() => {
    ingestFiles(generateSampleFiles());
  }, [ingestFiles]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded border border-accent-100 bg-accent-50 px-4 py-3 text-sm text-accent-800">
        <strong>Privasi terjaga:</strong> semua pemrosesan file terjadi langsung di browser Anda.
        Tidak ada file yang diunggah ke server mana pun — cocok untuk data internal kampus.
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded border-2 border-dashed px-6 py-14 text-center transition-colors",
          isDragging ? "border-accent-500 bg-accent-50" : "border-neutral-300 bg-white hover:border-accent-300",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXT.join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) ingestFiles(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
        <div className="text-4xl">📄</div>
        <p className="text-sm font-medium text-neutral-800">
          Tarik &amp; lepas file di sini, atau klik untuk memilih
        </p>
        <p className="text-xs text-neutral-500">Mendukung .xlsx, .xls, dan .csv — bisa banyak file sekaligus</p>
        <Button
          variant="secondary"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleLoadSample();
          }}
        >
          Muat data contoh
        </Button>
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-neutral-700">File yang diunggah ({files.length})</h3>
          <div className="flex flex-col divide-y divide-neutral-200 rounded border border-neutral-200 bg-white">
            {files.map((f) => (
              <div key={f.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium text-neutral-800">{f.name}</span>
                    <span className="shrink-0 text-xs text-neutral-500">{formatSize(f.size)}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {statusBadge(f.status)}
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "REMOVE_FILE", fileId: f.id })}
                      className="text-xs text-neutral-400 hover:text-red-600"
                      aria-label={`Hapus ${f.name}`}
                    >
                      Hapus
                    </button>
                  </div>
                </div>

                {f.status === "error" && (
                  <p className="text-xs text-red-600">{f.error}</p>
                )}

                {f.status === "parsed" && f.sheets.length > 1 && (
                  <div className="flex flex-wrap gap-3 pl-1">
                    {f.sheets.map((s) => (
                      <label key={s.sheetName} className="flex items-center gap-1.5 text-xs text-neutral-700">
                        <input
                          type="checkbox"
                          checked={s.selected}
                          onChange={() => dispatch({ type: "TOGGLE_SHEET", fileId: f.id, sheetName: s.sheetName })}
                        />
                        {s.sheetName}
                        <span className="text-neutral-400">({s.rowCount} baris)</span>
                      </label>
                    ))}
                  </div>
                )}
                {f.status === "parsed" && f.sheets.length === 1 && (
                  <p className="pl-1 text-xs text-neutral-500">
                    Sheet &ldquo;{f.sheets[0].sheetName}&rdquo; · {f.sheets[0].rowCount} baris
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
