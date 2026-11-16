// Metaprogresión entre runs: gloria, desbloqueos, niveles de ascensión, reto diario, logros.
import { CLASSES, RELICS } from './data.js';
import { gloria } from './run.js';

export const MAX_ASC = 10;

export const newProfile = () => ({
  v: 1, gloria: 0, runs: 0, wins: 0, kills: 0, legends: 0, bestHit: 0, bestAct: 0,
  maxAsc: 0, // nivel de ascensión máximo desbloqueado
  winsByClass: {}, daily: {}, achievements: [],
});

export const unlockedClasses = (p) => Object.keys(CLASSES).filter((k) => p.gloria >= CLASSES[k].unlock);
export const unlockedRelics = (p) => Object.keys(RELICS).filter((k) => p.gloria >= RELICS[k].unlock);

/** Próximo desbloqueo pendiente (para enseñar «te faltan X de gloria»). */
export function nextUnlock(p) {
  const items = [
    ...Object.entries(CLASSES).map(([k, c]) => ({ kind: 'clase', name: c.name, icon: c.icon, at: c.unlock })),
    ...Object.entries(RELICS).map(([k, r]) => ({ kind: 'reliquia', name: r.name, icon: r.icon, at: r.unlock })),
  ].filter((x) => x.at > p.gloria).sort((a, b) => a.at - b.at);
  return items[0] || null;
}

export const ACHIEVEMENTS = {
  primera: { name: 'Primera sangre', desc: 'Gana tu primer combate', test: (r) => r.stats.kills >= 1 },
  leyenda: { name: '¡LEYENDA!', desc: 'Saca cinco dados iguales', test: (r) => r.stats.legends >= 1 },
  golpe50: { name: 'Golpe titánico', desc: 'Inflige 50 de daño en una acción', test: (r) => r.stats.bestHit >= 50 },
  golpe100: { name: 'Mazazo divino', desc: 'Inflige 100 de daño en una acción', test: (r) => r.stats.bestHit >= 100 },
  acto2: { name: 'Más allá de las catacumbas', desc: 'Llega al acto 2', test: (r) => r.act >= 2 },
  acto3: { name: 'Ante la ciudadela', desc: 'Llega al acto 3', test: (r) => r.act >= 3 },
  victoria: { name: 'Matadragones', desc: 'Completa una run', test: (r) => r.phase === 'victory' },
  rachas: { name: 'En racha', desc: '10 rachas en una run', test: (r) => r.stats.hotDice >= 10 },
  coleccion: { name: 'Coleccionista', desc: '8 reliquias en una run', test: (r) => r.relics.length >= 8 },
  temerario: { name: 'Sin red', desc: 'Gana una run sin pifias', test: (r) => r.phase === 'victory' && r.stats.busts === 0 },
};

/** Cierra una run y actualiza el perfil. Devuelve el resumen para la pantalla final. */
export function finishRun(p, run) {
  const before = { classes: unlockedClasses(p), relics: unlockedRelics(p) };
  const g = gloria(run);
  const won = run.phase === 'victory';
  p.gloria += g;
  p.runs++;
  p.kills += run.stats.kills;
  p.legends += run.stats.legends;
  p.bestHit = Math.max(p.bestHit, run.stats.bestHit);
  p.bestAct = Math.max(p.bestAct, run.act);
  if (won) {
    p.wins++;
    p.winsByClass[run.cls] = (p.winsByClass[run.cls] || 0) + 1;
    if (run.asc >= p.maxAsc && p.maxAsc < MAX_ASC) p.maxAsc = run.asc + 1;
  }
  if (run.daily) p.daily[run.daily] = Math.max(p.daily[run.daily] || 0, g);
  const newAch = Object.entries(ACHIEVEMENTS).filter(([k, a]) => !p.achievements.includes(k) && a.test(run)).map(([k]) => k);
  p.achievements.push(...newAch);
  const unlocked = [
    ...unlockedClasses(p).filter((k) => !before.classes.includes(k)).map((k) => `${CLASSES[k].icon} ${CLASSES[k].name}`),
    ...unlockedRelics(p).filter((k) => !before.relics.includes(k)).map((k) => `${RELICS[k].icon} ${RELICS[k].name}`),
  ];
  return { gloria: g, won, unlocked, achievements: newAch.map((k) => ACHIEVEMENTS[k].name) };
}
