import * as XLSX from "xlsx";
import type { OutputRow, PivotConfig, PivotResultRow, ProcessResult, TargetColumn } from "./types";

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function defaultExportFileName(ext: "xlsx" | "csv"): string {
  return `rekap-${todayStr()}.${ext}`;
}

function rowsToAoa(columns: TargetColumn[], rows: OutputRow[]): unknown[][] {
  const header = columns.map((c) => c.name);
  const body = rows.map((row) => columns.map((c) => row[c.id] ?? ""));
  return [header, ...body];
}

function buildValidationSheetRows(result: ProcessResult): unknown[][] {
  const { report, columns } = result;
  const rows: unknown[][] = [];
  rows.push(["Laporan Validasi Rekap Cepat"]);
  rows.push([]);
  rows.push(["Ringkasan", ""]);
  rows.push(["Jumlah baris masuk", report.rowsIn]);
  rows.push(["Jumlah baris keluar", report.rowsOut]);
  rows.push(["Baris kosong dihapus", report.emptyRowsRemoved]);
  rows.push(["Nilai gagal di-parse", report.parseFailures.length]);
  rows.push(["Kelompok duplikat ditemukan", report.duplicateGroups.length]);
  rows.push([]);

  rows.push(["Sel kosong per kolom", ""]);
  rows.push(["Kolom", "Jumlah sel kosong"]);
  for (const col of columns) {
    rows.push([col.name, report.emptyCellsByColumn[col.id] ?? 0]);
  }
  rows.push([]);

  if (Object.keys(report.missingColumnsByFile).length > 0) {
    rows.push(["Kolom yang hilang di sebagian file", ""]);
    rows.push(["File", "Kolom yang hilang"]);
    for (const [file, cols] of Object.entries(report.missingColumnsByFile)) {
      rows.push([file, cols.join(", ")]);
    }
    rows.push([]);
  }

  if (report.parseFailures.length > 0) {
    rows.push(["Detail nilai gagal di-parse (maks. 200 pertama)", ""]);
    rows.push(["Kolom", "Baris ke-", "Nilai asli", "Alasan"]);
    for (const f of report.parseFailures.slice(0, 200)) {
      const colName = columns.find((c) => c.id === f.targetColumnId)?.name ?? f.targetColumnId;
      rows.push([colName, f.rowIndex + 1, String(f.rawValue ?? ""), f.reason]);
    }
  }

  return rows;
}

function buildSummarySheetRows(
  pivot: { config: PivotConfig; rows: PivotResultRow[]; groupLabel: string; valueLabel: string } | null,
): unknown[][] {
  if (!pivot || pivot.rows.length === 0) {
    return [["Ringkasan"], [], ["Belum ada ringkasan/pivot yang dibuat."]];
  }
  const rows: unknown[][] = [["Ringkasan"], []];
  rows.push([pivot.groupLabel, pivot.valueLabel]);
  for (const r of pivot.rows) rows.push([r.group, r.value]);
  return rows;
}

export function exportToXlsx(
  result: ProcessResult,
  pivot: { config: PivotConfig; rows: PivotResultRow[]; groupLabel: string; valueLabel: string } | null,
): void {
  const wb = XLSX.utils.book_new();

  const dataSheet = XLSX.utils.aoa_to_sheet(rowsToAoa(result.columns, result.rows));
  XLSX.utils.book_append_sheet(wb, dataSheet, "Data");

  const summarySheet = XLSX.utils.aoa_to_sheet(buildSummarySheetRows(pivot));
  XLSX.utils.book_append_sheet(wb, summarySheet, "Ringkasan");

  const validationSheet = XLSX.utils.aoa_to_sheet(buildValidationSheetRows(result));
  XLSX.utils.book_append_sheet(wb, validationSheet, "Laporan Validasi");

  XLSX.writeFile(wb, defaultExportFileName("xlsx"));
}

export function exportToCsv(result: ProcessResult): void {
  const ws = XLSX.utils.aoa_to_sheet(rowsToAoa(result.columns, result.rows));
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultExportFileName("csv");
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyResultToClipboard(columns: TargetColumn[], rows: OutputRow[]): Promise<void> {
  const header = columns.map((c) => c.name).join("\t");
  const body = rows.map((row) => columns.map((c) => row[c.id] ?? "").join("\t")).join("\n");
  const text = `${header}\n${body}`;
  await navigator.clipboard.writeText(text);
}
