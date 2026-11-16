// Textos e iconos de presentación (sin reglas de juego).
import { MODS, COMBOS } from '../core/dice.js';
import { RELICS, MASTERY } from '../core/data.js';

export const NODE_ICON = { combat: '⚔️', elite: '👹', boss: '👑', shop: '🛒', event: '❓', rest: '🔥', treasure: '💎' };
export const NODE_NAME = { combat: 'Combate', elite: 'Élite', boss: 'Jefe', shop: 'Mercader', event: 'Evento', rest: 'Hoguera', treasure: 'Tesoro' };

export function intentText(it, dmg) {
  switch (it.t) {
    case 'atk': return { cls: '', html: `⚔️ ${dmg}` };
    case 'multi': return { cls: '', html: `⚔️ ${dmg}×${it.n}` };
    case 'atkblock': return { cls: '', html: `⚔️ ${dmg} 🛡️ ${it.b}` };
    case 'block': return { cls: 'def', html: `🛡️ Se defiende ${it.v}` };
    case 'buff': return { cls: 'mag', html: `💪 Fuerza +${it.v}` };
    case 'curse': return { cls: 'mag', html: `⛓️ Sellará ${it.v} dado${it.v > 1 ? 's' : ''}` };
    case 'heal': return { cls: 'def', html: `💚 Cura ${it.v}` };
    default: return { cls: '', html: '?' };
  }
}

export function actionText(a) {
  const parts = [];
  if (a.dmg) parts.push(`⚔️${a.dmg}`);
  if (a.block) parts.push(`🛡️${a.block}`);
  if (a.burn) parts.push(`🔥${a.burn}`);
  if (a.weak) parts.push('❄️');
  if (a.vuln) parts.push('💢');
  if (a.heal) parts.push(`💚${a.heal}`);
  if (a.gold) parts.push(`💰${a.gold}`);
  return parts.join(' ');
}

export function masteryBonus(combo) {
  const m = MASTERY[combo];
  const b = [];
  if (m.dmg) b.push(`+${m.dmg} daño`);
  if (m.block) b.push(`+${m.block} escudo`);
  return b.join(' y ') + (m.perDie ? ' por dado' : '');
}

/** Icono, título y descripción de cualquier oferta (botín o tienda). */
export function offerText(o, run) {
  switch (o.kind) {
    case 'rune': return { ic: MODS[o.mod].icon, t: `Runa de ${MODS[o.mod].name}`, d: `Graba en una cara: ${MODS[o.mod].desc}.` };
    case 'carve': return { ic: '🪓', t: `Tallar un ${o.v}`, d: `Cambia el número de una cara por un ${o.v}.` };
    case 'mastery': {
      const lvl = (run.mastery[o.combo] || 0) + 1;
      return { ic: '📜', t: `Maestría: ${COMBOS[o.combo].name} Nv ${lvl}`, d: `${COMBOS[o.combo].desc}. ${masteryBonus(o.combo)} por nivel.` };
    }
    case 'maxhp': return { ic: '❤️', t: `+${o.v} PV máximos`, d: 'Más aguante para el resto de la run.' };
    case 'heal': return { ic: '💚', t: `Curar ${o.v} PV`, d: 'Recupera vida ahora.' };
    case 'relic': return { ic: RELICS[o.id].icon, t: RELICS[o.id].name, d: RELICS[o.id].desc };
    default: return { ic: '?', t: '?', d: '' };
  }
}

export const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
export const pipsHtml = (v) => `<div class="pips">${Array.from({ length: 9 }, (_, i) => `<i class="${PIPS[v]?.includes(i) ? 'on' : ''}"></i>`).join('')}</div>`;
export const modBadge = (m) => (m ? `<span class="m">${MODS[m].icon}</span>` : '');
