// Capa de presentación. Toda regla de juego vive en src/core.
import './ui/style.css';
import { CLASSES, RELICS, ACT_POOLS, EVENTS, MASTERY } from './core/data.js';
import { COMBOS, MODS } from './core/dice.js';
import { rollDice, bank, execute, preview, intentDamage, drainEvents } from './core/combat.js';
import { bestBank } from './core/bot.js';
import { newRun, reachable, enterNode, resolveCombat, chooseReward, applyFace, leaveNode, buy, rest, resolveEvent, gloria, dailySeed, FLOORS } from './core/run.js';
import { newProfile, finishRun, unlockedClasses, unlockedRelics, nextUnlock, ACHIEVEMENTS, MAX_ASC } from './core/meta.js';
import { NODE_ICON, NODE_NAME, intentText, actionText, offerText, pipsHtml, modBadge, masteryBonus } from './ui/text.js';

// ───────────── Persistencia ─────────────
const KEY_RUN = 'dl_run_v1', KEY_PROF = 'dl_profile_v1';
const load = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const save = () => {
  try {
    localStorage.setItem(KEY_PROF, JSON.stringify(profile));
    if (run && !['victory', 'defeat'].includes(run.phase)) localStorage.setItem(KEY_RUN, JSON.stringify(run));
    else localStorage.removeItem(KEY_RUN);
  } catch { /* almacenamiento no disponible */ }
};

let profile = { ...newProfile(), ...(load(KEY_PROF) || {}) };
let run = load(KEY_RUN);
if (run && run.v !== 1) run = null;
if (run && !run.path) run.path = [];
const ui = { screen: 'title', sel: [], cls: 'guerrero', asc: 0, rolled: [], busy: false, end: null, toast: null };

const app = document.getElementById('app');
const $ = (s) => document.querySelector(s);
const vibrate = (p) => { try { navigator.vibrate?.(p); } catch { /* */ } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ───────────── Efectos visuales ─────────────
function floatText(target, text, color = '#fff') {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = 'float';
  f.textContent = text;
  f.style.color = color;
  f.style.left = `${r.left + r.width / 2 - 20 + (Math.random() * 40 - 20)}px`;
  f.style.top = `${r.top + r.height / 3}px`;
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 1000);
}
function banner(text, bad = false) {
  const b = document.createElement('div');
  b.className = `banner${bad ? ' bad' : ''}`;
  b.textContent = text;
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 1100);
}
function toast(msg, ms = 2200) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
function bump(sel, cls) {
  const el = $(sel);
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
}

async function playEvents() {
  const evs = drainEvents(run);
  for (const e of evs) {
    switch (e.k) {
      case 'hit': bump('.enemy', 'hit'); floatText('.enemy .big', `-${e.real}`, '#ffd36b'); if (e.dmg >= 40) { banner(`¡${e.dmg}!`); vibrate(60); } break;
      case 'burn': floatText('.enemy .big', `🔥-${e.v}`, '#ff8a3d'); break;
      case 'regen': floatText('.enemy .big', `+${e.v}`, '#7fd17f'); break;
      case 'thorns': floatText('.player', `🌵-${e.v}`, '#ff6b5e'); break;
      case 'thornsBack': floatText('.enemy .big', `🌵-${e.v}`, '#ffd36b'); break;
      case 'enemyHit': bump('#app', 'shake'); floatText('.player', e.real ? `-${e.real}` : `🛡️${e.absorbed}`, e.real ? '#ff6b5e' : '#8fb7ff'); vibrate(e.real ? 40 : 10); break;
      case 'enemyBlock': floatText('.enemy .big', `🛡️+${e.v}`, '#8fb7ff'); break;
      case 'enemyBuff': floatText('.enemy .big', `💪+${e.v}`, '#d59cff'); break;
      case 'enemyHeal': floatText('.enemy .big', `+${e.v}`, '#7fd17f'); break;
      case 'curse': toast(`⛓️ ${e.v} dado${e.v > 1 ? 's' : ''} sellado${e.v > 1 ? 's' : ''} el próximo turno`); break;
      case 'bust': banner('¡PIFIA!', true); vibrate([80, 40, 80]); break;
      case 'saved': banner('🦴 ¡Salvado!'); break;
      case 'hot': banner(`¡RACHA! Furia ${Math.round(e.furia * 100)}%`); vibrate([20, 30, 20]); break;
      case 'fenix': banner('🪶 ¡RENACES!'); break;
    }
    await wait(230);
  }
}

