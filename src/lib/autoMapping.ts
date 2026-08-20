// Saran pemetaan kolom otomatis: kelompokkan nama kolom asli yang mirip menjadi satu kolom target.

import { extractHeaders } from "./headerDetect";
import { similarityScore } from "./similarity";
import type { ColumnMappingEntry, MappingSchema, TargetColumn, UploadedFileState } from "./types";

export interface ColumnOccurrence {
  fileId: string;
  fileName: string;
  sheetName: string;
  originalColumn: string;
}

export function collectSelectedColumnOccurrences(files: UploadedFileState[]): ColumnOccurrence[] {
  const out: ColumnOccurrence[] = [];
  for (const f of files) {
    if (f.status !== "parsed") continue;
    for (const s of f.sheets) {
      if (!s.selected) continue;
      const headers = extractHeaders(s.grid, s.headerRowIndex);
      for (const h of headers) {
        out.push({ fileId: f.id, fileName: f.name, sheetName: s.sheetName, originalColumn: h });
      }
    }
  }
  return out;
}

function cleanTargetName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

const SIMILARITY_THRESHOLD = 0.6;

/** Bangun skema pemetaan awal secara otomatis dari seluruh sheet yang dipilih. */
export function autoSuggestSchema(files: UploadedFileState[]): MappingSchema {
  const occurrences = collectSelectedColumnOccurrences(files);

  interface Cluster {
    id: string;
    name: string;
    members: Set<string>;
  }
  const clusters: Cluster[] = [];
  const seenNames = new Set<string>();

  for (const occ of occurrences) {
    const name = occ.originalColumn;
    if (seenNames.has(name)) continue;
    seenNames.add(name);

    let best: { cluster: Cluster; score: number } | null = null;
    for (const c of clusters) {
      const score = similarityScore(name, c.name);
      if (score >= SIMILARITY_THRESHOLD && (!best || score > best.score)) {
        best = { cluster: c, score };
      }
    }
    if (best) {
      best.cluster.members.add(name);
    } else {
      clusters.push({ id: crypto.randomUUID(), name: cleanTargetName(name), members: new Set([name]) });
    }
  }

  const targetColumns: TargetColumn[] = clusters.map((c) => ({
    id: c.id,
    name: c.name,
    kind: "teks",
  }));

  const nameToClusterId = new Map<string, string>();
  for (const c of clusters) for (const m of c.members) nameToClusterId.set(m, c.id);

  const mappings: ColumnMappingEntry[] = occurrences.map((occ) => ({
    fileId: occ.fileId,
    sheetName: occ.sheetName,
    originalColumn: occ.originalColumn,
    targetColumnId: nameToClusterId.get(occ.originalColumn) ?? null,
  }));

  return { version: 1, targetColumns, mappings };
}
