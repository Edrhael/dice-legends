import { describe, it, expect } from 'vitest';
import { roll, evaluate, hasScoring } from '../src/core/dice.js';

describe('roll', () => {
  it('devuelve n valores entre 1 y 6', () => {
    const r = roll(5);
    expect(r).toHaveLength(5);
    r.forEach((d) => expect(d).toBeGreaterThanOrEqual(1) && expect(d).toBeLessThanOrEqual(6));
  });
  it('es determinista con rng inyectado', () => {
    expect(roll(3, () => 0.99)).toEqual([6, 6, 6]);
  });
});

describe('evaluate', () => {
  const t = (d) => evaluate(d)?.type ?? null;
  it('detecta combinaciones', () => {
    expect(t([4, 4, 4, 4, 4])).toBe('legend');
    expect(t([2, 2, 2, 2])).toBe('poker');
    expect(t([3, 3, 3, 6, 6])).toBe('full');
    expect(t([2, 3, 4, 5, 6])).toBe('straight');
    expect(t([1, 2, 3, 4])).toBe('straight');
    expect(t([6, 6, 6])).toBe('trio');
    expect(t([2, 2])).toBe('pair');
    expect(t([1])).toBe('shield');
    expect(t([5, 5, 5].slice(0, 1))).toBe('energy');
  });
  it('devuelve null si no puntúa', () => {
    expect(t([2, 3])).toBeNull();
    expect(t([])).toBeNull();
  });
});

describe('hasScoring', () => {
  it('detecta pifia', () => {
    expect(hasScoring([2, 3, 4, 6, 6])).toBe(true);
    expect(hasScoring([2, 3, 6])).toBe(false);
    expect(hasScoring([2, 4, 6, 3])).toBe(false);
  });
});