// ───────────── Componentes ─────────────
const bar = (v, max, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, (100 * v) / max)}%"></i><span>${v} / ${max}</span></div>`;
const relicsHtml = () => `<div class="relics">${run.relics.map((id) => `<button class="relic" data-act="relic" data-arg="${id}">${RELICS[id].icon}</button>`).join('')}</div>`;
const hud = () => `
  <div class="hud">
    <span class="pill">${CLASSES[run.cls].icon} ❤️ ${run.hp}/${run.maxHp}</span>
    <span class="pill">💰 ${run.gold}</span>
    <span class="spacer"></span>
    <button class="btn" style="min-height:40px;padding:6px 10px" data-act="dice">🎲</button>
    <button class="btn" style="min-height:40px;padding:6px 10px" data-act="help">?</button>
    <button class="btn" style="min-height:40px;padding:6px 10px" data-act="menu">☰</button>
  </div>`;

function dieHtml(face, i, cls = '', act = 'die') {
  if (!face) return `<button class="die empty ${cls}" data-act="${act}" data-arg="${i}">?</button>`;
  const inner = face.m === 'wild' ? '★' : pipsHtml(face.v);
  return `<button class="die ${cls}" data-act="${act}" data-arg="${i}">${inner}${face.m && face.m !== 'wild' ? modBadge(face.m) : ''}</button>`;
}

function offerBtn(o, act, arg, extra = '') {
  const t = offerText(o, run);
  return `<button class="card offer ${o.sold ? 'sold' : ''}" data-act="${act}" data-arg="${arg}">
    <span class="ic">${t.ic}</span><span><b>${t.t}</b><br><span class="small dim">${t.d}</span></span>${extra}</button>`;
}

// ───────────── Pantallas ─────────────
function titleScreen() {
  const nu = nextUnlock(profile);
  const today = new Date().toISOString().slice(0, 10);
  return `
    <div class="title"><div class="dice-logo">🎲⚔️🎲</div><h1>Dice&amp;Legends</h1>
      <p class="dim">Tira, arriesga, conviértete en leyenda.</p></div>
    <div class="col">
      ${run ? `<button class="btn primary block" data-act="continue">Continuar · ${CLASSES[run.cls].icon} Acto ${run.act}</button>` : ''}
      <button class="btn ${run ? '' : 'primary'} block" data-act="screen" data-arg="classSel">Nueva partida</button>
      <button class="btn block" data-act="daily">🌅 Reto diario ${profile.daily[today] ? `· récord ${profile.daily[today]}` : ''}</button>
      <button class="btn block" data-act="screen" data-arg="profile">📜 Crónica del héroe</button>
      <button class="btn block" data-act="help">❔ Cómo se juega</button>
    </div>
    <div class="card center small">
      <b class="furia">✦ ${profile.gloria} de gloria</b> · ${profile.wins} victorias en ${profile.runs} runs
      ${nu ? `<br><span class="dim">Próximo desbloqueo: ${nu.icon} ${nu.name} a ${nu.at} de gloria</span>` : ''}
    </div>`;
}

function classSelScreen() {
  const unlocked = unlockedClasses(profile);
  return `
    <h2>Elige a tu héroe</h2>
    <div class="classes">${Object.entries(CLASSES).map(([k, c]) => {
      const ok = unlocked.includes(k);
      return `<button class="cls ${ui.cls === k ? 'sel' : ''} ${ok ? '' : 'locked'}" data-act="cls" data-arg="${k}">
        <div class="ic">${ok ? c.icon : '🔒'}</div><b>${c.name}</b> <span class="dim small">❤️${c.hp}</span>
        <div class="small dim">${ok ? c.passive : `Se desbloquea con ${c.unlock} de gloria`}</div></button>`;
    }).join('')}</div>
    ${profile.maxAsc > 0 ? `
      <div class="card">
        <b>Ascensión ${ui.asc}</b> <span class="small dim">${ui.asc ? `Enemigos +${ui.asc * 8}% PV y más fuertes. Gloria ×${(1 + 0.15 * ui.asc).toFixed(2)}` : 'Dificultad normal'}</span>
        <div class="row" style="margin-top:8px">
          <button class="btn" data-act="asc" data-arg="-1">−</button>
          <button class="btn" data-act="asc" data-arg="1">+</button>
        </div>
      </div>` : ''}
    <div class="spacer"></div>
    <div class="row">
      <button class="btn" data-act="screen" data-arg="title">Volver</button>
      <button class="btn primary" data-act="start">¡A la mazmorra!</button>
    </div>`;
}

