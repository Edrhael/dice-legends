// Combate por turnos. Muta el estado de la run (determinista con run.rng). Devuelve eventos para que la UI anime.
import { evaluate, hasScoring, rollDie, COMBOS } from './dice.js';
import { CLASSES, ENEMIES, RELICS, MASTERY } from './data.js';
import { int, next } from './rng.js';

const has = (run, id) => run.relics.includes(id);
const relicHooks = (run, hook) => run.relics.map((id) => RELICS[id]).filter((r) => r && r[hook]);

export function createEnemy(run, id) {
  const d = ENEMIES[id];
  const asc = run.asc || 0;
  const hp = Math.round(int(run.rng, d.hp[0], d.hp[1]) * (1 + 0.08 * asc));
  return {
    id, name: d.name, icon: d.icon, hp, maxHp: hp, block: 0, str: Math.floor(asc / 3),
    burn: 0, weak: 0, vuln: 0, sealNext: 0, step: 0,
    traits: d.traits || {}, elite: !!d.elite, boss: !!d.boss,
    intent: pickIntent(run, d, 0),
  };
}

function pickIntent(run, def, step) {
  const list = def.intents;
  return { ...(def.random ? list[Math.floor(next(run.rng) * list.length)] : list[step % list.length]) };
}

/** Daño real que haría la intención (para mostrarlo en la UI). */
export function intentDamage(e) {
  const mult = e.weak > 0 ? 0.7 : 1;
  if (e.intent.t === 'atk' || e.intent.t === 'atkblock') return Math.floor((e.intent.v + e.str) * mult);
  if (e.intent.t === 'multi') return Math.floor((e.intent.v + e.str) * mult);
  return 0;
}

export function startCombat(run, enemyId) {
  const c = {
    enemy: createEnemy(run, enemyId), turn: 0, block: 0,
    slots: [], banked: [], rollsLeft: 0, canRoll: true, rolled: false,
    furia: 0, boneUsed: false, over: null, events: [],
  };
  if (run.cls === 'paladin') c.block += 6;
  run.combat = c;
  relicHooks(run, 'onCombatStart').forEach((r) => r.onCombatStart(c, run));
  startTurn(run);
  return c;
}

function startTurn(run) {
  const c = run.combat;
  c.turn++;
  const keep = has(run, 'egida') ? 1 : CLASSES[run.cls].keepBlock || 0;
  if (c.turn > 1) c.block = Math.floor(c.block * keep);
  c.rollsLeft = 3 + (CLASSES[run.cls].extraRolls || 0) + (has(run, 'corona') ? 1 : 0) + (c.turn === 1 && has(run, 'reloj') ? 2 : 0);
  const sealed = c.enemy.sealNext;
  c.enemy.sealNext = 0;
  c.slots = run.dice.map((die, i) => ({ die: i, face: null, state: i < sealed ? 'sealed' : 'free' }));
  c.banked = [];
  c.furia = 0;
  c.canRoll = true;
  c.rolled = false;
}

const freeSlots = (c) => c.slots.filter((s) => s.state === 'free');

/** Tira los dados libres. Devuelve { bust, saved } */
export function rollDice(run) {
  const c = run.combat;
  if (c.over || !c.canRoll || c.rollsLeft <= 0) return { error: 'No puedes tirar' };
  const free = freeSlots(c);
  free.forEach((s) => (s.face = rollDie(run.rng, run.dice[s.die])));
  c.rollsLeft--;
  c.rolled = true;
  c.canRoll = false;
  run.stats.rolls++;
  if (hasScoring(free.map((s) => s.face))) return { bust: false };

  if (has(run, 'hueso') && !c.boneUsed) {
    c.boneUsed = true;
    c.canRoll = c.rollsLeft > 0;
    c.events.push({ k: 'saved' });
    return { bust: true, saved: true };
  }
  run.stats.busts++;
  c.banked = [];
  c.events.push({ k: 'bust' });
  enemyTurn(run);
  return { bust: true, saved: false };
}

