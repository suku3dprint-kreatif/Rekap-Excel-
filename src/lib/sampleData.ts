// Generator data contoh (dummy) untuk tombol "Muat data contoh".
// Sengaja dibuat berantakan (format beda-beda per file) supaya menunjukkan masalah nyata
// yang diselesaikan Rekap Cepat: header tidak di baris pertama, nama kolom berbeda-beda,
// format tanggal & angka campur aduk, NIM yang butuh dipertahankan sebagai teks, dan duplikat.

import * as XLSX from "xlsx";

const NAMES = [
  "Budi Santoso",
  "Siti Aminah",
  "Ahmad Fauzi",
  "Dewi Lestari",
  "Rizky Ramadhan",
  "Putri Wulandari",
  "Agus Setiawan",
  "Nur Hidayah",
  "Bayu Pratama",
  "Fitriani",
  "Eko Prasetyo",
  "Indah Permata",
  "Hendra Gunawan",
  "Wahyu Nugroho",
  "Ratna Sari",
  "Muhammad Iqbal",
  "Yuni Astuti",
  "Doni Kurniawan",
  "Lina Marlina",
  "Fajar Setiadi",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function makeNim(prefix: string, i: number): string {
  return `${prefix}${String(1000 + i).padStart(6, "0")}`;
}

function buildFile(name: string, buffer: ArrayBuffer | Uint8Array, mime: string): File {
  return new File([buffer as BlobPart], name, { type: mime });
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function aoaToXlsxFile(fileName: string, sheets: { name: string; rows: unknown[][] }[]): File {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  }
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return buildFile(fileName, out, XLSX_MIME);
}

/** File 1: kop surat di atas header, header di baris ke-3 (index 2), format xlsx. */
function buildFileFakultasTeknik(): File {
  const rows: unknown[][] = [
    ["UNIVERSITAS CONTOH NEGERI"],
    ["Rekap Data Mahasiswa - Fakultas Teknik - Semester Ganjil 2024/2025"],
    ["NIM", "Nama Mahasiswa", "Jenis Kelamin", "Tanggal Lahir", "No HP", "Status"],
  ];
  for (let i = 0; i < 18; i++) {
    const nim = makeNim("21", i);
    rows.push([
      nim,
      `  ${pick(NAMES, i).toLowerCase()}  `,
      i % 2 === 0 ? "L" : "P",
      `${(i % 27) + 1}/${(i % 12) + 1}/2003`,
      `0812${String(1000000 + i * 37).slice(0, 7)}`,
      i % 5 === 0 ? "AKTIF" : "aktif",
    ]);
  }
  // satu baris kosong di tengah (skenario nyata: baris pemisah)
  rows.splice(10, 0, [null, null, null, null, null, null]);
  // satu duplikat NIM (kesalahan entri ganda)
  rows.push([makeNim("21", 3), "Dewi Lestari", "P", "4/10/2003", "081210000037", "Aktif"]);
  return aoaToXlsxFile("Rekap Fakultas Teknik.xlsx", [{ name: "Ganjil 2024", rows }]);
}

/** File 2: dua sheet, nama kolom beda gaya, header langsung di baris pertama. */
function buildFileFEB(): File {
  const header = ["N.I.M", "nama", "L/P", "tgl lahir", "telepon", "status keaktifan"];
  const sheetA: unknown[][] = [header];
  const sheetB: unknown[][] = [header];
  for (let i = 0; i < 15; i++) {
    const nim = makeNim("22", i + 50);
    const row = [
      nim,
      pick(NAMES, i + 4).toUpperCase(),
      i % 2 === 0 ? "Laki-laki" : "Perempuan",
      `${(i % 28) + 1} ${["Januari", "Februari", "Maret", "April", "Mei"][i % 5]} 2002`,
      `62812${String(2000000 + i * 53).slice(0, 7)}`,
      i % 4 === 0 ? "Non-Aktif" : "aktif",
    ];
    (i % 3 === 0 ? sheetB : sheetA).push(row);
  }
  return aoaToXlsxFile("Data Mahasiswa FEB.xlsx", [
    { name: "Ganjil 2023", rows: sheetA },
    { name: "Genap 2024", rows: sheetB },
  ]);
}

/** File 3: CSV, angka & NIM disimpan sebagai teks murni, format angka gaya Indonesia. */
function buildFileBeasiswa(): File {
  const header = ["nim mahasiswa", "nama_lengkap", "gender", "dob", "hp", "kondisi", "nominal"];
  const lines = [header.join(",")];
  for (let i = 0; i < 12; i++) {
    const nim = makeNim("21", i + 100);
    const nominal = (1000000 + i * 250000).toLocaleString("id-ID");
    const row = [
      nim,
      pick(NAMES, i + 8),
      i % 2 === 0 ? "L" : "P",
      `2003-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
      `0813${String(3000000 + i * 61).slice(0, 7)}`,
      i % 3 === 0 ? "Aktif" : "aktif",
      `Rp ${nominal},00`,
    ];
    lines.push(row.map((v) => `"${v}"`).join(","));
  }
  const csv = lines.join("\n");
  const buf = new TextEncoder().encode(csv);
  return buildFile("Rekap Beasiswa.csv", buf, "text/csv");
}

export function generateSampleFiles(): File[] {
  return [buildFileFakultasTeknik(), buildFileFEB(), buildFileBeasiswa()];
}