function profileScreen() {
  return `
    <h2>Crónica del héroe</h2>
    <div class="card small">
      ✦ Gloria total: <b>${profile.gloria}</b><br>
      Runs: ${profile.runs} · Victorias: ${profile.wins} · Mejor acto: ${profile.bestAct}<br>
      Enemigos abatidos: ${profile.kills} · Leyendas: ${profile.legends} · Mayor golpe: ${profile.bestHit}<br>
      Ascensión máxima desbloqueada: ${profile.maxAsc}/${MAX_ASC}
    </div>
    <h3>Logros</h3>
    <div class="card col small">${Object.entries(ACHIEVEMENTS).map(([k, a]) =>
      `<div class="ach ${profile.achievements.includes(k) ? '' : 'off'}">🏆 <span><b>${a.name}</b> · <span class="dim">${a.desc}</span></span></div>`).join('')}</div>
    <h3>Reliquias descubiertas ${unlockedRelics(profile).length}/${Object.keys(RELICS).length}</h3>
    <div class="relics">${Object.entries(RELICS).map(([k, r]) => profile.gloria >= r.unlock
      ? `<button class="relic" data-act="relicInfo" data-arg="${k}">${r.icon}</button>`
      : `<button class="relic" data-act="lockedRelic" data-arg="${k}">🔒</button>`).join('')}</div>
    <div class="spacer"></div>
    <button class="btn block" data-act="screen" data-arg="title">Volver</button>`;
}

function mapScreen() {
  const W = 300, RH = 74, H = FLOORS * RH + 20;
  const x = (lane) => 50 + lane * 100;
  const y = (f) => H - 40 - f * RH;
  const reach = reachable(run);
  let lines = '', nodes = '';
  run.map.forEach((row, f) => row.forEach((n, i) => {
    n.next.forEach((ni) => {
      const t = run.map[f + 1][ni];
      const done = f < run.floor && run.path[f] === i && run.path[f + 1] === ni;
      lines += `<line x1="${x(n.lane)}" y1="${y(f)}" x2="${x(t.lane)}" y2="${y(f + 1)}" class="${done ? 'done' : ''}"/>`;
    });
    const isReach = f === run.floor + 1 && reach.includes(i);
    const isCur = f === run.floor && n.lane === run.lane;
    const visited = f <= run.floor && run.path[f] === i;
    const cls = isReach ? 'reach' : isCur ? 'cur' : visited ? 'done' : f <= run.floor + 1 ? 'dim' : '';
    const r = n.type === 'boss' ? 28 : 22;
    nodes += `<g class="node ${cls}" ${isReach ? `data-act="node" data-arg="${i}"` : ''}>
      <circle cx="${x(n.lane)}" cy="${y(f)}" r="${r}"/>
      <text x="${x(n.lane)}" y="${y(f) + 7}" text-anchor="middle" font-size="${n.type === 'boss' ? 26 : 20}">${n.type === 'boss' ? ENEMY_ICON(run.act) : NODE_ICON[n.type]}</text></g>`;
  }));
  return `
    ${hud()}
    <div class="row" style="align-items:center"><h2>Acto ${run.act} · ${ACT_POOLS[run.act].name}</h2></div>
    ${relicsHtml()}
    <div class="map" id="map"><svg viewBox="0 0 ${W} ${H}">${lines}${nodes}</svg></div>
    <p class="small dim center">Toca un nodo brillante para avanzar. ⚔️ combate · 👹 élite · ❓ evento · 🛒 mercader · 🔥 hoguera · 💎 tesoro</p>`;
}
const ENEMY_ICON = (act) => ({ 1: '🤴', 2: '🧙', 3: '🐉' })[act];

