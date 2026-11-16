// Estructura de la run: mapa, nodos, recompensas, tienda, eventos, descanso, fin de partida.
import { createRng, int, next, pick, sample, weighted, hashSeed } from './rng.js';
import { CLASSES, RELICS, ACT_POOLS, EVENTS, RUNE_POOL, MASTERY } from './data.js';
import { newDie } from './dice.js';
import { startCombat } from './combat.js';

export const FLOORS = 8; // 0..7, el 7 es el jefe
const LANES = 3;

export function newRun({ cls = 'guerrero', seed = Date.now(), asc = 0, daily = null, unlockedRelics = null } = {}) {
  const C = CLASSES[cls];
  const dice = C.dice.map((vals, i) => newDie(i, vals));
  (C.mods || []).forEach(([d, f, m]) => (dice[d].faces[f].m = m));
  const run = {
    v: 1, seed, rng: createRng(seed), cls, asc, daily,
    hp: C.hp, maxHp: C.hp, gold: 30, dice, relics: [], fenixUsed: false, mastery: {},
    relicPool: unlockedRelics || Object.keys(RELICS).filter((k) => RELICS[k].unlock === 0),
    act: 1, floor: -1, lane: null, map: null,
    phase: 'map', combat: null, node: null, reward: null, shop: null, event: null, pending: null,
    stats: { kills: 0, elites: 0, bosses: 0, floors: 0, dmgDealt: 0, dmgTaken: 0, bestHit: 0, rolls: 0, busts: 0, hotDice: 0, legends: 0 },
    log: [],
  };
  run.map = genMap(run);
  return run;
}

// ───────────── MAPA ─────────────
export function genMap(run) {
  const r = run.rng;
  const floors = [];
  for (let f = 0; f < FLOORS; f++) {
    if (f === FLOORS - 1) { floors.push([{ lane: 1, type: 'boss', next: [] }]); continue; }
    const row = [];
    for (let l = 0; l < LANES; l++) {
      let type;
      if (f === 0) type = 'combat';
      else if (f === 3) type = 'treasure';
      else if (f === FLOORS - 2) type = 'rest';
      else type = weighted(r, [['combat', 46], ['event', 20], ['shop', f >= 2 ? 11 : 4], ['elite', f >= 2 ? 14 : 0], ['rest', f >= 4 ? 9 : 0]]);
      row.push({ lane: l, type, next: [] });
    }
    floors.push(row);
  }
  for (let f = 0; f < FLOORS - 1; f++) {
    for (const n of floors[f]) {
      if (f === FLOORS - 2) { n.next = [0]; continue; }
      n.next = [n.lane];
      const side = n.lane + (next(r) < 0.5 ? -1 : 1);
      if (side >= 0 && side < LANES && next(r) < 0.6) n.next.push(side);
    }
  }
  return floors;
}

/** Nodos a los que puede ir el jugador ahora mismo. */
export function reachable(run) {
  if (run.floor === -1) return run.map[0].map((n, i) => i);
  const cur = run.map[run.floor].find((n) => n.lane === run.lane) || run.map[run.floor][0];
  return cur.next;
}

export function enterNode(run, idx) {
  if (run.phase !== 'map' || run.pending) return { error: 'No estás en el mapa' };
  if (!reachable(run).includes(idx)) return { error: 'No es alcanzable' };
  run.floor++;
  const node = run.map[run.floor][idx];
  run.lane = node.lane;
  run.node = node;
  run.stats.floors++;
  const pool = ACT_POOLS[run.act];
  switch (node.type) {
    case 'combat': {
      // los dos primeros pisos usan enemigos algo más suaves
      const list = run.floor <= 1 ? pool.normal.slice(0, 3) : pool.normal;
      startCombat(run, pick(run.rng, list)); run.phase = 'combat'; break;
    }
    case 'elite': startCombat(run, pick(run.rng, pool.elite)); run.phase = 'combat'; break;
    case 'boss': startCombat(run, pool.boss); run.phase = 'combat'; break;
    case 'shop': run.shop = genShop(run); run.phase = 'shop'; break;
    case 'event': run.event = pick(run.rng, Object.keys(EVENTS)); run.phase = 'event'; break;
    case 'rest': run.phase = 'rest'; break;
    case 'treasure': {
      const id = drawRelic(run, ['common', 'rare']);
      run.reward = { gold: int(run.rng, 20, 35), relic: id, options: [], treasure: true };
      run.gold += run.reward.gold;
      if (id) addRelic(run, id);
      run.phase = 'reward';
      break;
    }
  }
  return { node };
}

// ───────────── RELIQUIAS ─────────────
export function drawRelic(run, rarities, exclude = []) {
  const avail = run.relicPool.filter((id) => rarities.includes(RELICS[id].rarity) && !run.relics.includes(id) && !exclude.includes(id));
  return avail.length ? pick(run.rng, avail) : null;
}

export function addRelic(run, id) {
  if (!id || run.relics.includes(id)) return;
  run.relics.push(id);
  RELICS[id].onPickup?.(run);
}

