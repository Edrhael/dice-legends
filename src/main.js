// Prototipo M0: tirar, apartar y detectar combinación/pifia. La UI es provisional.
import { roll, evaluate, hasScoring } from './core/dice.js';

const state = { dice: [], held: [], rolls: 0, msg: 'Pulsa Tirar' };
const app = document.getElementById('app');

function render() {
  const heldDice = state.dice.filter((_, i) => state.held[i]);
  const combo = evaluate(heldDice);
  app.innerHTML = `
    <h1>Dice&amp;Legends</h1>
    <div class="dice">${state.dice.map((d, i) =>
      `<button class="die ${state.held[i] ? 'held' : ''}" data-i="${i}">${d}</button>`).join('')}</div>
    <p class="log">${state.msg}<br>Apartados: <b>${combo ? combo.type : '—'}</b> · Tirada ${state.rolls}/3</p>
    <div class="actions">
      <button id="roll" ${state.rolls >= 3 ? 'disabled' : ''}>Tirar</button>
      <button id="reset">Nuevo turno</button>
    </div>`;
}

app.addEventListener('click', (e) => {
  const i = e.target.dataset.i;
  if (i !== undefined) { state.held[i] = !state.held[i]; return render(); }
  if (e.target.id === 'roll') {
    const free = state.dice.length ? state.dice.map((_, k) => k).filter((k) => !state.held[k]) : [0,1,2,3,4];
    const fresh = roll(free.length);
    if (!state.dice.length) state.dice = fresh; else free.forEach((k, j) => (state.dice[k] = fresh[j]));
    state.rolls++;
    state.msg = hasScoring(fresh) ? 'Aparta dados o vuelve a tirar' : '💀 ¡Pifia! Pierdes el turno';
  }
  if (e.target.id === 'reset') Object.assign(state, { dice: [], held: [], rolls: 0, msg: 'Pulsa Tirar' });
  render();
});

render();
