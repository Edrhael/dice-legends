import { describe, it, expect } from 'vitest';
import { classify, evaluate, hasScoring, roll } from '../src/core/dice.js';

const F = (...vals) => vals.map((v) => (typeof v === 'number' ? { v, m: null } : v));

describe('classify', () => {
  it.each([
    [[4, 4, 4, 4, 4], 'legend'], [[2, 2, 2, 2], 'poker'], [[3, 3, 3, 6, 6], 'full'],
    [[2, 3, 4, 5, 6], 'straight5'], [[1, 2, 3, 4], 'straight4'], [[6, 6, 6], 'trio'],
    [[1, 1, 1], 'bastion'], [[2, 2], 'pair'], [[1], 'ones'], [[1, 1], 'ones'], [[5], 'five'], [[5, 5], 'pair'],
  ])('%j → %s', (vals, type) => expect(classify(vals)).toBe(type));
  it('no puntúa', () => {
    expect(classify([2, 3])).toBeNull();
    expect(classify([1, 5])).toBeNull();
    expect(classify([])).toBeNull();
  });
});

describe('evaluate', () => {
  it('calcula el daño base', () => {
    expect(evaluate(F(6, 6)).dmg).toBe(14);
    expect(evaluate(F(4, 4, 4)).dmg).toBe(24);
    expect(evaluate(F(1, 1, 1)).block).toBe(20);
  });
  it('el comodín elige el mejor valor', () => {
    const r = evaluate(F(6, 6, 6, 6, { v: 2, m: 'wild' }));
    expect(r.type).toBe('legend');
    expect(r.values).toEqual([6, 6, 6, 6, 6]);
  });
});

describe('hasScoring', () => {
  it('detecta pifia', () => {
    expect(hasScoring(F(2, 3, 4, 6, 6))).toBe(true);
    expect(hasScoring(F(2, 3, 6))).toBe(false);
    expect(hasScoring(F(2, 3, 4, 6))).toBe(false);
    expect(hasScoring(F(3, { v: 2, m: 'wild' }))).toBe(true);
  });
});

it('roll respeta el rng', () => expect(roll(3, () => 0.99)).toEqual([6, 6, 6]));