function combatScreen() {
  const c = run.combat, e = c.enemy;
  const it = intentText(e.intent, intentDamage(e));
  const p = ui.sel.length ? preview(run, ui.sel) : null;
  const canRoll = c.canRoll && c.rollsLeft > 0 && !c.over;
  const status = [
    e.block ? `<span>🛡️ ${e.block}</span>` : '', e.str ? `<span>💪 ${e.str}</span>` : '', e.burn ? `<span>🔥 ${e.burn}</span>` : '',
    e.weak ? `<span>❄️ débil</span>` : '', e.vuln ? `<span>💢 vulnerable</span>` : '',
    e.traits.armored ? `<span>🪖 armadura ${e.traits.armored}</span>` : '', e.traits.regen ? `<span>♻️ regen ${e.traits.regen}</span>` : '',
    e.traits.thorns ? `<span>🌵 espinas ${e.traits.thorns}</span>` : '', e.traits.enrage ? `<span>😤 furia</span>` : '',
  ].join('');
  let prevHtml;
  if (!c.rolled) prevHtml = `<span class="dim">Tira los dados para empezar el turno</span>`;
  else if (p) prevHtml = `<span class="ok">${p.name}${p.lvl ? ` Nv${p.lvl}` : ''}: ${actionText(p)}</span>`;
  else if (ui.sel.length) prevHtml = `<span class="bad">Esa selección no puntúa</span>`;
  else if (!c.canRoll) prevHtml = `<span class="dim">Selecciona dados que puntúen</span> <button class="btn" style="min-height:36px;padding:4px 10px" data-act="hint">💡</button>`;
  else prevHtml = `<span class="dim">Vuelve a tirar los libres o ataca</span>`;

  return `
    ${hud()}
    <div class="card enemy">
      <div class="small dim">${e.boss ? 'JEFE' : e.elite ? 'ÉLITE' : `Acto ${run.act} · piso ${run.floor + 1}`}</div>
      <div class="big">${e.icon}</div>
      <h3>${e.name}</h3>
      ${bar(e.hp, e.maxHp)}
      <div class="intent ${it.cls}">${it.html}</div>
      <div class="status">${status}</div>
    </div>
    ${relicsHtml()}
    <div class="player">
      ${bar(run.hp, run.maxHp, 'green')}
      ${c.block ? `<span class="pill" style="background:#1d2a3a;border:1px solid var(--blue);border-radius:99px;padding:2px 8px">🛡️ ${c.block}</span>` : ''}
      ${c.furia ? `<span class="furia">🔥×${(1 + c.furia).toFixed(2)}</span>` : ''}
    </div>
    <div class="banked">${c.banked.length ? c.banked.map((a) => `<span class="chip">${a.name} ${actionText(a)}</span>`).join('') : '<span class="small dim">Acciones apartadas este turno</span>'}</div>
    <div class="spacer"></div>
    <div class="dice">${c.slots.map((s, i) => {
      if (s.state === 'sealed') return `<button class="die sealed">⛓️</button>`;
      const cls = [s.state === 'banked' ? 'banked' : '', ui.sel.includes(i) ? 'sel' : '', ui.rolled.includes(i) ? 'rolling' : ''].join(' ');
      return dieHtml(s.face, i, cls);
    }).join('')}</div>
    <div class="preview">${prevHtml}</div>
    <div class="actions">
      <button class="btn" data-act="roll" ${canRoll ? '' : 'disabled'}>🎲 Tirar (${c.rollsLeft})</button>
      <button class="btn" data-act="bank" ${p ? '' : 'disabled'}>✋ Apartar</button>
      <button class="btn primary" data-act="exec" ${(c.banked.length || p) && !c.over ? '' : 'disabled'}>⚔️ Atacar</button>
    </div>
`;
}

function rewardScreen() {
  const rw = run.reward;
  const boss = rw.bossRelics?.length;
  return `
    ${hud()}
    <h2>${rw.treasure ? '💎 ¡Tesoro!' : '🏆 ¡Victoria!'}</h2>
    <div class="card">💰 +${rw.gold} de oro${rw.relic ? `<br>${RELICS[rw.relic].icon} <b>${RELICS[rw.relic].name}</b>: <span class="dim">${RELICS[rw.relic].desc}</span>` : ''}</div>
    ${boss ? `<h3>Elige una reliquia legendaria</h3>
      ${rw.bossRelics.map((id) => offerBtn({ kind: 'relic', id }, 'bossRelic', id)).join('')}` : ''}
    ${!boss && rw.options.length ? `<h3>Elige tu botín</h3>${rw.options.map((o, i) => offerBtn(o, 'loot', i)).join('')}` : ''}
    <div class="spacer"></div>
    <button class="btn ${!boss && !rw.options.length ? 'primary' : ''} block" data-act="leave" ${boss ? 'disabled' : ''}>${rw.options.length ? 'Saltar botín' : 'Continuar'}</button>`;
}