// ───────────── RECOMPENSAS ─────────────
const runeOffer = (run) => ({ kind: 'rune', mod: weighted(run.rng, RUNE_POOL) });
const carveOffer = (run) => ({ kind: 'carve', v: weighted(run.rng, [[6, 4], [5, 3], [1, 3]]) });
const masteryOffer = (run) => ({ kind: 'mastery', combo: weighted(run.rng, Object.entries(MASTERY).map(([k, m]) => [k, m.w])) });

function lootOptions(run, n = 3) {
  const opts = [masteryOffer(run)];
  const gen = [() => runeOffer(run), () => runeOffer(run), () => carveOffer(run), () => masteryOffer(run), () => ({ kind: 'maxhp', v: 6 }), () => ({ kind: 'heal', v: Math.ceil(run.maxHp * 0.25) })];
  while (opts.length < n) {
    const o = pick(run.rng, gen)();
    if (!opts.some((x) => JSON.stringify(x) === JSON.stringify(o))) opts.push(o);
  }
  return opts;
}

/** Llamar cuando run.combat.over está decidido. */
export function resolveCombat(run) {
  const c = run.combat;
  if (!c?.over) return { error: 'El combate sigue' };
  if (c.over === 'lose') { run.phase = 'defeat'; return { defeat: true }; }
  const e = c.enemy;
  run.stats.kills++;
  run.relics.forEach((id) => RELICS[id].onWin?.(run));
  let gold = int(run.rng, 10, 18);
  const reward = { gold, options: lootOptions(run), relic: null, bossRelics: null };
  if (e.elite) { run.stats.elites++; reward.gold = int(run.rng, 25, 35); reward.relic = drawRelic(run, ['common', 'rare']); }
  if (e.boss) {
    run.stats.bosses++;
    reward.gold = 60;
    reward.bossRelics = [];
    for (let i = 0; i < 3; i++) {
      const id = drawRelic(run, ['boss', 'rare'], reward.bossRelics);
      if (id) reward.bossRelics.push(id);
    }
  }
  run.gold += reward.gold;
  if (reward.relic) addRelic(run, reward.relic);
  if (run.relics.includes('forja')) applyRandomRune(run);
  run.combat = null;
  run.reward = reward;
  run.phase = 'reward';
  return { reward };
}

function applyRandomRune(run) {
  const free = [];
  run.dice.forEach((d, di) => d.faces.forEach((f, fi) => !f.m && free.push([di, fi])));
  if (!free.length) return;
  const [di, fi] = pick(run.rng, free);
  run.dice[di].faces[fi].m = weighted(run.rng, RUNE_POOL.filter(([m]) => m !== 'wild'));
}

/** Elige una opción de botín (índice) o una reliquia de jefe (id). */
export function chooseReward(run, choice) {
  const rw = run.reward;
  if (!rw) return { error: 'Sin recompensa' };
  if (choice?.bossRelic) { addRelic(run, choice.bossRelic); rw.bossRelics = null; return {}; }
  if (choice?.option !== undefined) {
    const o = rw.options[choice.option];
    rw.options = [];
    return applyOffer(run, o);
  }
  return {};
}

export function applyOffer(run, o) {
  if (!o) return {};
  if (o.kind === 'heal') run.hp = Math.min(run.maxHp, run.hp + o.v);
  if (o.kind === 'maxhp') { run.maxHp += o.v; run.hp += o.v; }
  if (o.kind === 'relic') addRelic(run, o.id);
  if (o.kind === 'mastery') run.mastery[o.combo] = (run.mastery[o.combo] || 0) + 1;
  if (o.kind === 'rune' || o.kind === 'carve') { run.pending = o; return { pickFace: true }; }
  return {};
}

/** Aplica la mejora pendiente a una cara concreta. */
export function applyFace(run, dieIdx, faceIdx) {
  const o = run.pending;
  const f = run.dice[dieIdx]?.faces[faceIdx];
  if (!o || !f) return { error: 'Nada que aplicar' };
  if (o.kind === 'rune') f.m = o.mod;
  if (o.kind === 'carve') f.v = o.v;
  run.pending = null;
  return {};
}

/** Cierra la pantalla de recompensa y vuelve al mapa (o al siguiente acto / victoria). */
export function leaveNode(run) {
  if (run.pending) return { error: 'Elige una cara primero' };
  run.reward = null; run.shop = null; run.event = null;
  if (run.node?.type === 'boss') {
    if (run.act === 3) { run.phase = 'victory'; return { victory: true }; }
    run.act++;
    run.floor = -1; run.lane = null;
    run.hp = Math.min(run.maxHp, run.hp + Math.ceil((run.maxHp - run.hp) * 0.6));
    run.map = genMap(run);
    run.phase = 'map';
    return { newAct: run.act };
  }
  run.phase = 'map';
  return {};
}

