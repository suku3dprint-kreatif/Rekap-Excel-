import type { CellValue, OutputRow } from "./types";

/* ------------------------------------------------------------------ */
/* Trim & spasi                                                        */
/* ------------------------------------------------------------------ */

/** Hapus spasi di awal/akhir dan rapikan spasi ganda di tengah menjadi satu spasi. */
export function trimAndCollapseSpaces(value: CellValue): CellValue {
  if (typeof value !== "string") return value;
  return value.trim().replace(/\s+/g, " ");
}

/* ------------------------------------------------------------------ */
/* Title case nama, menghormati singkatan gelar                        */
/* ------------------------------------------------------------------ */

const ROMAN_NUMERAL_RE = /^[IVXLCDM]+$/;

function capitalizeWord(word: string): string {
  if (word.length === 0) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function titleCaseToken(rawToken: string): string {
  if (rawToken.length === 0) return rawToken;

  // Gelar/singkatan seperti "S.Pd", "M.Si", "S.E", "Dr." -> pertahankan pola per-segmen.
  if (rawToken.includes(".")) {
    return rawToken
      .split(".")
      .map((seg) => (seg.length <= 1 ? seg.toUpperCase() : capitalizeWord(seg)))
      .join(".");
  }

  // Angka romawi (mis. "III", "IV") pada suffix nama - pertahankan huruf besar
  // hanya jika token aslinya memang sudah huruf besar semua, supaya kata biasa
  // seperti "di" atau "id" tidak ikut ter-uppercase.
  if (rawToken.length <= 4 && rawToken === rawToken.toUpperCase() && ROMAN_NUMERAL_RE.test(rawToken)) {
    return rawToken;
  }

  if (rawToken.includes("-")) {
    return rawToken.split("-").map(capitalizeWord).join("-");
  }

  return capitalizeWord(rawToken);
}

/** Rapikan kapitalisasi nama menjadi Title Case sambil menghormati singkatan gelar. */
export function titleCaseName(value: CellValue): CellValue {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return value;
  return trimmed
    .split(/\s+/)
    .map(titleCaseToken)
    .join(" ");
}

/* ------------------------------------------------------------------ */
/* ID (NIM/NIP/NIK/telepon) sebagai teks                               */
/* ------------------------------------------------------------------ */

/** Ubah angka menjadi representasi desimal penuh, hindari notasi ilmiah (mis. 1e+21). */
function numberToPlainString(n: number): string {
  if (Number.isInteger(n) && Math.abs(n) < 1e21) {
    return n.toFixed(0);
  }
  return n.toString();
}

/**
 * Pastikan nilai ID (NIM/NIP/NIK/telepon) selalu berupa teks, tanpa notasi ilmiah
 * dan tanpa desimal ".0" yang tidak perlu. Angka 0 di depan hanya bisa dipertahankan
 * jika nilai sumbernya memang sudah berupa teks (bila sumbernya sudah berupa angka
 * di file asal, angka nol di depan sudah hilang sebelum sampai ke aplikasi ini).
 */
export function preserveIdAsText(value: CellValue | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return numberToPlainString(value);
  return String(value).trim();
}

/* ------------------------------------------------------------------ */
/* Tanggal                                                              */
/* ------------------------------------------------------------------ */

const MONTHS_ID: Record<string, string> = {
  januari: "01",
  jan: "01",
  februari: "02",
  feb: "02",
  maret: "03",
  mar: "03",
  april: "04",
  apr: "04",
  mei: "05",
  may: "05",
  juni: "06",
  jun: "06",
  juli: "07",
  jul: "07",
  agustus: "08",
  agu: "08",
  ags: "08",
  aug: "08",
  september: "09",
  sep: "09",
  sept: "09",
  oktober: "10",
  okt: "10",
  oct: "10",
  november: "11",
  nov: "11",
  desember: "12",
  des: "12",
  dec: "12",
};

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function isValidYMD(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1000 || y > 3000) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Konversi serial number tanggal Excel (basis 1899-12-30) ke ISO YYYY-MM-DD. */
export function excelSerialToISO(serial: number): string | null {
  if (!Number.isFinite(serial)) return null;
  const utcDays = Math.floor(serial - 25569);
  const utcMs = utcDays * 86400 * 1000;
  const date = new Date(utcMs);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/**
 * Normalisasi berbagai format tanggal ke ISO YYYY-MM-DD. Mendukung serial number Excel,
 * "DD/MM/YYYY", "DD-MM-YYYY", "YYYY-MM-DD", dan "12 Maret 2024" (nama bulan Indonesia).
 * Mengembalikan null bila gagal di-parse.
 */
export function normalizeDate(value: CellValue): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    return excelSerialToISO(value);
  }

  const str = String(value).trim();
  if (str === "") return null;

  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    if (isValidYMD(+y, +mo, +d)) return `${y}-${pad2(+mo)}-${pad2(+d)}`;
  }

  m = str.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (m) {
    const [, d, monthName, y] = m;
    const mo = MONTHS_ID[monthName.toLowerCase()];
    if (mo && isValidYMD(+y, +mo, +d)) return `${y}-${mo}-${pad2(+d)}`;
  }

  m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const [, a, b, y] = m;
    let day = +a;
    let month = +b;
    if (month > 12 && day <= 12) {
      [day, month] = [month, day];
    }
    if (isValidYMD(+y, month, day)) return `${y}-${pad2(month)}-${pad2(day)}`;
  }

  m = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    if (isValidYMD(+y, +mo, +d)) return `${y}-${pad2(+mo)}-${pad2(+d)}`;
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Angka bergaya Indonesia                                             */
/* ------------------------------------------------------------------ */