function shopScreen() {
  return `
    ${hud()}
    <h2>🛒 El mercader</h2>
    <p class="dim small">«Runas, maestrías y baratijas. Todo tiene un precio, viajero.»</p>
    <div class="col">${run.shop.items.map((it, i) => offerBtn(it, 'buy', i, `<span class="price">${it.sold ? 'Vendido' : `💰${it.price}`}</span>`)).join('')}</div>
    <div class="spacer"></div>
    <button class="btn primary block" data-act="leave">Seguir el camino</button>`;
}

function restScreen() {
  return `
    ${hud()}
    <h2>🔥 La hoguera</h2>
    <p class="dim">Las brasas crepitan. Puedes descansar o trabajar tus dados.</p>
    <button class="btn block" data-act="rest" data-arg="heal">💤 Descansar: +${Math.ceil(run.maxHp * 0.3)} PV</button>
    <button class="btn block" data-act="rest" data-arg="forge">⚒️ Forjar: runa aleatoria en la cara que elijas</button>`;
}

function eventScreen() {
  const ev = EVENTS[run.event];
  return `
    ${hud()}
    <div class="card center"><div style="font-size:3.5rem">${ev.icon}</div><h2>${ev.title}</h2><p>${ev.text}</p></div>
    <div class="col">${ev.options.map((o, i) => `<button class="btn block" data-act="event" data-arg="${i}" ${o.cost && run.gold < o.cost ? 'disabled' : ''}>${o.label}</button>`).join('')}</div>`;
}

function endScreen() {
  const s = run.stats, r = ui.end;
  return `
    <div class="title"><div class="dice-logo">${r.won ? '👑' : '💀'}</div><h1>${r.won ? '¡LEYENDA!' : 'Has caído'}</h1>
      <p class="dim">${r.won ? 'El dragón ancestral yace derrotado.' : `Acto ${run.act}, piso ${run.floor + 1}`}</p></div>
    <div class="card small">
      Enemigos: ${s.kills} · Élites: ${s.elites} · Jefes: ${s.bosses}<br>
      Mayor golpe: ${s.bestHit} · Rachas: ${s.hotDice} · Leyendas: ${s.legends} · Pifias: ${s.busts}<br>
      Daño total: ${s.dmgDealt}
    </div>
    <div class="card center"><b class="furia" style="font-size:1.4rem">+${r.gloria} de gloria</b></div>
    ${r.unlocked.length ? `<div class="card"><b>🔓 Desbloqueado:</b><br>${r.unlocked.join('<br>')}</div>` : ''}
    ${r.achievements.length ? `<div class="card"><b>🏆 Logros:</b><br>${r.achievements.join('<br>')}</div>` : ''}
    <div class="spacer"></div>
    <button class="btn primary block" data-act="toTitle">Volver al campamento</button>`;
}

