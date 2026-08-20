import { describe, expect, it } from "vitest";
import { bestMatch, diceCoefficient, normalizeColumnName } from "@/lib/similarity";

describe("normalizeColumnName", () => {
  it("menormalkan huruf besar/kecil dan tanda baca", () => {
    expect(normalizeColumnName("N.I.M")).toBe("n i m");
    expect(normalizeColumnName("  Nama_Lengkap ")).toBe("nama lengkap");
  });
});

describe("diceCoefficient", () => {
  it("memberi skor tinggi untuk nama kolom yang mirip", () => {
    expect(diceCoefficient("NIM", "N.I.M")).toBeGreaterThan(0.8);
    expect(diceCoefficient("Nama Mahasiswa", "nama_mahasiswa")).toBeGreaterThan(0.9);
  });

  it("memberi skor rendah untuk nama yang berbeda jauh", () => {
    expect(diceCoefficient("NIM", "Alamat")).toBeLessThan(0.4);
  });
});

describe("bestMatch", () => {
  it("memilih kandidat dengan skor tertinggi di atas ambang batas", () => {
    const candidates = [
      { id: "nim", name: "NIM" },
      { id: "nama", name: "Nama" },
    ];
    expect(bestMatch("nim mahasiswa", candidates)?.id).toBe("nim");
    expect(bestMatch("alamat rumah", candidates)).toBe(null);
  });
});
