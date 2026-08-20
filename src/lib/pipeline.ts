// Orkestrasi: gabungkan sheet-sheet terpilih sesuai skema pemetaan kolom,
// terapkan opsi pembersihan, dan hasilkan Laporan Validasi.

import {
  excelSerialToISO,
  isCellEmpty,
  isRowEmpty,
  normalizeDate,
  parseIndonesianNumber,
  preserveIdAsText,
  titleCaseName,
  trimAndCollapseSpaces,
  findDuplicateGroups,
} from "./cleaning";
import type {
  CellValue,
  CleaningOptions,
  ColumnMappingEntry,
  MappingSchema,
  OutputRow,
  ParseIssue,
  ProcessResult,
  SheetSelection,
  TargetColumn,
  ValidationReport,
} from "./types";
import { extractHeaders } from "./headerDetect";

export interface SourceSheetInput {
  fileId: string;
  fileName: string;
  sheetName: string;
  sheet: SheetSelection;
}

const SOURCE_FILE_COL = "_sumber_file";
const SOURCE_SHEET_COL = "_sumber_sheet";

export function buildOutput(
  sources: SourceSheetInput[],
  schema: MappingSchema,
  options: CleaningOptions,
): ProcessResult {
  const columns = [...schema.targetColumns];
  const columnIds = columns.map((c) => c.id);

  const emptyCellsByColumn: Record<string, number> = {};
  columnIds.forEach((id) => (emptyCellsByColumn[id] = 0));
  const parseFailures: ParseIssue[] = [];
  const missingColumnsByFile: Record<string, string[]> = {};

  const rawRows: OutputRow[] = [];
  let rowsIn = 0;

  for (const src of sources) {
    const { fileId, fileName, sheetName, sheet } = src;
    const headers = extractHeaders(sheet.grid, sheet.headerRowIndex);

    // kolom target yang ditemukan di sheet ini (untuk laporan "kolom hilang")
    const foundTargetIds = new Set<string>();
    const colIndexByTargetId = new Map<string, number>();
    for (const entry of schema.mappings) {
      if (entry.fileId !== fileId || entry.sheetName !== sheetName) continue;
      if (!entry.targetColumnId) continue;
      const colIdx = headers.indexOf(entry.originalColumn);
      if (colIdx === -1) continue;
      colIndexByTargetId.set(entry.targetColumnId, colIdx);
      foundTargetIds.add(entry.targetColumnId);
    }

    const missing = columnIds.filter((id) => !foundTargetIds.has(id));
    if (missing.length > 0) {
      const names = missing.map((id) => columns.find((c) => c.id === id)?.name ?? id);
      missingColumnsByFile[fileName] = Array.from(
        new Set([...(missingColumnsByFile[fileName] ?? []), ...names]),
      );
    }

    const dataStart = sheet.headerRowIndex + 1;
    for (let r = dataStart; r < sheet.grid.length; r++) {
      const rawRow = sheet.grid[r];
      if (!rawRow || rawRow.every((c) => isCellEmpty(c))) continue;

      rowsIn++;
      const outRow: OutputRow = {};
      for (const col of columns) {
        const colIdx = colIndexByTargetId.get(col.id);
        const raw: CellValue = colIdx === undefined ? null : rawRow[colIdx] ?? null;
        outRow[col.id] = raw;
      }
      if (options.addSourceColumns) {
        outRow[SOURCE_FILE_COL] = fileName;
        outRow[SOURCE_SHEET_COL] = sheetName;
      }
      rawRows.push(outRow);
    }
  }

  // Terapkan pembersihan per kolom sesuai kind
  const cleanedRows: OutputRow[] = rawRows.map((row, rowIdx) => {
    const out: OutputRow = { ...row };
    for (const col of columns) {
      let value = row[col.id];

      if (options.trimSpaces) {
        value = trimAndCollapseSpaces(value);
      }

      switch (col.kind) {
        case "id": {
          if (options.preserveIdAsText) {
            value = preserveIdAsText(value);
          }
          break;
        }
        case "nama": {
          if (options.titleCaseNames) {
            value = titleCaseName(value);
          }
          break;
        }
        case "tanggal": {
          if (options.normalizeDates && !isCellEmpty(value)) {
            const iso = normalizeDate(value);
            if (iso === null) {
              parseFailures.push({
                targetColumnId: col.id,
                rowIndex: rowIdx,
                rawValue: value,
                reason: "Format tanggal tidak dikenali",
              });
            } else {
              value = iso;
            }
          }
          break;
        }
        case "angka": {
          if (options.normalizeNumbers && !isCellEmpty(value)) {
            const n = parseIndonesianNumber(value);
            if (n === null) {
              parseFailures.push({
                targetColumnId: col.id,
                rowIndex: rowIdx,
                rawValue: value,
                reason: "Format angka tidak dikenali",
              });
            } else {
              value = n;
            }
          }
          break;
        }
        case "kategori": {
          if (col.categoryMap && typeof value === "string") {
            const key = value.trim().toLowerCase();
            if (col.categoryMap[key] !== undefined) {
              value = col.categoryMap[key];
            }
          }
          break;
        }
        default:
          break;
      }

      out[col.id] = value;
    }
    return out;
  });

  // Hapus baris kosong bila diminta (kosong = semua kolom target kosong)
  let finalRows = cleanedRows;
  let emptyRowsRemoved = 0;
  if (options.removeEmptyRows) {
    const before = finalRows.length;
    finalRows = finalRows.filter((row) => !isRowEmpty(row, columnIds));
    emptyRowsRemoved = before - finalRows.length;
  }

  // Hitung sel kosong per kolom pada data akhir
  for (const row of finalRows) {
    for (const id of columnIds) {
      if (isCellEmpty(row[id])) emptyCellsByColumn[id]++;
    }
  }

  const duplicateGroups = findDuplicateGroups(finalRows, options.duplicateKeyColumnIds);

  const report: ValidationReport = {
    rowsIn,
    rowsOut: finalRows.length,
    emptyRowsRemoved,
    emptyCellsByColumn,
    parseFailures,
    duplicateGroups,
    missingColumnsByFile,
  };

  const outputColumns: TargetColumn[] = options.addSourceColumns
    ? [
        ...columns,
        { id: SOURCE_FILE_COL, name: SOURCE_FILE_COL, kind: "teks" },
        { id: SOURCE_SHEET_COL, name: SOURCE_SHEET_COL, kind: "teks" },
      ]
    : columns;

  return { columns: outputColumns, rows: finalRows, report };
}

export { excelSerialToISO };
export const SOURCE_COLUMNS = { file: SOURCE_FILE_COL, sheet: SOURCE_SHEET_COL };

/** Pemetaan default nama kolom mentah -> ColumnMappingEntry helper. */
export function buildMappingEntry(
  fileId: string,
  sheetName: string,
  originalColumn: string,
  targetColumnId: string | null,
): ColumnMappingEntry {
  return { fileId, sheetName, originalColumn, targetColumnId };
}