// ───────────── TIENDA ─────────────
function genShop(run) {
  const items = [];
  for (let i = 0; i < 3; i++) {
    const o = i < 2 ? runeOffer(run) : carveOffer(run);
    items.push({ ...o, price: o.mod === 'wild' ? 75 : int(run.rng, 32, 45) });
  }
  for (let i = 0; i < 2; i++) items.push({ ...masteryOffer(run), price: int(run.rng, 40, 55) });
  const used = [];
  for (let i = 0; i < 2; i++) {
    const id = drawRelic(run, i === 0 ? ['common'] : ['rare'], used);
    if (id) { used.push(id); items.push({ kind: 'relic', id, price: RELICS[id].rarity === 'rare' ? int(run.rng, 120, 145) : int(run.rng, 70, 90) }); }
  }
  items.push({ kind: 'heal', v: Math.ceil(run.maxHp * 0.3), price: 35 });
  return { items: items.map((x) => ({ ...x, sold: false })) };
}

export function buy(run, idx) {
  const it = run.shop?.items[idx];
  if (!it || it.sold) return { error: 'No disponible' };
  if (run.gold < it.price) return { error: 'Oro insuficiente' };
  run.gold -= it.price;
  it.sold = true;
  return applyOffer(run, it);
}

// ───────────── DESCANSO ─────────────
export function rest(run, choice) {
  if (run.phase !== 'rest') return { error: 'No estás descansando' };
  if (choice === 'heal') { run.hp = Math.min(run.maxHp, run.hp + Math.ceil(run.maxHp * 0.3)); run.phase = 'map'; return {}; }
  if (choice === 'forge') { run.phase = 'map'; return applyOffer(run, { kind: 'rune', mod: weighted(run.rng, RUNE_POOL.filter(([m]) => m !== 'wild')) }); }
  return { error: 'Opción no válida' };
}

// ───────────── EVENTOS ─────────────
export function resolveEvent(run, optIdx) {
  const ev = EVENTS[run.event];
  const o = ev?.options[optIdx];
  if (!o) return { error: 'Opción no válida' };
  if (o.cost && run.gold < o.cost) return { error: 'Oro insuficiente' };
  if (o.cost) run.gold -= o.cost;
  const r = run.rng;
  let msg = '';
  let res = {};
  switch (o.fx) {
    case 'fuente':
      if (next(r) < 0.7) { run.hp = Math.min(run.maxHp, run.hp + 20); msg = 'El agua te revitaliza. +20 PV.'; }
      else { run.hp = Math.max(1, run.hp - 8); msg = 'Quema… pero algo sagrado queda en ti.'; res = applyOffer(run, { kind: 'rune', mod: 'holy' }); }
      break;
    case 'herrero': msg = 'El enano talla un 6 con precisión.'; res = applyOffer(run, { kind: 'carve', v: 6 }); break;
    case 'herrero_runa': { const m = weighted(r, RUNE_POOL); msg = `Graba una runa: ${m}.`; res = applyOffer(run, { kind: 'rune', mod: m }); break; }
    case 'altar': { run.hp = Math.max(1, run.hp - 12); const id = drawRelic(run, ['common', 'rare']); addRelic(run, id); msg = id ? `Obtienes: ${RELICS[id].name}.` : 'El altar calla.'; break; }
    case 'apuesta': if (next(r) < 0.5) { run.gold += 60; msg = '¡Ganas! +60 de oro.'; } else msg = 'Pierdes. El tahúr sonríe.'; break;
    case 'cofre':
      if (next(r) < 0.6) { run.gold += 45; msg = '+45 de oro.'; }
      else { msg = '¡Era un mímico!'; run.event = null; startCombat(run, ACT_POOLS[run.act].normal[0]); run.combat.enemy.name = 'Mímico'; run.combat.enemy.icon = '🧰'; run.phase = 'combat'; return { msg, combat: true }; }
      break;
    case 'peregrino': run.maxHp += 8; run.hp += 8; msg = 'Te bendice. +8 PV máximos.'; break;
    case 'peregrino2': run.hp = Math.max(1, run.hp - 6); msg = 'Tu fe se fortalece.'; res = applyOffer(run, { kind: 'rune', mod: 'holy' }); break;
    case 'bufon': run.maxHp = Math.max(10, run.maxHp - 8); run.hp = Math.min(run.hp, run.maxHp); msg = 'El dado ríe en tu mano.'; res = applyOffer(run, { kind: 'rune', mod: 'wild' }); break;
    case 'biblio5': msg = 'Aprendes el arte del cinco.'; res = applyOffer(run, { kind: 'carve', v: 5 }); break;
    case 'biblio1': msg = 'Aprendes el arte del uno.'; res = applyOffer(run, { kind: 'carve', v: 1 }); break;
    default: msg = 'Sigues tu camino.';
  }
  run.event = null;
  run.phase = 'map';
  return { msg, ...res };
}

// ───────────── PUNTUACIÓN ─────────────
export function gloria(run) {
  const s = run.stats;
  const base = s.floors + s.kills * 2 + s.elites * 5 + s.bosses * 20 + (run.phase === 'victory' ? 40 : 0);
  return Math.round(base * (1 + 0.15 * run.asc));
}

export const dailySeed = (date = new Date()) => hashSeed(date.toISOString().slice(0, 10));
