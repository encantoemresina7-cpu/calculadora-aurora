import assert from 'node:assert/strict';
import { initialFromName, BUILTINS } from './catalog.mjs';
import { paperMask } from './images.mjs';
import { setPngDpi, zipFiles } from './export.mjs';
assert.equal(initialFromName('  Érica '),'É');
assert.equal(initialFromName('Álvaro'),'Á');
assert.equal(initialFromName(''),'');
assert.equal(BUILTINS.filter(a=>a.monogram).length,4);
// A white interior behind a dark contour must survive paper removal.
const pixels=new Uint8ClampedArray(9*9*4).fill(255);
for(let y=2;y<=6;y++)for(let x=2;x<=6;x++)if(x===2||x===6||y===2||y===6){const i=(y*9+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=30;}
const mask=paperMask(pixels,9,9);
assert.equal(mask[0],1);assert.equal(mask[4*9+4],0);assert.equal(mask[2*9+2],0);
assert.equal(paperMask(pixels,9,9,[[.5,.5]])[4*9+4],1);
const png=new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')],{type:'image/png'});
const tagged=await setPngDpi(await setPngDpi(png,96),300),bytes=new Uint8Array(await tagged.arrayBuffer());
let offset=8,physical=0;
while(offset+12<=bytes.length){const v=new DataView(bytes.buffer,offset),length=v.getUint32(0);if(new TextDecoder().decode(bytes.slice(offset+4,offset+8))==='pHYs'){physical++;assert.equal(v.getUint32(8),11811);assert.equal(v.getUint32(12),11811);}offset+=length+12;}
assert.equal(physical,1);assert.equal(offset,bytes.length);
const zip=await zipFiles([{name:'quadro-1-Érica.png',blob:tagged},{name:'quadro-2.png',blob:tagged},{name:'quadro-3.png',blob:tagged}]);
const z=new Uint8Array(await zip.arrayBuffer()),view=new DataView(z.buffer);
assert.equal(view.getUint32(0,true),0x04034b50);
const end=z.length-22;assert.equal(view.getUint32(end,true),0x06054b50);assert.equal(view.getUint16(end+10,true),3);
let cursor=view.getUint32(end+16,true);const names=[];
for(let i=0;i<3;i++){assert.equal(view.getUint32(cursor,true),0x02014b50);const length=view.getUint16(cursor+28,true);names.push(new TextDecoder().decode(z.slice(cursor+46,cursor+46+length)));cursor+=46+length;}
assert.deepEqual(names,['quadro-1-Érica.png','quadro-2.png','quadro-3.png']);
console.log('Testes: iniciais acentuadas, papel e brancos internos, PNG 300 dpi e kit ZIP com 3 arquivos.');
