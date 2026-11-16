# Dice&Legends — instrucciones para Claude

Roguelite de dados (híbrido Yahtzee + Farkle) para móvil, PWA, fantasía medieval.
El diseño vive en el Proyecto de Claude "Dice&Legends" (GDD.md, ROADMAP.md). Este repo solo contiene código.

## Reglas
- Responde en castellano de España.
- `src/core/`: lógica pura, sin DOM, determinista (rng inyectable). Todo cambio aquí lleva test en `tests/`.
- `src/ui/` y `src/main.js`: presentación. Nada de reglas de juego en la UI.
- Mobile-first, vertical, objetivos táctiles ≥ 44px.
- Sin frameworks ni dependencias nuevas sin justificarlo.
- Antes de dar algo por terminado: `npm test` y `npm run build` en verde.
- Commits pequeños en castellano: `feat(core): …`, `fix(ui): …`.
- Si una decisión cambia el diseño, avisa para actualizar el GDD del Proyecto.
