import { defineConfig } from 'vite';

// base = nombre del repo para GitHub Pages
export default defineConfig({
  base: '/dice-legends/',
  test: { environment: 'node' },
});
