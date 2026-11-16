// Datos del juego. Los efectos de reliquias son hooks que el motor llama (ver combat.js / run.js).

// ───────────── CLASES ─────────────
export const CLASSES = {
  guerrero: {
    name: 'Guerrero', icon: '🛡️', hp: 70, unlock: 0,
    passive: 'Disciplina: conservas la mitad del escudo entre turnos. Parejas y tríos +3 de daño.',
    // valores de cada dado y caras especiales iniciales [dado, cara, mod]
    dice: [[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6]],
    mods: [[0, 5, 'sharp']],
    keepBlock: 0.5,
  },
  mago: {
    name: 'Mago', icon: '🔮', hp: 58, unlock: 40,
    passive: 'Arcano: las escaleras hacen ×1,5 de daño y aplican 4 de quemadura.',
    dice: [[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6]],
    mods: [[0, 4, 'fire'], [1, 2, 'fire'], [2, 1, 'frost']],
  },
  picaro: {
    name: 'Pícaro', icon: '🗡️', hp: 62, unlock: 120,
    passive: 'Temerario: +1 tirada por turno. Póker y Leyenda ×1,5. Cada racha (5 dados puntuados) da 5 de oro.',
    dice: [[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6]],
    mods: [[0, 2, 'wild'], [1, 5, 'gold']],
    extraRolls: 1,
  },
  paladin: {
    name: 'Paladín', icon: '⚜️', hp: 66, unlock: 250,
    passive: 'Fe: los Unos curan 2 PV por dado y el Bastión cura 8. Empiezas cada combate con 6 de escudo.',
    dice: [[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6]],
    mods: [[0, 0, 'holy'], [1, 0, 'holy']],
  },
};