/** Construye la acción de una selección de caras aplicando caras, clase, reliquias y furia. */
export function buildAction(run, faces) {
  const combo = evaluate(faces);
  if (!combo) return null;
  const c = run.combat;
  const a = { type: combo.type, name: COMBOS[combo.type].name, values: combo.values, dmg: combo.dmg, block: combo.block,
    burn: 0, weak: 0, vuln: 0, heal: 0, gold: 0, lvl: run.mastery?.[combo.type] || 0 };
  if (a.lvl) {
    const m = MASTERY[a.type], k = m.perDie ? faces.length : 1;
    a.dmg += m.dmg * a.lvl * k;
    a.block += m.block * a.lvl * k;
  }

  for (const f of faces) {
    if (f.m === 'fire') a.burn += 2;
    if (f.m === 'frost') a.weak = 1;
    if (f.m === 'gold') a.gold += 3;
    if (f.m === 'holy') a.heal += 2;
    if (f.m === 'sharp') a.dmg += 3;
  }
  const cls = run.cls;
  if (cls === 'guerrero' && (a.type === 'pair' || a.type === 'trio')) a.dmg += 3;
  if (cls === 'mago' && a.type.startsWith('straight')) { a.dmg = Math.round(a.dmg * 1.5); a.burn += 4; }
  if (cls === 'picaro' && (a.type === 'poker' || a.type === 'legend')) a.dmg = Math.round(a.dmg * 1.5);
  if (cls === 'paladin' && a.type === 'ones') a.heal += 2 * faces.length;
  if (cls === 'paladin' && a.type === 'bastion') a.heal += 8;

  relicHooks(run, 'modAction').forEach((r) => r.modAction(a, faces, c, run));

  if (c.furia > 0) {
    a.dmg = Math.round(a.dmg * (1 + c.furia));
    a.block = Math.round(a.block * (1 + c.furia));
    a.furia = c.furia;
  }
  return a;
}

/** Previsualiza lo que daría la selección actual de ranuras. */
export function preview(run, slotIdx) {
  const c = run.combat;
  const faces = slotIdx.map((i) => c.slots[i]).filter((s) => s && s.state === 'free' && s.face).map((s) => s.face);
  if (faces.length !== slotIdx.length) return null;
  return buildAction(run, faces);
}

/** Aparta una selección de dados como acción. Puede provocar racha (hot dice). */
export function bank(run, slotIdx) {
  const c = run.combat;
  if (c.over || !c.rolled) return { error: 'Primero tira' };
  const a = preview(run, slotIdx);
  if (!a) return { error: 'Esa selección no puntúa' };
  slotIdx.forEach((i) => (c.slots[i].state = 'banked'));
  c.banked.push(a);
  c.canRoll = true;
  if (freeSlots(c).length === 0) {
    c.furia += has(run, 'trebol') ? 0.5 : 0.25;
    c.rollsLeft++;
    c.slots.forEach((s) => { if (s.state === 'banked') { s.state = 'free'; s.face = null; } });
    run.stats.hotDice++;
    if (run.cls === 'picaro') run.gold += 5;
    c.events.push({ k: 'hot', furia: c.furia });
    return { action: a, hot: true };
  }
  return { action: a, hot: false };
}

function hitEnemy(run, raw) {
  const c = run.combat, e = c.enemy;
  let dmg = raw;
  if (e.vuln > 0) dmg = Math.floor(dmg * 1.5);
  if (e.traits.armored) dmg = Math.max(0, dmg - e.traits.armored);
  const absorbed = Math.min(e.block, dmg);
  e.block -= absorbed;
  const real = dmg - absorbed;
  e.hp -= real;
  run.stats.dmgDealt += real;
  return { dmg, real, absorbed };
}

function hurtPlayer(run, raw) {
  const c = run.combat;
  const absorbed = Math.min(c.block, raw);
  c.block -= absorbed;
  const real = raw - absorbed;
  run.hp -= real;
  run.stats.dmgTaken += real;
  return { raw, real, absorbed };
}

