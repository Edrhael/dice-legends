// Genera dist-single/index.html autocontenido (JS y CSS en línea) a partir de dist/.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

let html = readFileSync('dist/index.html', 'utf8');
html = html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/, (_, src) => {
  const code = readFileSync(join('dist', src.replace(/^\/dice-legends\//, '')), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${code}</script>`;
});
html = html.replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/, (_, href) =>
  `<style>${readFileSync(join('dist', href.replace(/^\/dice-legends\//, '')), 'utf8')}</style>`);
html = html.replace(/\s*<link rel="(manifest|icon|apple-touch-icon)"[^>]*>/g, '');
mkdirSync('dist-single', { recursive: true });
writeFileSync('dist-single/index.html', html);
console.log('dist-single/index.html', (html.length / 1024).toFixed(1), 'KB');
