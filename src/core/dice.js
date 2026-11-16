// Motor de dados — lógica pura, sin DOM. Ver GDD §2.
// Una cara es { v: 1..6, m: modificador|null }. Un dado es { id, faces: [6 caras] }.
import { next } from './rng.js';

export const MODS = {
  fire: { icon: '🔥', name: 'Llama', desc: '+2 quemadura al enemigo' },
  frost: { icon: '❄️', name: 'Escarcha', desc: 'Debilita: el enemigo pega un 30% menos un turno' },
  gold: { icon: '💰', name: 'Oro', desc: '+3 de oro' },
  holy: { icon: '✨', name: 'Sagrada', desc: 'Cura 2 PV' },
  sharp: { icon: '🗡️', name: 'Afilada', desc: '+3 de daño a la acción' },
  wild: { icon: '★', name: 'Comodín', desc: 'Vale el número que más te convenga' },
};

export const COMBOS = {
  ones: { name: 'Unos', desc: 'Escudo 5 por cada 1' },
  five: { name: 'Cinco', desc: '5 de daño' },
  pair: { name: 'Pareja', desc: 'Daño = suma + 2' },
  trio: { name: 'Trío', desc: 'Daño = suma × 2' },
  bastion: { name: 'Bastión', desc: 'Trío de unos: escudo 20' },
  straight4: { name: 'Escalera', desc: '14 de daño' },
  straight5: { name: 'Gran escalera', desc: '22 de daño' },
  full: { name: 'Full', desc: 'Daño y escudo = suma' },
  poker: { name: 'Póker', desc: 'Daño = suma × 3' },
  legend: { name: 'LEYENDA', desc: 'Daño = suma × 4 + 10' },
};

export const newDie = (id, values = [1, 2, 3, 4, 5, 6]) => ({ id, faces: values.map((v) => ({ v, m: null })) });

/** Tira un dado y devuelve la cara resultante. */
export const rollDie = (r, die) => die.faces[Math.floor(next(r) * 6)];

/** Tira n dados estándar (utilidad para tests y simulaciones). */
export function roll(n, rng = Math.random) {
  return Array.from({ length: n }, () => 1 + Math.floor(rng() * 6));
}

const sum = (a) => a.reduce((s, x) => s + x, 0);

function isRun(values) {
  const s = [...values].sort((a, b) => a - b);
  return new Set(s).size === s.length && s[s.length - 1] - s[0] === s.length - 1;
}

/** Clasifica un conjunto concreto de valores. Devuelve el tipo de combinación o null. */
export function classify(values) {
  const n = values.length;
  if (!n || n > 5) return null;
  const c = {};
  values.forEach((v) => (c[v] = (c[v] || 0) + 1));
  const counts = Object.values(c).sort((a, b) => b - a);
  const allSame = counts[0] === n;

  if (n === 5 && allSame) return 'legend';
  if (n === 4 && allSame) return 'poker';
  if (n === 5 && counts[0] === 3 && counts[1] === 2) return 'full';
  if (n === 5 && isRun(values)) return 'straight5';
  if (n === 4 && isRun(values)) return 'straight4';
  if (n === 3 && allSame) return values[0] === 1 ? 'bastion' : 'trio';
  if (n <= 2 && allSame && values[0] === 1) return 'ones';
  if (n === 2 && allSame) return 'pair';
  if (n === 1 && values[0] === 5) return 'five';
  return null;
}

/** Valor base de una combinación (sin modificadores de clase, reliquias ni caras). */
export function baseAction(type, values) {
  const s = sum(values);
  switch (type) {
    case 'ones': return { dmg: 0, block: 5 * values.length };
    case 'five': return { dmg: 5, block: 0 };
    case 'pair': return { dmg: s + 2, block: 0 };
    case 'trio': return { dmg: s * 2, block: 0 };
    case 'bastion': return { dmg: 0, block: 20 };
    case 'straight4': return { dmg: 14, block: 0 };
    case 'straight5': return { dmg: 22, block: 0 };
    case 'full': return { dmg: s, block: s };
    case 'poker': return { dmg: s * 3, block: 0 };
    case 'legend': return { dmg: s * 4 + 10, block: 0 };
    default: return null;
  }
}

/**
 * Evalúa caras (con posibles comodines) y devuelve la mejor combinación:
 * { type, values, dmg, block } o null si no puntúa.
 */
export function evaluate(faces) {
  if (!faces.length || faces.length > 5) return null;
  const wildIdx = faces.map((f, i) => (f.m === 'wild' ? i : -1)).filter((i) => i >= 0);
  let best = null;
  const total = 6 ** wildIdx.length;
  for (let k = 0; k < total; k++) {
    const values = faces.map((f) => f.v);
    let x = k;
    for (const i of wildIdx) { values[i] = (x % 6) + 1; x = Math.floor(x / 6); }
    const type = classify(values);
    if (!type) continue;
    const a = baseAction(type, values);
    const score = a.dmg + a.block;
    if (!best || score > best.score) best = { type, values, ...a, score };
  }
  return best;
}

/** ¿Puede esta tirada puntuar algo? Si no, es pifia. */
export function hasScoring(faces) {
  if (faces.some((f) => f.m === 'wild')) return true;
  const vals = faces.map((f) => f.v);
  if (vals.includes(1) || vals.includes(5)) return true;
  if (new Set(vals).size < vals.length) return true;
  const set = new Set(vals);
  return [1, 2, 3].some((s) => [0, 1, 2, 3].every((k) => set.has(s + k)));
}
