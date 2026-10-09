import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
for (const file of ['app.js', 'render.mjs', 'export.mjs']) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || `Falha de sintaxe em ${file}`);
}
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
if (new Set(ids).size !== ids.length) throw new Error('IDs repetidos no HTML');
const app = readFileSync(path.join(root, 'app.js'), 'utf8');
for (const [, id] of app.matchAll(/\$\('([^']+)'\)/g)) {
  if (!ids.includes(id)) throw new Error(`Controle ausente: ${id}`);
}
for (const file of ['styles.css', 'assets/bailarina.png', 'assets/sereia.png', 'assets/cavalinho.png', 'assets/passarinho.png', 'assets/favicon.svg', 'assets/fonts/caligrafia.otf', 'assets/fonts/classica.otf', 'assets/fonts/delicada.otf', 'assets/fonts/moderna.otf', 'assets/fonts/moderna-bold.otf', 'assets/fonts/LICENSE.txt']) {
  if (!existsSync(path.join(root, file))) throw new Error(`Arquivo ausente: ${file}`);
}
console.log('Personalizador verificado: sintaxe, controles e arquivos estáticos.');