// ───────────── RELIQUIAS ─────────────
// rarity: common | rare | boss. unlock: gloria total necesaria para que aparezca.
const dmgAct = (a) => a.dmg > 0;
export const RELICS = {
  espada: { name: 'Espada del héroe', icon: '⚔️', rarity: 'common', unlock: 0, desc: '+2 de daño en toda acción que haga daño.',
    modAction: (a) => { if (dmgAct(a)) a.dmg += 2; } },
  guantes: { name: 'Guanteletes', icon: '🧤', rarity: 'common', unlock: 0, desc: 'Las parejas hacen +4 de daño.',
    modAction: (a) => { if (a.type === 'pair') a.dmg += 4; } },
  amuleto: { name: 'Amuleto del Uno', icon: '🧿', rarity: 'common', unlock: 0, desc: 'Los Unos dan +3 de escudo por dado.',
    modAction: (a, f) => { if (a.type === 'ones') a.block += 3 * f.length; } },
  bolsa: { name: 'Bolsa encantada', icon: '👝', rarity: 'common', unlock: 0, desc: 'Cada Cinco que puntúes da 2 de oro.',
    modAction: (a) => { if (a.type === 'five') a.gold += 2; } },
  roble: { name: 'Escudo de roble', icon: '🪵', rarity: 'common', unlock: 0, desc: 'Empiezas cada combate con 8 de escudo.',
    onCombatStart: (c) => { c.block += 8; } },
  caliz: { name: 'Cáliz de peregrino', icon: '🍷', rarity: 'common', unlock: 0, desc: 'Curas 4 PV al empezar cada combate.',
    onCombatStart: (c, run) => { run.hp = Math.min(run.maxHp, run.hp + 4); } },
  calavera: { name: 'Calavera dorada', icon: '💀', rarity: 'common', unlock: 0, desc: '+12 de oro al ganar un combate.',
    onWin: (run) => { run.gold += 12; } },
  talisman: { name: 'Talismán vital', icon: '❤️', rarity: 'common', unlock: 0, desc: '+12 PV máximos.',
    onPickup: (run) => { run.maxHp += 12; run.hp += 12; } },
  yesca: { name: 'Yesca eterna', icon: '🕯️', rarity: 'common', unlock: 20, desc: 'Cada cara de Llama aplica +1 de quemadura extra.',
    modAction: (a, f) => { a.burn += f.filter((x) => x.m === 'fire').length; } },
  piedra: { name: 'Piedra de afilar', icon: '🪨', rarity: 'common', unlock: 20, desc: 'La primera acción de cada turno hace +5 de daño.',
    modAction: (a, f, c) => { if (c.banked.length === 0 && dmgAct(a)) a.dmg += 5; } },
  hueso: { name: 'Dado de hueso', icon: '🦴', rarity: 'rare', unlock: 0, desc: 'Ignora la primera pifia de cada combate.' },
  reloj: { name: 'Reloj de arena', icon: '⏳', rarity: 'rare', unlock: 0, desc: '+2 tiradas en el primer turno de cada combate.' },
  grimorio: { name: 'Grimorio', icon: '📖', rarity: 'rare', unlock: 0, desc: 'Las escaleras hacen +10 de daño.',
    modAction: (a) => { if (a.type.startsWith('straight')) a.dmg += 10; } },
  martillo: { name: 'Martillo rúnico', icon: '🔨', rarity: 'rare', unlock: 30, desc: 'Tríos, pókers y Leyendas vuelven vulnerable al enemigo (+50% de daño recibido) un turno.',
    modAction: (a) => { if (['trio', 'poker', 'legend'].includes(a.type)) a.vuln = Math.max(a.vuln, 1); } },
  trebol: { name: 'Trébol de cinco hojas', icon: '🍀', rarity: 'rare', unlock: 60, desc: 'Cada racha da +50% de furia en lugar de +25%.' },
  copa: { name: 'Copa vampírica', icon: '🩸', rarity: 'rare', unlock: 40, desc: 'Curas 1 PV por cada 8 de daño que infliges.' },
  espinas: { name: 'Cota de espinas', icon: '🌵', rarity: 'rare', unlock: 90, desc: 'Cuando un enemigo te golpea, recibe 3 de daño.' },
  balanza: { name: 'Balanza del destino', icon: '⚖️', rarity: 'rare', unlock: 150, desc: 'Los Full dan doble escudo.',
    modAction: (a) => { if (a.type === 'full') a.block *= 2; } },
  fenix: { name: 'Pluma de fénix', icon: '🪶', rarity: 'boss', unlock: 100, desc: 'La primera vez que mueras, revives con el 40% de PV.' },
  corona: { name: 'Corona del rey', icon: '👑', rarity: 'boss', unlock: 0, desc: '+1 tirada en cada turno.' },
  sexto: { name: 'Sexto dado', icon: '🎲', rarity: 'boss', unlock: 150, desc: 'Juegas con 6 dados.',
    onPickup: (run) => { run.dice.push({ id: run.dice.length, faces: [1, 2, 3, 4, 5, 6].map((v) => ({ v, m: null })) }); } },
  forja: { name: 'Corazón de forja', icon: '🔥', rarity: 'boss', unlock: 0, desc: 'Al ganar un combate, una cara al azar recibe una runa.' },
  egida: { name: 'Égida', icon: '🔰', rarity: 'boss', unlock: 200, desc: 'El escudo nunca se pierde entre turnos.' },
};

// ───────────── ENEMIGOS ─────────────
// Intenciones: atk v | multi v×n | block v | buff v (fuerza) | curse n (sella dados) | heal v | atkblock v/b
// Rasgos: armored N (reduce cada acción de daño), regen N, thorns N (daño al atacarle), enrage (+1 fuerza por turno)
const I = {
  atk: (v) => ({ t: 'atk', v }), multi: (v, n) => ({ t: 'multi', v, n }), block: (v) => ({ t: 'block', v }),
  buff: (v) => ({ t: 'buff', v }), curse: (n = 1) => ({ t: 'curse', v: n }), heal: (v) => ({ t: 'heal', v }),
  ab: (v, b) => ({ t: 'atkblock', v, b }),
};

