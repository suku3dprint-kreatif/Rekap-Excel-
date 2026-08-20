import type { CellValue } from "./types";

const MAX_SCAN_ROWS = 20;

function isEmptyCell(v: CellValue): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

function looksLikeNumber(v: CellValue): boolean {
  if (typeof v === "number") return true;
  if (typeof v === "string") return /^-?\d+([.,]\d+)?$/.test(v.trim());
  return false;
}

function nonEmptyCount(row: CellValue[]): number {
  return row.filter((c) => !isEmptyCell(c)).length;
}

/**
 * Deteksi baris header secara heuristik: baris header biasanya berisi banyak sel teks unik,
 * bukan angka, dan diikuti oleh baris-baris yang punya kepadatan data yang sama/lebih tinggi
 * (baris data), sedangkan baris di atasnya (judul/kop surat) biasanya hanya punya 1-2 sel terisi.
 */
export function detectHeaderRow(grid: CellValue[][]): number {
  if (grid.length === 0) return 0;
  const scanLimit = Math.min(grid.length, MAX_SCAN_ROWS);
  const widths = grid.slice(0, scanLimit).map(nonEmptyCount);
  const maxWidth = Math.max(...widths, 1);

  let bestIdx = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < scanLimit; i++) {
    const row = grid[i];
    const filled = widths[i];
    if (filled < 2) continue; // kop surat / judul biasanya cuma 1 sel

    const textCells = row.filter((c) => !isEmptyCell(c) && !looksLikeNumber(c)).length;
    const uniqueCells = new Set(
      row.filter((c) => !isEmptyCell(c)).map((c) => String(c).trim().toLowerCase()),
    ).size;

    // Baris berikutnya harus ada data (bukan baris kosong / baris terakhir)
    const nextRow = grid[i + 1];
    const nextFilled = nextRow ? nonEmptyCount(nextRow) : 0;
    const hasDataBelow = nextFilled >= Math.max(2, filled - 1);

    let score = 0;
    score += (filled / maxWidth) * 3; // lebar baris relatif
    score += (textCells / Math.max(filled, 1)) * 2; // dominan teks
    score += (uniqueCells / Math.max(filled, 1)) * 1.5; // sel unik (bukan sel gabungan berulang)
    if (hasDataBelow) score += 2;
    score -= i * 0.05; // sedikit preferensi ke baris lebih awal

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/** Ambil nama-nama kolom dari grid pada baris header tertentu, ganti sel kosong dengan "Kolom N". */
export function extractHeaders(grid: CellValue[][], headerRowIndex: number): string[] {
  const row = grid[headerRowIndex] ?? [];
  const colCount = Math.max(...grid.map((r) => r.length), row.length, 0);
  const headers: string[] = [];
  for (let i = 0; i < colCount; i++) {
    const v = row[i];
    if (isEmptyCell(v)) {
      headers.push(`Kolom ${i + 1}`);
    } else {
      headers.push(String(v).trim());
    }
  }
  return headers;
}
