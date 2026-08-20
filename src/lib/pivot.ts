import type { OutputRow, PivotConfig, PivotResultRow } from "./types";

const EMPTY_LABEL = "(kosong)";

function groupLabel(v: unknown): string {
  if (v === null || v === undefined || v === "") return EMPTY_LABEL;
  return String(v);
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/** Hitung ringkasan/pivot sederhana: kelompokkan berdasarkan satu kolom, agregasi satu kolom nilai. */
export function computePivot(rows: OutputRow[], config: PivotConfig): PivotResultRow[] {
  const { groupByColumnId, valueColumnId, aggregation } = config;
  if (!groupByColumnId) return [];
  if (aggregation !== "count" && !valueColumnId) return [];

  const groups = new Map<string, OutputRow[]>();
  for (const row of rows) {
    const key = groupLabel(row[groupByColumnId]);
    const arr = groups.get(key);
    if (arr) arr.push(row);
    else groups.set(key, [row]);
  }

  const results: PivotResultRow[] = [];
  for (const [group, groupRows] of groups) {
    let value = 0;
    switch (aggregation) {
      case "count":
        value = groupRows.length;
        break;
      case "countUnique": {
        const set = new Set(groupRows.map((r) => groupLabel(r[valueColumnId!])));
        value = set.size;
        break;
      }
      case "sum": {
        value = groupRows.reduce((acc, r) => acc + (toNumber(r[valueColumnId!]) ?? 0), 0);
        break;
      }
      case "avg": {
        const nums = groupRows.map((r) => toNumber(r[valueColumnId!])).filter((n): n is number => n !== null);
        value = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
        break;
      }
      case "min": {
        const nums = groupRows.map((r) => toNumber(r[valueColumnId!])).filter((n): n is number => n !== null);
        value = nums.length > 0 ? Math.min(...nums) : 0;
        break;
      }
      case "max": {
        const nums = groupRows.map((r) => toNumber(r[valueColumnId!])).filter((n): n is number => n !== null);
        value = nums.length > 0 ? Math.max(...nums) : 0;
        break;
      }
    }
    results.push({ group, value: Math.round(value * 100) / 100 });
  }

  results.sort((a, b) => b.value - a.value);
  return results;
}