/** Ejecuta las acciones apartadas y pasa el turno al enemigo. */
export function execute(run) {
  const c = run.combat, e = c.enemy;
  if (c.over) return { error: 'Combate terminado' };
  let total = 0;
  for (const a of c.banked) {
    if (a.dmg > 0) {
      const h = hitEnemy(run, a.dmg);
      total += h.real;
      run.stats.bestHit = Math.max(run.stats.bestHit, h.dmg);
      c.events.push({ k: 'hit', a, ...h });
      if (e.traits.thorns) { hurtPlayer(run, e.traits.thorns); c.events.push({ k: 'thorns', v: e.traits.thorns }); }
    }
    if (a.block) c.block += a.block;
    if (a.burn) e.burn += a.burn;
    if (a.weak) e.weak = Math.max(e.weak, a.weak);
    if (a.vuln) e.vuln = Math.max(e.vuln, a.vuln + 1);
    if (a.heal) run.hp = Math.min(run.maxHp, run.hp + a.heal);
    if (a.gold) run.gold += a.gold;
    if (a.type === 'legend') run.stats.legends++;
  }
  if (has(run, 'copa') && total >= 8) run.hp = Math.min(run.maxHp, run.hp + Math.floor(total / 8));
  c.banked = [];
  if (checkEnd(run)) return { total };
  enemyTurn(run);
  return { total };
}

function enemyTurn(run) {
  const c = run.combat, e = c.enemy;
  // Efectos al inicio del turno enemigo
  if (e.burn > 0) {
    e.hp -= e.burn;
    run.stats.dmgDealt += e.burn;
    c.events.push({ k: 'burn', v: e.burn });
    e.burn = Math.max(0, e.burn - 2);
    if (checkEnd(run)) return;
  }
  if (e.traits.regen) { e.hp = Math.min(e.maxHp, e.hp + e.traits.regen); c.events.push({ k: 'regen', v: e.traits.regen }); }
  if (e.traits.enrage) e.str += 1;
  e.block = 0;

  const it = e.intent;
  const strike = (v) => {
    const raw = Math.floor((v + e.str) * (e.weak > 0 ? 0.7 : 1));
    const h = hurtPlayer(run, raw);
    c.events.push({ k: 'enemyHit', ...h });
    if (has(run, 'espinas')) { e.hp -= 3; c.events.push({ k: 'thornsBack', v: 3 }); }
  };
  if (it.t === 'atk') strike(it.v);
  if (it.t === 'multi') for (let i = 0; i < it.n; i++) strike(it.v);
  if (it.t === 'atkblock') { strike(it.v); e.block += it.b; }
  if (it.t === 'block') { e.block += it.v; c.events.push({ k: 'enemyBlock', v: it.v }); }
  if (it.t === 'buff') { e.str += it.v; c.events.push({ k: 'enemyBuff', v: it.v }); }
  if (it.t === 'heal') { e.hp = Math.min(e.maxHp, e.hp + it.v); c.events.push({ k: 'enemyHeal', v: it.v }); }
  if (it.t === 'curse') { e.sealNext = Math.min(it.v, run.dice.length - 1); c.events.push({ k: 'curse', v: it.v }); }

  if (e.weak > 0) e.weak--;
  if (e.vuln > 0) e.vuln--;
  e.step++;
  e.intent = pickIntent(run, ENEMIES[e.id], e.step);
  if (checkEnd(run)) return;
  startTurn(run);
}

function checkEnd(run) {
  const c = run.combat;
  if (c.enemy.hp <= 0) {
    c.enemy.hp = 0;
    c.over = 'win';
    return true;
  }
  if (run.hp <= 0) {
    if (has(run, 'fenix') && !run.fenixUsed) {
      run.fenixUsed = true;
      run.hp = Math.ceil(run.maxHp * 0.4);
      c.events.push({ k: 'fenix' });
      return false;
    }
    run.hp = 0;
    c.over = 'lose';
    return true;
  }
  return false;
}

/** Vacía la cola de eventos para la UI. */
export const drainEvents = (run) => run.combat ? run.combat.events.splice(0) : [];
