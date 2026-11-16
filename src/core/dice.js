// Motor de dados — lógica pura, sin DOM. Ver GDD §2.

/** Tira n dados de 6 caras. rng inyectable para tests y semillas. */
export function roll(n, rng = Math.random) {
  return Array.from({ length: n }, () => 1 + Math.floor(rng() * 6));
}

const counts = (dice) => {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) c[d]++;
  return c;
};

const isStraight = (dice, len) => {
  const set = new Set(dice);
  for (let start = 1; start + len - 1 <= 6; start++) {
    let ok = true;
    for (let v = start; v < start + len; v++) if (!set.has(v)) { ok = false; break; }
    if (ok) return true;
  }
  return false;
};

/**
 * Identifica la mejor combinación de un conjunto de dados apartados.
 * Devuelve { type, dice } o null si no puntúa.
 * Tipos: legend, poker, full, straight, trio, pair, shield (1s), energy (5s)
 */
export function evaluate(dice) {
  if (!dice.length) return null;
  const c = counts(dice);
  const max = Math.max(...c);
  const n = dice.length;

  if (n === 5 && max === 5) return { type: 'legend', dice };
  if (n === 4 && max === 4) return { type: 'poker', dice };
  if (n === 5 && c.includes(3) && c.includes(2)) return { type: 'full', dice };
  if (n >= 4 && n === new Set(dice).size && isStraight(dice, n)) return { type: 'straight', dice };
  if (n === 3 && max === 3) return { type: 'trio', dice };
  if (n === 2 && max === 2) return { type: 'pair', dice };
  if (dice.every((d) => d === 1)) return { type: 'shield', dice };
  if (dice.every((d) => d === 5)) return { type: 'energy', dice };
  return null;
}

/** ¿Hay algo que puntúe en esta tirada? Si no, es pifia (bust). */
export function hasScoring(dice) {
  const c = counts(dice);
  if (c[1] > 0 || c[5] > 0) return true;
  if (Math.max(...c) >= 2) return true;
  return isStraight(dice, 4);
}
