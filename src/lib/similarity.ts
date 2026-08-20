// Normalisasi teks dan kemiripan string sederhana untuk menyarankan pemetaan kolom otomatis.

/** Normalisasi nama kolom: lowercase, hapus spasi/titik/underscore/tanda baca umum. */
export function normalizeColumnName(name: string): string {
  return name
    .toString()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.\-_/\\]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Versi tanpa spasi sama sekali, untuk perbandingan ketat ("n i m" -> "nim"). */
export function collapseSpaces(name: string): string {
  return normalizeColumnName(name).replace(/\s+/g, "");
}

function bigrams(str: string): Map<string, number> {
  const map = new Map<string, number>();
  if (str.length < 2) {
    map.set(str, 1);
    return map;
  }
  for (let i = 0; i < str.length - 1; i++) {
    const bg = str.slice(i, i + 2);
    map.set(bg, (map.get(bg) ?? 0) + 1);
  }
  return map;
}

/** Koefisien Dice berbasis bigram karakter, hasil 0..1 (1 = identik). */
export function diceCoefficient(a: string, b: string): number {
  const na = collapseSpaces(a);
  const nb = collapseSpaces(b);
  if (na === nb) return 1;
  if (na.length === 0 || nb.length === 0) return 0;

  const bgA = bigrams(na);
  const bgB = bigrams(nb);
  let intersection = 0;
  for (const [bg, countA] of bgA) {
    const countB = bgB.get(bg);
    if (countB) intersection += Math.min(countA, countB);
  }
  const totalA = na.length - 1 || 1;
  const totalB = nb.length - 1 || 1;
  return (2 * intersection) / (totalA + totalB);
}

/**
 * Kemiripan berbasis token kata (mis. "nim" adalah kata utuh di dalam "nim mahasiswa"),
 * dihitung sebagai proporsi token himpunan lebih kecil yang muncul di himpunan lainnya.
 */
export function tokenContainment(a: string, b: string): number {
  const ta = normalizeColumnName(a).split(" ").filter(Boolean);
  const tb = normalizeColumnName(b).split(" ").filter(Boolean);
  if (ta.length === 0 || tb.length === 0) return 0;
  const setA = new Set(ta);
  const setB = new Set(tb);
  let intersect = 0;
  for (const t of setA) if (setB.has(t)) intersect++;
  const minSize = Math.min(setA.size, setB.size);
  return intersect / minSize;
}

/** Skor kemiripan gabungan: nilai tertinggi antara kemiripan bigram dan kecocokan token kata. */
export function similarityScore(a: string, b: string): number {
  return Math.max(diceCoefficient(a, b), tokenContainment(a, b) * 0.9);
}

/** Cari kolom target dengan kemiripan tertinggi terhadap nama asli. Threshold default 0.6. */
export function bestMatch(
  originalName: string,
  candidates: { id: string; name: string }[],
  threshold = 0.6,
): { id: string; score: number } | null {
  let best: { id: string; score: number } | null = null;
  for (const c of candidates) {
    const score = similarityScore(originalName, c.name);
    if (score >= threshold && (!best || score > best.score)) {
      best = { id: c.id, score };
    }
  }
  return best;
}
