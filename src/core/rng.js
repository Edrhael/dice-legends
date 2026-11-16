// RNG determinista serializable (mulberry32). El estado vive en un objeto { s } para poder guardarlo en JSON.

export function createRng(seed) {
  return { s: seed >>> 0 };
}

export function next(r) {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const int = (r, min, max) => min + Math.floor(next(r) * (max - min + 1));
export const pick = (r, arr) => arr[Math.floor(next(r) * arr.length)];

export function shuffle(r, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next(r) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Elige n elementos distintos. */
export const sample = (r, arr, n) => shuffle(r, arr).slice(0, n);

/** Elección ponderada: entries = [[valor, peso], ...] */
export function weighted(r, entries) {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let x = next(r) * total;
  for (const [v, w] of entries) if ((x -= w) < 0) return v;
  return entries[entries.length - 1][0];
}

/** Semilla a partir de un texto (p. ej. fecha del reto diario). */
export function hashSeed(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