/**
 * Parse angka bergaya Indonesia, mis. "1.250,50" -> 1250.5, "Rp 1.000" -> 1000.
 * Mendeteksi apakah titik/koma berperan sebagai pemisah ribuan atau desimal
 * berdasarkan jumlah pemisah dan banyaknya digit setelah pemisah terakhir.
 * Mengembalikan null bila nilai tidak bisa di-parse sebagai angka.
 */
export function parseIndonesianNumber(raw: CellValue): number | null {
  if (typeof raw === "number") return raw;
  if (raw === null || raw === undefined) return null;

  let str = String(raw).trim();
  if (str === "") return null;

  let negative = false;
  if (/^\(.*\)$/.test(str)) {
    negative = true;
    str = str.slice(1, -1).trim();
  }
  str = str.replace(/rp\.?/gi, "").replace(/[%\s]/g, "");
  if (str.startsWith("-")) {
    negative = true;
    str = str.slice(1);
  }
  if (str === "") return null;
  if (!/^[0-9.,]+$/.test(str)) return null;

  const commaCount = (str.match(/,/g) ?? []).length;
  const dotCount = (str.match(/\./g) ?? []).length;

  let normalized: string;
  if (commaCount > 0 && dotCount > 0) {
    normalized = str.replace(/\./g, "").replace(",", ".");
  } else if (commaCount === 1) {
    const digitsAfter = str.split(",")[1]?.length ?? 0;
    normalized = digitsAfter === 3 ? str.replace(",", "") : str.replace(",", ".");
  } else if (commaCount > 1) {
    normalized = str.replace(/,/g, "");
  } else if (dotCount === 1) {
    const digitsAfter = str.split(".")[1]?.length ?? 0;
    normalized = digitsAfter === 3 ? str.replace(".", "") : str;
  } else if (dotCount > 1) {
    normalized = str.replace(/\./g, "");
  } else {
    normalized = str;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/* ------------------------------------------------------------------ */
/* Baris kosong                                                        */
/* ------------------------------------------------------------------ */

export function isCellEmpty(v: CellValue): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

export function isRowEmpty(row: OutputRow, columnIds: string[]): boolean {
  return columnIds.every((id) => isCellEmpty(row[id]));
}

/* ------------------------------------------------------------------ */
/* Deteksi duplikat                                                    */
/* ------------------------------------------------------------------ */

function normalizeForKey(v: CellValue): string {
  if (v === null || v === undefined) return "";
  return String(v).trim().toLowerCase();
}

/**
 * Kelompokkan indeks baris yang punya nilai sama pada seluruh kolom kunci.
 * Baris dengan semua kolom kunci kosong diabaikan (tidak dianggap duplikat).
 * Mengembalikan array kelompok, tiap kelompok berisi >= 2 indeks baris.
 */
export function findDuplicateGroups(rows: OutputRow[], keyColumnIds: string[]): number[][] {
  if (keyColumnIds.length === 0) return [];
  const map = new Map<string, number[]>();

  rows.forEach((row, idx) => {
    const parts = keyColumnIds.map((id) => normalizeForKey(row[id]));
    if (parts.every((p) => p === "")) return;
    const key = parts.join("\u0001");
    const arr = map.get(key);
    if (arr) arr.push(idx);
    else map.set(key, [idx]);
  });

  const groups: number[][] = [];
  for (const arr of map.values()) {
    if (arr.length > 1) groups.push(arr);
  }
  return groups;
}