export const ENEMIES = {
  // Acto 1
  rata: { name: 'Rata gigante', icon: '🐀', hp: [24, 28], intents: [I.atk(6), I.multi(2, 3)], random: true },
  goblin: { name: 'Goblin', icon: '👺', hp: [30, 34], intents: [I.atk(7), I.block(6), I.atk(10)] },
  limo: { name: 'Limo verde', icon: '🟢', hp: [36, 40], intents: [I.atk(5), I.buff(2), I.atk(7)] },
  esqueleto: { name: 'Esqueleto', icon: '💀', hp: [26, 28], intents: [I.atk(8), I.curse(1), I.atk(9)] },
  bandido: { name: 'Bandido', icon: '🥷', hp: [24, 28], intents: [I.multi(3, 2), I.atk(11), I.block(5)], random: true },
  ogro: { name: 'Ogro', icon: '👹', hp: [72, 78], elite: true, intents: [I.atk(13), I.block(10), I.atk(18)] },
  caballero: { name: 'Caballero negro', icon: '♞', hp: [58, 62], elite: true, traits: { armored: 2 }, intents: [I.atk(10), I.ab(8, 8), I.buff(3)] },
  reygoblin: { name: 'Rey Goblin', icon: '🤴', hp: [140, 140], boss: true, intents: [I.atk(10), I.multi(4, 3), I.block(14), I.buff(3), I.curse(1), I.atk(16)] },
  // Acto 2
  lobo: { name: 'Lobo huargo', icon: '🐺', hp: [42, 48], intents: [I.multi(4, 3), I.atk(13)], random: true },
  arana: { name: 'Araña de cripta', icon: '🕷️', hp: [38, 42], intents: [I.atk(9), I.curse(1), I.multi(3, 4)] },
  cultista: { name: 'Cultista', icon: '🧟', hp: [44, 50], intents: [I.buff(4), I.atk(9), I.atk(11)] },
  golem: { name: 'Gólem de piedra', icon: '🗿', hp: [55, 60], traits: { armored: 3 }, intents: [I.block(12), I.atk(16)] },
  bruja: { name: 'Bruja del pantano', icon: '🧙‍♀️', hp: [40, 44], intents: [I.curse(1), I.atk(12), I.heal(10)] },
  wyvern: { name: 'Wyvern', icon: '🦎', hp: [108, 115], elite: true, intents: [I.multi(6, 3), I.block(14), I.atk(22)] },
  espectro: { name: 'Caballero espectral', icon: '👻', hp: [95, 100], elite: true, traits: { regen: 5 }, intents: [I.atk(15), I.ab(10, 10), I.curse(2)] },
  nigromante: { name: 'Nigromante', icon: '🧙', hp: [200, 200], boss: true, traits: { thorns: 2 }, intents: [I.atk(14), I.curse(2), I.multi(5, 4), I.heal(15), I.buff(3), I.atk(20)] },
  // Acto 3
  demonio: { name: 'Demonio menor', icon: '😈', hp: [62, 68], intents: [I.atk(18), I.multi(6, 3)], random: true },
  gargola: { name: 'Gárgola', icon: '🦇', hp: [66, 72], traits: { armored: 4 }, intents: [I.block(20), I.atk(17), I.atk(19)] },
  hechicero: { name: 'Hechicero oscuro', icon: '🧛', hp: [58, 64], intents: [I.curse(2), I.atk(20), I.buff(3)] },
  troll: { name: 'Troll de las cavernas', icon: '🧌', hp: [75, 82], traits: { regen: 6 }, intents: [I.atk(17), I.ab(12, 12)] },
  hidra: { name: 'Hidra', icon: '🐍', hp: [170, 175], elite: true, traits: { regen: 8 }, intents: [I.multi(7, 3), I.atk(24), I.buff(3)] },
  quimera: { name: 'Quimera', icon: '🦁', hp: [150, 155], elite: true, traits: { enrage: true }, intents: [I.atk(22), I.curse(2), I.multi(8, 3)] },
  dragon: { name: 'Dragón ancestral', icon: '🐉', hp: [340, 340], boss: true, traits: { armored: 2 }, intents: [I.atk(20), I.multi(7, 4), I.block(30), I.buff(5), I.curse(2), I.atk(38)] },
};

export const ACT_POOLS = {
  1: { normal: ['rata', 'goblin', 'limo', 'esqueleto', 'bandido'], elite: ['ogro', 'caballero'], boss: 'reygoblin', name: 'Las Catacumbas' },
  2: { normal: ['lobo', 'arana', 'cultista', 'golem', 'bruja'], elite: ['wyvern', 'espectro'], boss: 'nigromante', name: 'El Bosque Maldito' },
  3: { normal: ['demonio', 'gargola', 'hechicero', 'troll'], elite: ['hidra', 'quimera'], boss: 'dragon', name: 'La Ciudadela Ardiente' },
};

