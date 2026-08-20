// Tipe data inti yang dipakai di seluruh aplikasi Rekap Cepat.

export type CellValue = string | number | boolean | null;

export interface ParsedSheet {
  fileId: string;
  fileName: string;
  sheetName: string;
  /** Grid mentah hasil sheet_to_json({ header: 1 }) - baris x kolom, belum ada pemetaan header. */
  grid: CellValue[][];
  /** Indeks baris header hasil deteksi otomatis (0-based). */
  suggestedHeaderRow: number;
  rowCount: number;
  colCount: number;
}

export interface ParsedFileResult {
  fileId: string;
  fileName: string;
  size: number;
  sheets: ParsedSheet[];
  error?: string;
}

export interface UploadedFileState {
  id: string;
  file: File;
  name: string;
  size: number;
  status: "pending" | "parsing" | "parsed" | "error";
  error?: string;
  sheets: SheetSelection[];
}

export interface SheetSelection {
  sheetName: string;
  selected: boolean;
  headerRowIndex: number;
  grid: CellValue[][];
  rowCount: number;
  colCount: number;
}

/** Kunci unik untuk satu sheet yang dipilih dari satu file. */
export interface SourceRef {
  fileId: string;
  fileName: string;
  sheetName: string;
}

export type ColumnKind = "teks" | "nama" | "id" | "tanggal" | "angka" | "kategori";

export interface TargetColumn {
  id: string;
  name: string;
  kind: ColumnKind;
  /** Untuk kind === 'kategori': peta nilai asli (dinormalisasi) -> nilai standar. */
  categoryMap?: Record<string, string>;
}

/** Pemetaan dari (sheet, nama kolom asli) ke id kolom target. */
export interface ColumnMappingEntry {
  fileId: string;
  sheetName: string;
  originalColumn: string;
  targetColumnId: string | null; // null = tidak dipetakan / diabaikan
}

export interface MappingSchema {
  version: 1;
  targetColumns: TargetColumn[];
  mappings: ColumnMappingEntry[];
}

export interface CleaningOptions {
  trimSpaces: boolean;
  titleCaseNames: boolean;
  preserveIdAsText: boolean;
  normalizeDates: boolean;
  normalizeNumbers: boolean;
  removeEmptyRows: boolean;
  addSourceColumns: boolean;
  duplicateKeyColumnIds: string[];
}

export interface ParseIssue {
  targetColumnId: string;
  rowIndex: number;
  rawValue: CellValue;
  reason: string;
}

export interface ValidationReport {
  rowsIn: number;
  rowsOut: number;
  emptyRowsRemoved: number;
  emptyCellsByColumn: Record<string, number>;
  parseFailures: ParseIssue[];
  duplicateGroups: number[][]; // kelompok indeks baris (di data akhir) yang duplikat
  missingColumnsByFile: Record<string, string[]>; // fileName -> daftar target column yang tidak ditemukan
}

export interface OutputRow {
  [targetColumnId: string]: CellValue;
}

export interface ProcessResult {
  columns: TargetColumn[];
  rows: OutputRow[];
  report: ValidationReport;
}

export type AggregationType = "count" | "sum" | "avg" | "min" | "max" | "countUnique";

export interface PivotConfig {
  groupByColumnId: string | null;
  valueColumnId: string | null;
  aggregation: AggregationType;
}

export interface PivotResultRow {
  group: string;
  value: number;
}