// ───────────── Modales ─────────────
function openModal(html) {
  closeModal();
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="sheet">${html}</div>`;
  m.addEventListener('click', (ev) => { if (ev.target === m && !run?.pending) closeModal(); });
  document.body.appendChild(m);
}
const closeModal = () => document.querySelector('.modal')?.remove();

function diceSheet(pick = false) {
  const o = run.pending;
  const head = pick ? (() => { const t = offerText(o, run); return `<h2>${t.ic} ${t.t}</h2><p class="small dim">${t.d} Toca la cara que quieres modificar.</p>`; })()
    : `<h2>🎲 Tus dados</h2>`;
  const mast = Object.entries(run.mastery).filter(([, l]) => l > 0);
  return `${head}
    ${run.dice.map((d, di) => `<div class="dieRow"><span class="lbl">D${di + 1}</span>${d.faces.map((f, fi) =>
      `<button class="face" ${pick ? `data-act="face" data-arg="${di}:${fi}"` : ''}>${f.m === 'wild' ? '★' : f.v}${f.m && f.m !== 'wild' ? `<span class="m">${MODS[f.m].icon}</span>` : ''}</button>`).join('')}</div>`).join('')}
    ${!pick && mast.length ? `<h3>📜 Maestrías</h3><div class="small">${mast.map(([k, l]) => `<b>${COMBOS[k].name}</b> Nv${l} (${masteryBonus(k)} por nivel)`).join('<br>')}</div>` : ''}
    ${!pick ? `<p class="small dim">${Object.values(MODS).map((m) => `${m.icon} ${m.name}: ${m.desc}`).join('<br>')}</p><button class="btn block" data-act="close">Cerrar</button>` : ''}`;
}

function helpSheet() {
  return `<h2>❔ Cómo se juega</h2>
    <p class="small">1. <b>Tira</b> tus dados. 2. <b>Selecciona</b> los que formen una combinación y pulsa <b>Apartar</b>. 3. Vuelve a tirar los libres o pulsa <b>Atacar</b> para lanzar todo lo apartado.</p>
    <p class="small">⚠️ <b>Pifia:</b> si una tirada nueva no puntúa nada, pierdes todo lo apartado ese turno y el enemigo ataca.<br>
    🔥 <b>Racha:</b> si apartas todos los dados, los recuperas con una tirada extra y +25% de furia (más daño y escudo).<br>
    👁️ Mira siempre la <b>intención</b> del enemigo antes de arriesgar.</p>
    <table class="combos">${Object.entries(COMBOS).map(([k, c]) => `<tr><td>${c.name}</td><td>${c.desc}</td></tr>`).join('')}</table>
    <p class="small dim">Mejora tus dados con runas y tallas, sube de nivel tus combinaciones con maestrías y colecciona reliquias. Al morir ganas gloria que desbloquea clases y reliquias.</p>
    <button class="btn block" data-act="close">Entendido</button>`;
}

function menuSheet() {
  return `<h2>☰ Menú</h2>
    <button class="btn block" data-act="toTitleKeep">Guardar y salir al título</button>
    <button class="btn danger block" data-act="abandon">Abandonar la run</button>
    <button class="btn block" data-act="close">Volver</button>`;
}

// ───────────── Render ─────────────
function render() {
  let html;
  if (ui.screen === 'title') html = titleScreen();
  else if (ui.screen === 'classSel') html = classSelScreen();
  else if (ui.screen === 'profile') html = profileScreen();
  else if (ui.screen === 'end') html = endScreen();
  else {
    html = ({ map: mapScreen, combat: combatScreen, reward: rewardScreen, shop: shopScreen, rest: restScreen, event: eventScreen })[run.phase]?.() || '';
  }
  app.innerHTML = html;
  if (ui.screen === 'game' && run.phase === 'map') {
    const m = $('#map'); if (m) m.scrollTop = m.scrollHeight - m.clientHeight - Math.max(0, run.floor) * 74 + 60;
  }
  if (ui.screen === 'game' && run.pending && !document.querySelector('.modal')) openModal(diceSheet(true));
  ui.rolled = [];
}

function checkEnd() {
  if (run && ['victory', 'defeat'].includes(run.phase)) {
    ui.end = finishRun(profile, run);
    ui.screen = 'end';
    save();
    localStorage.removeItem(KEY_RUN);
    return true;
  }
  return false;
}

async function afterCombatAction() {
  ui.busy = true;
  render();
  await playEvents();
  const c = run.combat;
  if (c?.over) {
    if (c.over === 'win') { banner('¡VICTORIA!'); vibrate([30, 40, 60]); } else banner('HAS CAÍDO', true);
    await wait(1100);
    resolveCombat(run);
    ui.sel = [];
    if (!checkEnd()) { save(); }
  }
  ui.busy = false;
  save();
  render();
}

function startRun(opts) {
  run = newRun({ ...opts, unlockedRelics: unlockedRelics(profile) });
  ui.screen = 'game';
  ui.sel = [];
  save();
  render();
}

// ───────────── Acciones ─────────────
const actions = {
  screen: (a) => { ui.screen = a; render(); },
  continue: () => { ui.screen = 'game'; render(); },
  cls: (k) => {
    if (!unlockedClasses(profile).includes(k)) return toast(`🔒 Necesitas ${CLASSES[k].unlock} de gloria`);
    ui.cls = k; render();
  },
  asc: (d) => { ui.asc = Math.max(0, Math.min(profile.maxAsc, ui.asc + +d)); render(); },
  start: () => startRun({ cls: ui.cls, asc: ui.asc, seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0 }),
  daily: () => {
    const date = new Date().toISOString().slice(0, 10);
    const seed = dailySeed();
    const classes = Object.keys(CLASSES);
    startRun({ cls: classes[seed % classes.length], seed, daily: date });
    toast(`🌅 Reto del ${date}: todos juegan la misma mazmorra`);
  },
  help: () => openModal(helpSheet()),
  dice: () => openModal(diceSheet(false)),
  menu: () => openModal(menuSheet()),
  close: () => closeModal(),
  relic: (id) => toast(`${RELICS[id].icon} <b>${RELICS[id].name}</b><br>${RELICS[id].desc}`, 3000),
  relicInfo: (id) => toast(`${RELICS[id].icon} <b>${RELICS[id].name}</b><br>${RELICS[id].desc}`, 3000),
  lockedRelic: (id) => toast(`🔒 Se desbloquea con ${RELICS[id].unlock} de gloria`),
  toTitleKeep: () => { closeModal(); save(); ui.screen = 'title'; render(); },
  abandon: () => { closeModal(); run.phase = 'defeat'; checkEnd(); render(); },
  toTitle: () => { run = null; ui.screen = 'title'; render(); },

  node: (i) => {
    const r = enterNode(run, +i);
    if (r.error) return;
    ui.sel = [];
    if (run.phase === 'combat') banner(run.combat.enemy.boss ? `👑 ${run.combat.enemy.name}` : run.combat.enemy.elite ? '¡Élite!' : '¡Combate!', run.combat.enemy.boss);
    save(); render();
  },

  die: (i) => {
    if (ui.busy) return;
    const s = run.combat.slots[+i];
    if (!s || s.state !== 'free' || !s.face) return;
    ui.sel = ui.sel.includes(+i) ? ui.sel.filter((x) => x !== +i) : [...ui.sel, +i];
    vibrate(5);
    render();
  },
  hint: () => { const b = bestBank(run); if (b) { ui.sel = b; render(); } },
  roll: async () => {
    if (ui.busy) return;
    const c = run.combat;
    const free = c.slots.map((s, i) => (s.state === 'free' ? i : -1)).filter((i) => i >= 0);
    const r = rollDice(run);
    if (r.error) return;
    ui.sel = [];
    ui.rolled = r.bust && !r.saved ? [] : free;
    vibrate(15);
    if (r.bust && !r.saved) {
      // Enseñar la tirada fallida un instante antes de pasar el turno
      ui.busy = true;
      await afterCombatAction();
      return;
    }
    await afterCombatAction();
  },
  bank: async () => {
    if (ui.busy) return;
    const r = bank(run, ui.sel);
    if (r.error) return toast(r.error);
    ui.sel = [];
    await afterCombatAction();
  },
  exec: async () => {
    if (ui.busy) return;
    if (ui.sel.length) { const r = bank(run, ui.sel); if (r.error) return toast(r.error); ui.sel = []; }
    execute(run);
    await afterCombatAction();
  },
  pass: async () => { if (ui.busy) return; execute(run); await afterCombatAction(); },

  loot: (i) => { chooseReward(run, { option: +i }); save(); render(); },
  bossRelic: (id) => { chooseReward(run, { bossRelic: id }); toast(`${RELICS[id].icon} ${RELICS[id].name}`); save(); render(); },
  face: (arg) => {
    const [d, f] = arg.split(':').map(Number);
    applyFace(run, d, f);
    closeModal();
    toast('✨ Dado mejorado');
    save(); render();
  },
  leave: () => {
    const r = leaveNode(run);
    if (r.error) return toast(r.error);
    if (r.newAct) banner(`Acto ${r.newAct}`);
    if (!checkEnd()) save();
    render();
  },
  buy: (i) => { const r = buy(run, +i); if (r.error) return toast(r.error); vibrate(10); save(); render(); },
  rest: (c) => { rest(run, c); save(); render(); },
  event: (i) => {
    const r = resolveEvent(run, +i);
    if (r.error) return toast(r.error);
    if (r.msg) toast(r.msg, 2800);
    save(); render();
  },
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const fn = actions[el.dataset.act];
  if (fn) fn(el.dataset.arg);
});

if (run) ui.screen = 'title';
render();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}