// ───────────── EVENTOS ─────────────
// Cada opción tiene un id de efecto que resuelve run.js
export const EVENTS = {
  fuente: { title: 'Fuente misteriosa', icon: '⛲', text: 'Un agua plateada brota entre las piedras. Huele a magia… o a trampa.',
    options: [{ label: 'Beber (70%: +20 PV · 30%: −8 PV y una cara Sagrada)', fx: 'fuente' }, { label: 'Seguir adelante', fx: 'none' }] },
  herrero: { title: 'Herrero errante', icon: '⚒️', text: 'Un enano con un yunque a cuestas te ofrece sus servicios.',
    options: [{ label: 'Pagar 30 de oro: tallar un 6', fx: 'herrero', cost: 30 }, { label: 'Pagar 45 de oro: runa a elegir al azar', fx: 'herrero_runa', cost: 45 }, { label: 'Despedirse', fx: 'none' }] },
  altar: { title: 'Altar de sangre', icon: '🩸', text: 'Una voz susurra: «Sangre por poder».',
    options: [{ label: 'Ofrecer 12 PV: reliquia aleatoria', fx: 'altar' }, { label: 'Ignorarlo', fx: 'none' }] },
  apostador: { title: 'El apostador', icon: '🎰', text: 'Un tahúr agita un cubilete. «¿Doble o nada, viajero?»',
    options: [{ label: 'Apostar 25 de oro (50%: ganas 60)', fx: 'apuesta', cost: 25 }, { label: 'No jugar', fx: 'none' }] },
  cofre: { title: 'Cofre sospechoso', icon: '🧰', text: 'Un cofre solitario en mitad del pasillo. Demasiado fácil.',
    options: [{ label: 'Abrirlo (60%: 45 de oro · 40%: ¡mímico!)', fx: 'cofre' }, { label: 'Dejarlo', fx: 'none' }] },
  peregrino: { title: 'Peregrino herido', icon: '🧎', text: 'Un peregrino te pide ayuda para llegar al santuario.',
    options: [{ label: 'Darle 20 de oro (+8 PV máximos)', fx: 'peregrino', cost: 20 }, { label: 'Curarle con tu energía (−6 PV, cara Sagrada)', fx: 'peregrino2' }, { label: 'Ignorarle', fx: 'none' }] },
  dadomaldito: { title: 'El dado del bufón', icon: '🃏', text: 'Un bufón te ofrece un dado que cambia de cara al mirarlo.',
    options: [{ label: 'Aceptar (cara Comodín, −8 PV máximos)', fx: 'bufon' }, { label: 'Rechazar', fx: 'none' }] },
  biblioteca: { title: 'Biblioteca olvidada', icon: '📚', text: 'Tomos polvorientos sobre el arte de los dados.',
    options: [{ label: 'Estudiar (tallar un 5)', fx: 'biblio5' }, { label: 'Estudiar (tallar un 1)', fx: 'biblio1' }] },
};

export const RUNE_POOL = [['fire', 3], ['frost', 3], ['gold', 2], ['holy', 3], ['sharp', 3], ['wild', 1]];

// ───────────── MAESTRÍAS ─────────────
// Cada nivel suma este bono a la combinación (estilo «planetas» de Balatro). peso = frecuencia en botín.
export const MASTERY = {
  ones: { dmg: 0, block: 3, perDie: true, w: 2 },
  five: { dmg: 4, block: 0, w: 2 },
  pair: { dmg: 4, block: 0, w: 4 },
  trio: { dmg: 6, block: 0, w: 4 },
  bastion: { dmg: 0, block: 8, w: 1 },
  straight4: { dmg: 7, block: 0, w: 3 },
  straight5: { dmg: 10, block: 0, w: 2 },
  full: { dmg: 5, block: 5, w: 3 },
  poker: { dmg: 10, block: 0, w: 2 },
  legend: { dmg: 20, block: 0, w: 1 },
};
