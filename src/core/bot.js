// Bot sencillo para simular runs (balance y tests de humo). No lo usa la UI.
import { buildAction, rollDice, bank, execute } from './combat.js';
import { reachable, enterNode, resolveCombat, chooseReward, applyFace, leaveNode, rest, resolveEvent, buy } from './run.js';
import { EVENTS } from './data.js';

function subsets(idx) {
  const out = [];
  for (let m = 1; m < 1 << idx.length; m++) out.push(idx.filter((_, i) => m & (1 << i)));
  return out;
}

/** Mejor selección de las ranuras libres según daño + escudo, desempatando por usar más dados. */
export function bestBank(run) {
  const c = run.combat;
  const free = c.slots.map((s, i) => (s.state === 'free' && s.face ? i : -1)).filter((i) => i >= 0);
  let best = null;
  for (const sel of subsets(free)) {
    const a = buildAction(run, sel.map((i) => c.slots[i].face));
    if (!a) continue;
    const score = a.dmg + a.block * 0.7 + a.heal + sel.length * 0.5;
    if (!best || score > best.score) best = { sel, score };
  }
  return best?.sel || null;
}

export function playCombat(run, maxTurns = 200) {
  const c = run.combat;
  while (!c.over && c.turn < maxTurns) {
    const t = c.turn;
    if (c.canRoll && c.rollsLeft > 0) {
      const r = rollDice(run);
      if (c.over || c.turn !== t) continue;
      if (r.bust) continue;
    }
    const sel = bestBank(run);
    if (sel) bank(run, sel);
    const free = c.slots.filter((s) => s.state === 'free').length;
    const risky = free <= 2;
    if (!(c.canRoll && c.rollsLeft > 0) || risky) execute(run);
  }
}

/** Cara objetivo: tallar sobre la más baja que no sea 1/5; runas sobre una cara alta sin runa. */
export function bestFace(run) {
  const all = [];
  run.dice.forEach((d, di) => d.faces.forEach((f, fi) => all.push({ di, fi, f })));
  let c;
  if (run.pending.kind === 'carve') c = all.filter((x) => ![1, 5, 6].includes(x.f.v) && !x.f.m).sort((a, b) => a.f.v - b.f.v)[0];
  else c = all.filter((x) => !x.f.m).sort((a, b) => b.f.v - a.f.v)[0];
  c = c || all[0];
  return [c.di, c.fi];
}

export function playRun(run) {
  let guard = 0;
  while (!['victory', 'defeat'].includes(run.phase) && guard++ < 500) {
    if (run.pending) { const [d, f] = bestFace(run); applyFace(run, d, f); continue; }
    if (run.phase === 'map') enterNode(run, reachable(run)[0]);
    else if (run.phase === 'combat') { playCombat(run); resolveCombat(run); }
    else if (run.phase === 'reward') {
      if (run.reward.bossRelics?.length) chooseReward(run, { bossRelic: run.reward.bossRelics[0] });
      if (run.reward.options.length) chooseReward(run, { option: 0 });
      if (run.pending) continue;
      leaveNode(run);
    } else if (run.phase === 'shop') {
      const i = run.shop.items.findIndex((it) => !it.sold && it.price <= run.gold && ['mastery', 'relic'].includes(it.kind));
      if (i >= 0) { buy(run, i); continue; }
      leaveNode(run);
    }
    else if (run.phase === 'rest') rest(run, run.hp < run.maxHp * 0.7 ? 'heal' : 'forge');
    else if (run.phase === 'event') resolveEvent(run, EVENTS[run.event].options.length - 1);
  }
  return run;
}
