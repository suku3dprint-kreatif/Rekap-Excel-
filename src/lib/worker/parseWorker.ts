// Web Worker: membaca file .xlsx/.xls/.csv memakai SheetJS di luar main thread,
// supaya UI tidak macet saat memproses file besar (puluhan ribu baris).

import * as XLSX from "xlsx";
import { detectHeaderRow } from "../headerDetect";
import type { CellValue, ParsedSheet } from "../types";

export interface ParseWorkerRequestFile {
  id: string;
  name: string;
  buffer: ArrayBuffer;
}

export interface ParseWorkerRequest {
  type: "parse";
  files: ParseWorkerRequestFile[];
}

export type ParseWorkerResponse =
  | { type: "progress"; fileId: string; fileName: string; status: "done"; sheets: ParsedSheet[] }
  | { type: "progress"; fileId: string; fileName: string; status: "error"; error: string }
  | { type: "complete" };

function isCsv(name: string): boolean {
  return /\.csv$/i.test(name);
}

function decodeText(buffer: ArrayBuffer): string {
  let text = new TextDecoder("utf-8").decode(buffer);
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // buang BOM
  return text;
}

function parseOneFile(id: string, name: string, buffer: ArrayBuffer): ParsedSheet[] {
  let workbook: XLSX.WorkBook;
  try {
    if (isCsv(name)) {
      workbook = XLSX.read(decodeText(buffer), { type: "string", raw: true });
    } else {
      workbook = XLSX.read(buffer, { type: "array", raw: true, cellDates: false });
    }
  } catch (e) {
    throw new Error(
      `Gagal membaca file "${name}". File mungkin rusak atau formatnya tidak didukung.`,
    );
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error(`File "${name}" tidak memiliki sheet yang bisa dibaca.`);
  }

  const sheets: ParsedSheet[] = [];
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws || !ws["!ref"]) continue; // sheet kosong

    const grid = XLSX.utils.sheet_to_json<CellValue[]>(ws, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });

    if (grid.length === 0) continue;

    const colCount = grid.reduce((max, row) => Math.max(max, row.length), 0);
    const suggestedHeaderRow = detectHeaderRow(grid);

    sheets.push({
      fileId: id,
      fileName: name,
      sheetName,
      grid,
      suggestedHeaderRow,
      rowCount: grid.length,
      colCount,
    });
  }

  if (sheets.length === 0) {
    throw new Error(`File "${name}" tidak memiliki data (semua sheet kosong).`);
  }

  return sheets;
}

self.onmessage = (ev: MessageEvent<ParseWorkerRequest>) => {
  const msg = ev.data;
  if (msg.type !== "parse") return;

  for (const f of msg.files) {
    try {
      const sheets = parseOneFile(f.id, f.name, f.buffer);
      const response: ParseWorkerResponse = {
        type: "progress",
        fileId: f.id,
        fileName: f.name,
        status: "done",
        sheets,
      };
      (self as unknown as Worker).postMessage(response);
    } catch (e) {
      const response: ParseWorkerResponse = {
        type: "progress",
        fileId: f.id,
        fileName: f.name,
        status: "error",
        error: e instanceof Error ? e.message : "Gagal memproses file.",
      };
      (self as unknown as Worker).postMessage(response);
    }
  }

  const done: ParseWorkerResponse = { type: "complete" };
  (self as unknown as Worker).postMessage(done);
};
