import { describe, it, expect } from 'vitest';
import { newRun, reachable, enterNode, gloria } from '../src/core/run.js';
import { playRun } from '../src/core/bot.js';
import { newProfile, finishRun, unlockedClasses } from '../src/core/meta.js';
import { CLASSES } from '../src/core/data.js';

describe('mapa', () => {
  it('genera 8 pisos con jefe al final', () => {
    const run = newRun({ seed: 7 });
    expect(run.map).toHaveLength(8);
    expect(run.map[7][0].type).toBe('boss');
    expect(run.map[3].every((n) => n.type === 'treasure')).toBe(true);
  });
  it('todo nodo tiene salida hasta el jefe', () => {
    const run = newRun({ seed: 9 });
    run.map.slice(0, 7).forEach((row) => row.forEach((n) => expect(n.next.length).toBeGreaterThan(0)));
  });
  it('no deja saltar a nodos no conectados', () => {
    const run = newRun({ seed: 3 });
    expect(reachable(run)).toEqual([0, 1, 2]);
    enterNode(run, 0);
    expect(enterNode(run, 0).error).toBeTruthy();
  });
  it('registra la ruta recorrida', () => {
    const run = newRun({ seed: 3 });
    enterNode(run, 2);
    expect(run.path).toEqual([2]);
  });
});

describe('runs completas (bot)', () => {
  it.each(Object.keys(CLASSES))('la clase %s termina la run sin errores', (cls) => {
    for (let s = 0; s < 15; s++) {
      const run = playRun(newRun({ cls, seed: s }));
      expect(['victory', 'defeat']).toContain(run.phase);
      expect(run.hp).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('metaprogresión', () => {
  it('acumula gloria y desbloquea clases', () => {
    const p = newProfile();
    expect(unlockedClasses(p)).toEqual(['guerrero']);
    const run = playRun(newRun({ seed: 1 }));
    const res = finishRun(p, run);
    expect(res.gloria).toBe(gloria(run));
    expect(p.gloria).toBe(res.gloria);
    p.gloria = 500;
    expect(unlockedClasses(p)).toHaveLength(4);
  });
});
