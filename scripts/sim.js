// Uso: node scripts/sim.js [runs] [clase] [ascension]
import { newRun } from '../src/core/run.js';
import { playRun } from '../src/core/bot.js';
import { RELICS } from '../src/core/data.js';

const N = +process.argv[2] || 300, cls = process.argv[3] || 'guerrero', asc = +process.argv[4] || 0;
const res = { victory: 0, act: { 1: 0, 2: 0, 3: 0 }, floors: 0, kills: 0, bestHit: 0, busts: 0, rolls: 0 };
for (let i = 0; i < N; i++) {
  const r = playRun(newRun({ cls, seed: 1000 + i, asc, unlockedRelics: Object.keys(RELICS) }));
  if (r.phase === 'victory') res.victory++; else res.act[r.act]++;
  res.floors += r.stats.floors; res.kills += r.stats.kills; res.bestHit += r.stats.bestHit;
  res.busts += r.stats.busts; res.rolls += r.stats.rolls;
}
console.log(`${cls} asc${asc} · ${N} runs`);
console.log(`victorias ${(100 * res.victory / N).toFixed(1)}% · muertes acto1 ${res.act[1]} acto2 ${res.act[2]} acto3 ${res.act[3]}`);
console.log(`pisos medios ${(res.floors / N).toFixed(1)} · kills ${(res.kills / N).toFixed(1)} · mejor golpe medio ${(res.bestHit / N).toFixed(0)} · pifias ${(100 * res.busts / res.rolls).toFixed(1)}% de tiradas`);
