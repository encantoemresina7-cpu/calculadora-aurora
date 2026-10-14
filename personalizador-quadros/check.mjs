import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { BUILTINS, KITS } from './catalog.mjs';
import { SCENES } from './scenes.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
for (const file of ['app.js', 'render.mjs', 'export.mjs','catalog.mjs','images.mjs','initial.mjs','scenes.mjs','test.mjs']) {
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
for(const art of [...BUILTINS,...SCENES])for(const file of [art.url,art.thumb].filter(Boolean)){
  if(!existsSync(path.join(root,file)))throw new Error('Arte ausente: '+file);
  const bytes=readFileSync(path.join(root,file));
  if(bytes.length<100)throw new Error('Arte vazia: '+file);
  if(file.endsWith('.webp')&&(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP'))throw new Error('WebP inválido: '+file);
}
if(new Set(BUILTINS.map(a=>a.id)).size!==BUILTINS.length)throw new Error('Arte duplicada');
for(const art of BUILTINS)for(const id of [art.kit,...(art.kits||[])])if(!KITS.some(k=>k.id===id))throw new Error('Tema desconhecido na arte: '+art.id);
for(const kit of KITS)if(kit.defaults.length!==3||kit.defaults.some(id=>!BUILTINS.some(a=>a.id===id)))throw new Error('Kit inválido: '+kit.id);
const tests=spawnSync(process.execPath,[path.join(root,'test.mjs')],{encoding:'utf8'});
if(tests.status!==0)throw new Error(tests.stderr||tests.stdout);
console.log(tests.stdout.trim());
console.log(BUILTINS.length+' artes verificadas em '+KITS.length+' categorias, com '+SCENES.length+' cenários.');
