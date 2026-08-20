// Simpan & muat skema pemetaan kolom (bukan data!) lewat localStorage, plus export/import JSON.
// Sesuai prinsip privasi aplikasi: hanya konfigurasi pemetaan yang disimpan, tidak pernah data mentah.

import type { MappingSchema } from "./types";

const STORAGE_KEY = "rekap-cepat:mapping-schema:v1";

export function saveMappingToLocalStorage(schema: MappingSchema): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
  } catch {
    // localStorage tidak tersedia (mis. mode privat) - abaikan secara diam-diam
  }
}

export function loadMappingFromLocalStorage(): MappingSchema | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MappingSchema;
  } catch {
    return null;
  }
}

export function clearMappingFromLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // abaikan
  }
}

export function exportMappingAsJson(schema: MappingSchema): void {
  const blob = new Blob([JSON.stringify(schema, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "skema-pemetaan-rekap-cepat.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function parseMappingJsonFile(text: string): MappingSchema {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.targetColumns)) {
    throw new Error("Berkas skema pemetaan tidak valid.");
  }
  return parsed as MappingSchema;
}
