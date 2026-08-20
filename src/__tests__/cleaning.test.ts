import { describe, expect, it } from "vitest";
import {
  excelSerialToISO,
  findDuplicateGroups,
  normalizeDate,
  parseIndonesianNumber,
  preserveIdAsText,
  titleCaseName,
  trimAndCollapseSpaces,
  isRowEmpty,
} from "@/lib/cleaning";
import type { OutputRow } from "@/lib/types";

describe("trimAndCollapseSpaces", () => {
  it("membuang spasi awal/akhir dan merapikan spasi ganda", () => {
    expect(trimAndCollapseSpaces("  Budi   Santoso  ")).toBe("Budi Santoso");
  });

  it("membiarkan nilai non-string apa adanya", () => {
    expect(trimAndCollapseSpaces(123)).toBe(123);
    expect(trimAndCollapseSpaces(null)).toBe(null);
  });
});

describe("titleCaseName", () => {
  it("mengubah nama menjadi Title Case", () => {
    expect(titleCaseName("budi santoso")).toBe("Budi Santoso");
    expect(titleCaseName("SITI AMINAH")).toBe("Siti Aminah");
  });

  it("menghormati singkatan gelar dengan titik", () => {
    expect(titleCaseName("budi santoso s.pd")).toBe("Budi Santoso S.Pd");
    expect(titleCaseName("SRI WAHYUNI M.SI")).toBe("Sri Wahyuni M.Si");
    expect(titleCaseName("agus, s.e., m.m")).toBe("Agus, S.E., M.M");
  });

  it("mempertahankan angka romawi huruf besar sebagai suffix", () => {
    expect(titleCaseName("HAMENGKUBUWONO X")).toBe("Hamengkubuwono X");
  });
});

describe("preserveIdAsText", () => {
  it("mengubah angka menjadi teks tanpa notasi ilmiah", () => {
    expect(preserveIdAsText(2021123456)).toBe("2021123456");
    expect(preserveIdAsText(199001012020121001)).not.toMatch(/e\+/i);
  });

  it("tidak mengubah nilai yang sudah berupa teks (mempertahankan nol di depan)", () => {
    expect(preserveIdAsText("0812345678")).toBe("0812345678");
    expect(preserveIdAsText("001234")).toBe("001234");
  });

  it("mengembalikan string kosong untuk nilai kosong", () => {
    expect(preserveIdAsText(null)).toBe("");
    expect(preserveIdAsText(undefined)).toBe("");
  });
});

describe("normalizeDate", () => {
  it("mengonversi serial number Excel ke ISO", () => {
    // 45363 = 12 Maret 2024 pada basis tanggal Excel
    expect(excelSerialToISO(45363)).toBe("2024-03-12");
    expect(normalizeDate(45363)).toBe("2024-03-12");
  });

  it("mem-parse format DD/MM/YYYY", () => {
    expect(normalizeDate("12/03/2024")).toBe("2024-03-12");
    expect(normalizeDate("01-01-2023")).toBe("2023-01-01");
  });

  it("mem-parse tanggal dengan nama bulan Indonesia", () => {
    expect(normalizeDate("12 Maret 2024")).toBe("2024-03-12");
    expect(normalizeDate("5 Januari 2022")).toBe("2022-01-05");
  });

  it("mem-parse format ISO yang sudah benar", () => {
    expect(normalizeDate("2024-03-12")).toBe("2024-03-12");
  });

  it("mengembalikan null untuk format yang tidak dikenali", () => {
    expect(normalizeDate("bukan tanggal")).toBe(null);
    expect(normalizeDate("32/13/2024")).toBe(null);
  });
});

describe("parseIndonesianNumber", () => {
  it("mem-parse format ribuan titik dan desimal koma", () => {
    expect(parseIndonesianNumber("1.250,50")).toBe(1250.5);
    expect(parseIndonesianNumber("1.000.000")).toBe(1000000);
  });

  it("mem-parse angka dengan prefix Rp", () => {
    expect(parseIndonesianNumber("Rp 1.500,75")).toBe(1500.75);
  });

  it("mem-parse angka negatif dalam tanda kurung", () => {
    expect(parseIndonesianNumber("(500)")).toBe(-500);
  });

  it("membiarkan angka native apa adanya", () => {
    expect(parseIndonesianNumber(42)).toBe(42);
  });

  it("mengembalikan null untuk nilai bukan angka", () => {
    expect(parseIndonesianNumber("abc")).toBe(null);
    expect(parseIndonesianNumber(null)).toBe(null);
  });
});

describe("findDuplicateGroups", () => {
  it("mengelompokkan baris dengan nilai kunci sama", () => {
    const rows: OutputRow[] = [
      { nim: "123", nama: "Budi" },
      { nim: "456", nama: "Ani" },
      { nim: "123", nama: "Budi Santoso" },
    ];
    const groups = findDuplicateGroups(rows, ["nim"]);
    expect(groups).toEqual([[0, 2]]);
  });

  it("mengabaikan baris yang kolom kuncinya kosong", () => {
    const rows: OutputRow[] = [
      { nim: "", nama: "A" },
      { nim: "", nama: "B" },
    ];
    expect(findDuplicateGroups(rows, ["nim"])).toEqual([]);
  });

  it("tidak menganggap kunci gabungan yang berbeda batas sebagai sama", () => {
    const rows: OutputRow[] = [
      { a: "12", b: "3" },
      { a: "1", b: "23" },
    ];
    expect(findDuplicateGroups(rows, ["a", "b"])).toEqual([]);
  });
});

describe("isRowEmpty", () => {
  it("mendeteksi baris yang semua kolomnya kosong", () => {
    expect(isRowEmpty({ a: "", b: null }, ["a", "b"])).toBe(true);
    expect(isRowEmpty({ a: "x", b: null }, ["a", "b"])).toBe(false);
  });
});
