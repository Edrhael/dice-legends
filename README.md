# Dice&Legends

Roguelite de dados para móvil: aparta combinaciones como en Yahtzee, arriesga como en Farkle y abre paso por tres actos de mazmorra.

**Jugar:** versión publicada como artefacto de Claude (`npm run build:single` genera `dist-single/index.html`). GitHub Pages queda listo en `.github/workflows/deploy.yml` (manual hasta activarlo).

## Desarrollo
```bash
npm install
npm run dev            # servidor local (--host: accesible desde el móvil en la misma red)
npm test               # tests del núcleo
npm run build
node scripts/sim.js 300 guerrero 0   # simula 300 runs con el bot: [runs] [clase] [ascensión]
```

## Estructura
- `src/core/` — reglas puras y deterministas (RNG con semilla serializable): `dice`, `combat`, `run`, `meta`, `data`, `bot`.
- `src/ui/`, `src/main.js` — presentación.
- `tests/` — Vitest. `scripts/sim.js` — simulación de balance.

Cada push a `main` ejecuta tests y build (workflow CI).
