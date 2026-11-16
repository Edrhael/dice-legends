import { describe, it, expect } from 'vitest';
import { newRun } from '../src/core/run.js';
import { startCombat, rollDice, bank, execute, buildAction } from '../src/core/combat.js';

const setup = (opts = {}) => {
  const run = newRun({ seed: 42, ...opts });
  startCombat(run, 'goblin');
  return run;
};
const fix = (run, vals) => run.combat.slots.forEach((s, i) => (s.face = { v: vals[i], m: null }));

describe('combate', () => {
  it('empieza con 3 tiradas y 5 dados libres', () => {
    const run = setup();
    expect(run.combat.rollsLeft).toBe(3);
    expect(run.combat.slots.every((s) => s.state === 'free')).toBe(true);
  });

  it('obliga a apartar algo antes de volver a tirar', () => {
    const run = setup();
    rollDice(run);
    expect(rollDice(run).error).toBeTruthy();
  });

  it('apartar una pareja aplica el bono de guerrero', () => {
    const run = setup();
    rollDice(run); fix(run, [6, 6, 2, 3, 4]);
    const r = bank(run, [0, 1]);
    expect(r.action.type).toBe('pair');
    expect(r.action.dmg).toBe(14 + 3);
  });

  it('una racha devuelve los dados, da furia y una tirada extra', () => {
    const run = setup();
    rollDice(run); fix(run, [3, 3, 3, 6, 6]);
    const left = run.combat.rollsLeft;
    expect(bank(run, [0, 1, 2, 3, 4]).hot).toBe(true);
    expect(run.combat.furia).toBe(0.25);
    expect(run.combat.rollsLeft).toBe(left + 1);
    expect(run.combat.slots.every((s) => s.state === 'free' && !s.face)).toBe(true);
  });

  it('ejecutar daña al enemigo y el enemigo responde', () => {
    const run = setup();
    const hp0 = run.combat.enemy.hp;
    rollDice(run); fix(run, [6, 6, 2, 3, 4]);
    bank(run, [0, 1]);
    execute(run);
    expect(run.combat.enemy.hp).toBe(hp0 - 17);
    expect(run.combat.turn).toBe(2);
  });

  it('las maestrías suben el daño', () => {
    const run = setup();
    run.mastery.pair = 2;
    rollDice(run); fix(run, [6, 6, 2, 3, 4]);
    expect(buildAction(run, run.combat.slots.slice(0, 2).map((s) => s.face)).dmg).toBe(14 + 8 + 3);
  });

  it('es determinista con la misma semilla', () => {
    const a = setup(), b = setup();
    rollDice(a); rollDice(b);
    expect(a.combat.slots.map((s) => s.face.v)).toEqual(b.combat.slots.map((s) => s.face.v));
  });
});
