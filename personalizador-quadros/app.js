import { DEFAULT_STATE, clamp, getDimensions, renderArt, renderScene, renderFlatPreview, renderKit } from './render.mjs?v=20261014-cenarios';
import { setPngDpi, zipFiles } from './export.mjs?v=20261014-cenarios';
import { KITS, BUILTINS, initialFromName } from './catalog.mjs?v=20261014-cenarios';
import { prepareImage } from './images.mjs?v=20261014-cenarios';
import { SCENES, sceneById } from './scenes.mjs?v=20261014-cenarios';

const $=id=>document.getElementById(id);
const KEY='atelie-quadros-v2',LEGACY='atelie-quadros-v1';
const COLORS=['#987180','#8d719d','#5f89ae','#73865c','#bc975d','#373139'];
const BACKGROUNDS=['#ffffff','#fff4cb','#e5effa','#eee4f8','#fde7ec','#e8f0df','#f5ead8'];
const canvas=$('previewCanvas'),ctx=canvas.getContext('2d');
let arts=[...BUILTINS],state,db=null,history=[],images=[],sceneImage=null,imageCache=new Map(),layouts=[],nameBoxes=[];
let revision=0,ready=false,exporting=false,paintRequest=0,saveTimer=0,toastTimer=0,drag=null;
const clone=x=>JSON.parse(JSON.stringify(x));
const current=()=>state.frames[state.selected];
const artById=id=>arts.find(a=>a.id===id);
const kitById=id=>KITS.find(k=>k.id===id)||KITS[0];
function design(id,kit){
  const art=artById(id)||BUILTINS[0];
  return {...DEFAULT_STATE,artId:art.id,name:'',showName:!!art.hasName,showInitial:!!art.monogram,
    monogram:!!art.monogram,embeddedName:!!art.embeddedName,removePaper:art.removePaper!==false,
    initialSize:76,initialX:.5,initialY:.40,initialFont:'Classica',initialColor:kit.color,initialPattern:kit.pattern,
    color:kit.color,imageScale:100,nameY:art.nameY||.895,namePlacement:art.namePlacement||'bottom',background:'#ffffff'};
}
function fresh(){
  const kit=KITS[0];
  return {version:2,kitId:kit.id,composition:'kit',selected:1,name:'',initialOverride:'',autoInitial:true,
    frame:'white',wallColor:'#f4eee8',sceneId:'claro',proof:true,mode:'scene',format:'a4',
    frames:kit.defaults.map(id=>design(id,kit)),drafts:{}};
}
function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,6000);}
function remember(){history.push(clone(state));if(history.length>40)history.shift();$('undoBtn').disabled=false;}
function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{toast('Os ajustes não puderam ser guardados. Baixe sua arte antes de sair.');}},350);}
function changed(){sync();requestPaint();save();}
function changeGlobal(patch){if(Object.keys(patch).every(k=>state[k]===patch[k]))return;remember();Object.assign(state,patch);changed();}
function changeDesign(patch,record=true){if(Object.keys(patch).every(k=>current()[k]===patch[k]))return;if(record)remember();Object.assign(current(),patch);changed();}
function renderState(index){
  return {...state.frames[index],name:state.name,initial:state.autoInitial?initialFromName(state.name):state.initialOverride,
    format:state.format,frame:state.frame,wallColor:state.wallColor,proof:state.proof};
}
function buttonsEnabled(){
  for(const id of ['downloadPreview','downloadArt','downloadKit','shareBtn'])$(id).disabled=!ready||exporting;
  $('downloadKit').hidden=state.composition!=='kit';
}
function renderGallery(){
  const filter=$('artFilter').value;
  const list=arts.filter(a=>filter==='all'||(filter==='custom'?a.custom:a.kit===filter||a.kits?.includes(filter)));
  $('gallery').replaceChildren();
  for(const art of list){
    const b=document.createElement('button');b.type='button';b.className='art-option';b.dataset.artId=art.id;
    b.setAttribute('aria-label','Escolher arte: '+art.title);
    const t=document.createElement('span');t.className='thumbnail';
    const im=document.createElement('img');im.src=art.thumb||art.url;im.alt='';im.loading='lazy';t.append(im);
    const label=document.createElement('span');label.className='art-title';label.textContent=art.title;b.append(t,label);
    if(art.monogram){const tag=document.createElement('small');tag.className='editable-tag';tag.textContent='Inicial editável';b.append(tag);}
    b.addEventListener('click',()=>selectArt(art.id));$('gallery').append(b);
  }
  $('artCount').textContent=list.length+' artes';
  $('emptyGallery').hidden=list.length>0;
  sync();
}
function sync(){
  if(!state)return;
  const d=current();
  $('undoBtn').disabled=history.length===0;
  const fields={nameInput:state.name,initialInput:state.autoInitial?initialFromName(state.name):state.initialOverride,
    kitSelect:state.kitId,sceneSelect:state.sceneId,fontSelect:d.font,colorInput:d.color,sizeRange:d.size,formatSelect:state.format,
    imageScale:d.imageScale,imageY:d.imageY,frameSelect:state.frame,backgroundInput:d.background,
    wallInput:state.wallColor,subtitleInput:d.subtitle,initialColor:d.initialColor,initialSize:d.initialSize,
    initialFont:d.initialFont,initialPattern:d.initialPattern,initialX:Math.round(d.initialX*100),initialY:Math.round(d.initialY*100)};
  for(const[id,value]of Object.entries(fields))if($(id).value!==String(value))$(id).value=value;
  $('autoInitial').checked=state.autoInitial;$('initialInput').disabled=state.autoInitial;
  for(const[id,key]of Object.entries({showName:'showName',showInitial:'showInitial',removePaperCheck:'removePaper',borderCheck:'border'}))$(id).checked=!!d[key];
  $('proofCheck').checked=state.proof;
  $('sceneControls').hidden=state.mode!=='scene';$('wallField').hidden=state.sceneId!=='wall';
  $('initialOptions').hidden=!d.showInitial;$('nameCount').textContent=state.name.length+'/50';
  $('sizeOutput').value=d.size+'%';$('imageScaleOutput').value=d.imageScale+'%';
  $('imageYOutput').value=d.imageY===0?'Centro':d.imageY+'%';$('initialSizeOutput').value=d.initialSize+'%';
  $('colorHex').textContent=d.color.toUpperCase();$('backgroundHex').textContent=d.background.toUpperCase();
  $('currentNameLabel').textContent=state.name||'Digite o nome';$('currentArtLabel').textContent=artById(d.artId)?.title||'Sua arte';
  $('removeArtBtn').hidden=!artById(d.artId)?.custom;
  $('formatBadge').textContent=getDimensions(state.format,images[state.selected]).label;
  $('editorTarget').textContent=state.composition==='kit'?'Editando o quadro '+(state.selected+1):'Arte individual';
  $('slotControls').hidden=state.composition!=='kit';
  $('downloadArt').textContent=state.composition==='kit'?'Baixar este quadro em alta ↗':'Baixar arte em alta ↗';
  $('compositionKit').classList.toggle('active',state.composition==='kit');$('compositionSingle').classList.toggle('active',state.composition==='single');
  for(const id of ['compositionKit','compositionSingle'])$(id).setAttribute('aria-pressed',String($(id).classList.contains('active')));
  for(let i=0;i<3;i++){
    const b=$('slot'+i);b.classList.toggle('active',state.selected===i);b.setAttribute('aria-pressed',String(state.selected===i));
    b.querySelector('small').textContent=artById(state.frames[i].artId)?.title||'Sua imagem';
  }
  for(const[id,mode]of [['sceneMode','scene'],['artMode','art']]){$(id).classList.toggle('active',state.mode===mode);$(id).setAttribute('aria-pressed',String(state.mode===mode));}
  document.querySelectorAll('.art-option').forEach(b=>{b.classList.toggle('active',b.dataset.artId===d.artId);b.setAttribute('aria-pressed',String(b.dataset.artId===d.artId));});
  document.querySelectorAll('[data-position]').forEach(b=>b.classList.toggle('active',b.dataset.position===d.namePlacement));
  document.querySelectorAll('[data-color]').forEach(b=>b.classList.toggle('active',b.dataset.color===d.color));
  document.querySelectorAll('[data-bg]').forEach(b=>b.classList.toggle('active',b.dataset.bg===d.background));
  const dim=getDimensions(state.format,images[state.selected]);
  $('exportInfo').textContent='Arte: '+dim.width+' × '+dim.height+' px'+(state.format!=='original'?' · 300 dpi':'')+' · Kit: 3 arquivos separados em ZIP';
  buttonsEnabled();
}
function requestPaint(){if(paintRequest)return;paintRequest=requestAnimationFrame(()=>{paintRequest=0;paint();});}
function createArt(i,width){
  const d=renderState(i),dim=getDimensions(state.format,images[i]),c=document.createElement('canvas');
  c.width=width||dim.width;c.height=Math.round(c.width*dim.height/dim.width);
  const bounds=renderArt(c.getContext('2d'),c.width,c.height,d,images[i]);return{canvas:c,bounds};
}
function paint(){
  if(!ready)return;
  const rendered=state.frames.map((_,i)=>createArt(i,720));nameBoxes=rendered.map(r=>r.bounds);
  if(state.composition==='kit')layouts=renderKit(ctx,canvas.width,canvas.height,state,rendered.map(r=>r.canvas),state.mode==='art',sceneImage);
  else{const r=rendered[state.selected].canvas;layouts=[];layouts[state.selected]=state.mode==='scene'?renderScene(ctx,canvas.width,canvas.height,state,r,sceneImage):renderFlatPreview(ctx,canvas.width,canvas.height,r);}
  if(state.composition==='kit'){
    const l=layouts[state.selected];ctx.save();ctx.strokeStyle='#7a546b';ctx.setLineDash([7,8]);ctx.lineWidth=2;ctx.strokeRect(l.x-l.border-7,l.y-l.border-7,l.width+l.border*2+14,l.height+l.border*2+14);ctx.restore();
  }
  $('canvasLoading').hidden=true;
}
function decode(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Imagem indisponível'));im.src=url;});}
async function refreshImages(){
  ready=false;buttonsEnabled();$('canvasLoading').hidden=false;const ticket=++revision;
  try{
    const background=sceneById(state.sceneId);
    const sceneKey='scene:'+background.id;
    if(background.url&&!imageCache.has(sceneKey))imageCache.set(sceneKey,decode(background.url).catch(e=>{imageCache.delete(sceneKey);throw e;}));
    const [loaded,room]=await Promise.all([Promise.all(state.frames.map(async f=>{
      const a=artById(f.artId);if(!a)throw new Error('Arte não encontrada');
      const key=a.id+':'+f.removePaper;
      if(!imageCache.has(key))imageCache.set(key,decode(a.url).then(im=>prepareImage(im,f.removePaper,a)));
      try{return await imageCache.get(key);}catch(e){imageCache.delete(key);throw e;}
    })),background.url?imageCache.get(sceneKey):null]);
    if(ticket!==revision)return;images=loaded;sceneImage=room;ready=true;sync();paint();save();
  }catch{if(ticket!==revision)return;$('canvasLoading').hidden=true;toast('Uma imagem não carregou. Escolha outra arte ou cenário, ou toque em recarregar as artes.');}
  buttonsEnabled();
}
function selectArt(id){
  const a=artById(id);if(!a)return;remember();
  const old=current(),next=design(id,kitById(state.kitId));
  Object.assign(next,{background:old.background,color:old.color,font:old.font});
  state.frames[state.selected]=next;changed();refreshImages();
}
function switchKit(id){
  if(state.kitId===id)return;
  remember();state.drafts[state.kitId]=clone(state.frames);const kit=kitById(id);state.kitId=kit.id;
  state.frames=state.drafts[kit.id]?.length===3?clone(state.drafts[kit.id]):kit.defaults.map(a=>design(a,kit));
  if(kit.single)state.composition='single';else state.composition='kit';
  state.selected=1;$('artFilter').value=kit.id;renderGallery();changed();refreshImages();
}
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('atelie-quadros-imagens',1);r.onupgradeneeded=()=>r.result.createObjectStore('arts',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function dbOperation(mode,operation){return new Promise((resolve,reject)=>{if(!db)return reject(new Error('Sem armazenamento'));const tx=db.transaction('arts',mode),r=operation(tx.objectStore('arts'));let result;r.onsuccess=()=>result=r.result;r.onerror=()=>reject(r.error);tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
async function importFiles(files){
  let imported=0,last,notSaved=false;
  for(const file of Array.from(files).slice(0,24)){
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>15*1024*1024){toast('Use PNG, JPG ou WEBP de até 15 MB.');continue;}
    const url=URL.createObjectURL(file);
    try{
      const im=await decode(url);if(im.width*im.height>65000000)throw new Error('Grande demais');
      const item={id:'custom-'+crypto.randomUUID(),title:file.name.replace(/\.[^.]+$/,'').slice(0,50),blob:file};
      try{await dbOperation('readwrite',s=>s.put(item));}catch{notSaved=true;}
      arts.push({...item,url,custom:true,kit:'custom',hasName:true,removePaper:false});last=item.id;imported++;
    }catch{URL.revokeObjectURL(url);toast('Não foi possível abrir '+file.name);}
  }
  $('uploadInput').value='';
  if(imported){$('artFilter').value='custom';renderGallery();selectArt(last);toast(imported+' imagem(ns) adicionada(s).'+(notSaved?' Baixe a arte antes de sair: não foi possível salvá-las neste navegador.':' Salvas neste aparelho.'));}
}
function canvasBlob(c,type='image/png',quality){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Falha na exportação')),type,quality));}
const safeName=text=>String(text||'sem-nome').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase();
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function printFile(i){
  const dim=getDimensions(state.format,images[i]),r=createArt(i,dim.width);
  const blob=await canvasBlob(r.canvas);return state.format==='original'?blob:setPngDpi(blob,300);
}
async function exportImage(kind,share=false){
  if(!ready||exporting)return;
  exporting=true;buttonsEnabled();const rev=revision;
  // Freeze editor controls while generating so every file uses the same customer.
  document.querySelectorAll('main button,main input,main select').forEach(el=>el.disabled=true);
  toast('Preparando '+(kind==='kit'?'os três quadros…':'sua imagem…'));
  try{
    await document.fonts.ready;let blob,filename;
    if(kind==='kit'){
      const files=[];
      for(let i=0;i<3;i++)files.push({name:'quadro-'+(i+1)+'-'+safeName(state.name)+'.png',blob:await printFile(i)});
      blob=await zipFiles(files);filename='kit-'+state.kitId+'-'+safeName(state.name)+'.zip';
    }else if(kind==='art'){blob=await printFile(state.selected);filename='arte-'+safeName(state.name)+'-quadro-'+(state.selected+1)+'.png';}
    else{
      const c=document.createElement('canvas');c.width=1600;c.height=1600;
      const list=state.frames.map((_,i)=>createArt(i,1000).canvas);
      if(state.composition==='kit')renderKit(c.getContext('2d'),1600,1600,state,list,false,sceneImage);
      else renderScene(c.getContext('2d'),1600,1600,state,list[state.selected],sceneImage);
      blob=await canvasBlob(c,'image/jpeg',.95);filename='previa-'+safeName(state.name)+'.jpg';
    }
    if(rev!==revision)throw new Error('A arte mudou');
    const file=new File([blob],filename,{type:blob.type});
    if(share&&navigator.share&&navigator.canShare?.({files:[file]})){
      try{await navigator.share({files:[file],title:'Prévia do quadro'});}
      catch(e){if(e.name!=='AbortError'){download(blob,filename);toast('Imagem baixada. Anexe no WhatsApp para enviar.');}}
    }else{download(blob,filename);toast(kind==='kit'?'Kit pronto! O ZIP contém três artes separadas para impressão.':'Arquivo pronto para baixar.');}
  }catch{toast('Não foi possível gerar o arquivo. Tente novamente.');}
  finally{
    exporting=false;document.querySelectorAll('main button,main input,main select').forEach(el=>el.disabled=false);sync();
  }
}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};}
canvas.addEventListener('pointerdown',e=>{
  if(!ready||exporting||e.button>0)return;const p=point(e);
  const index=layouts.findIndex(l=>l&&p.x>=l.x-l.border&&p.x<=l.x+l.width+l.border&&p.y>=l.y-l.border&&p.y<=l.y+l.height+l.border);
  if(index<0)return;if(index!==state.selected){state.selected=index;sync();requestPaint();save();}
  if(!current().showName||!state.name)return;
  const l=layouts[index],b=nameBoxes[index],artH=720*getDimensions(state.format,images[index]).height/getDimensions(state.format,images[index]).width;
  const nx=l.x+b.x/720*l.width,ny=l.y+b.y/artH*l.height;
  if(Math.abs(p.x-nx)>b.width/720*l.width/2+25||Math.abs(p.y-ny)>b.height/artH*l.height/2+25)return;
  e.preventDefault();remember();drag={id:e.pointerId,dx:p.x-nx,dy:p.y-ny};canvas.setPointerCapture(e.pointerId);canvas.classList.add('is-dragging');
});
canvas.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;e.preventDefault();const p=point(e),l=layouts[state.selected];
  current().nameX=clamp((p.x-drag.dx-l.x)/l.width,.02,.98);current().nameY=clamp((p.y-drag.dy-l.y)/l.height,.03,.97);requestPaint();
});
for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,e=>{if(!drag||drag.id!==e.pointerId)return;drag=null;canvas.classList.remove('is-dragging');save();});
canvas.addEventListener('keydown',e=>{const v={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(v){e.preventDefault();changeDesign({nameX:clamp(current().nameX+v[0]*.01,.02,.98),nameY:clamp(current().nameY+v[1]*.01,.03,.97)});}});
$('kitSelect').addEventListener('change',e=>switchKit(e.target.value));
$('sceneSelect').addEventListener('change',e=>{changeGlobal({sceneId:e.target.value});refreshImages();});
$('artFilter').addEventListener('change',renderGallery);
$('compositionSingle').addEventListener('click',()=>changeGlobal({composition:'single'}));
$('compositionKit').addEventListener('click',()=>changeGlobal({composition:'kit'}));
for(let i=0;i<3;i++)$('slot'+i).addEventListener('click',()=>{state.selected=i;changed();});
$('nameInput').addEventListener('input',e=>changeGlobal({name:e.target.value}));
$('initialInput').addEventListener('input',e=>changeGlobal({initialOverride:Array.from(e.target.value.normalize('NFC'))[0]?.toLocaleUpperCase('pt-BR')||''}));
$('autoInitial').addEventListener('change',e=>changeGlobal({autoInitial:e.target.checked,initialOverride:e.target.checked?'':initialFromName(state.name)}));
for(const[id,key]of Object.entries({fontSelect:'font',colorInput:'color',backgroundInput:'background',subtitleInput:'subtitle',initialColor:'initialColor',initialFont:'initialFont',initialPattern:'initialPattern'})){
  $(id).addEventListener(id.endsWith('Select')||id==='initialFont'||id==='initialPattern'?'change':'input',e=>changeDesign({[key]:e.target.value}));
}
for(const[id,key]of Object.entries({formatSelect:'format',frameSelect:'frame',wallInput:'wallColor'}))$(id).addEventListener(id==='wallInput'?'input':'change',e=>changeGlobal({[key]:e.target.value}));
for(const[id,key]of Object.entries({showName:'showName',showInitial:'showInitial',borderCheck:'border'}))$(id).addEventListener('change',e=>changeDesign({[key]:e.target.checked}));
$('proofCheck').addEventListener('change',e=>changeGlobal({proof:e.target.checked}));
$('removePaperCheck').addEventListener('change',e=>{changeDesign({removePaper:e.target.checked});refreshImages();});
for(const[id,key]of Object.entries({sizeRange:'size',imageScale:'imageScale',imageY:'imageY',initialSize:'initialSize',initialX:'initialX',initialY:'initialY'})){
  $(id).addEventListener('pointerdown',remember);$(id).addEventListener('keydown',remember);
  $(id).addEventListener('input',e=>changeDesign({[key]:Number(e.target.value)/(id==='initialX'||id==='initialY'?100:1)},false));
}
$('applyBackgroundKit').addEventListener('click',()=>{remember();const bg=current().background;state.frames.forEach(f=>f.background=bg);changed();toast('Fundo aplicado aos três quadros.');});
document.querySelectorAll('[data-position]').forEach(b=>b.addEventListener('click',()=>changeDesign({namePlacement:b.dataset.position,nameX:.5,nameY:b.dataset.position==='top'?.115:.895})));
$('centerBtn').addEventListener('click',()=>changeDesign({nameX:.5}));
$('sceneMode').addEventListener('click',()=>changeGlobal({mode:'scene'}));$('artMode').addEventListener('click',()=>changeGlobal({mode:'art'}));
$('downloadPreview').addEventListener('click',()=>exportImage('preview'));$('downloadArt').addEventListener('click',()=>exportImage('art'));$('downloadKit').addEventListener('click',()=>exportImage('kit'));$('shareBtn').addEventListener('click',()=>exportImage('preview',true));
$('retryBtn').addEventListener('click',refreshImages);
$('uploadInput').addEventListener('change',e=>importFiles(e.target.files));
for(const type of ['dragenter','dragover'])$('uploadZone').addEventListener(type,e=>{e.preventDefault();$('uploadZone').classList.add('drag-over');});
$('uploadZone').addEventListener('dragleave',()=>$('uploadZone').classList.remove('drag-over'));
$('uploadZone').addEventListener('drop',e=>{e.preventDefault();$('uploadZone').classList.remove('drag-over');importFiles(e.dataTransfer.files);});
$('resetBtn').addEventListener('click',()=>{remember();state.name='';state.initialOverride='';state.autoInitial=true;changed();toast('Pronto para o próximo cliente. O kit e as cores foram mantidos.');});
$('undoBtn').addEventListener('click',()=>{if(!history.length)return;state=history.pop();$('undoBtn').disabled=!history.length;$('artFilter').value=state.kitId;renderGallery();changed();refreshImages();});
$('removeArtBtn').addEventListener('click',async()=>{
  const a=artById(current().artId);if(!a?.custom)return;
  try{if(db)await dbOperation('readwrite',s=>s.delete(a.id));}catch{toast('Não foi possível remover a imagem.');return;}
  remember();const fallback=kitById(state.kitId).defaults[0];
  state.frames=state.frames.map(f=>f.artId===a.id?design(fallback,kitById(state.kitId)):f);
  for(const key of Object.keys(state.drafts))state.drafts[key]=state.drafts[key].map(f=>f.artId===a.id?design(fallback,kitById(key)):f);
  arts=arts.filter(x=>x.id!==a.id);URL.revokeObjectURL(a.url);renderGallery();changed();refreshImages();
});
$('helpBtn').addEventListener('click',()=>$('helpDialog').showModal());
for(const id of ['closeHelp','startBtn'])$(id).addEventListener('click',()=>$('helpDialog').close());
$('goToEditor').addEventListener('click',()=>{$('namePanel').scrollIntoView({behavior:'smooth',block:'start'});$('nameInput').focus({preventScroll:true});});
$('goToKits').addEventListener('click',()=>$('artPanel').scrollIntoView({behavior:'smooth',block:'start'}));
for(const color of COLORS){const b=document.createElement('button');b.type='button';b.className='swatch';b.style.backgroundColor=color;b.dataset.color=color;b.setAttribute('aria-label','Cor do nome '+color);b.addEventListener('click',()=>changeDesign({color}));$('nameSwatches').append(b);}
for(const color of BACKGROUNDS){const b=document.createElement('button');b.type='button';b.className='swatch';b.style.backgroundColor=color;b.dataset.bg=color;b.setAttribute('aria-label','Fundo '+color);b.addEventListener('click',()=>changeDesign({background:color}));$('backgroundSwatches').append(b);}
function sanitize(saved){
  const base=fresh();if(!saved||typeof saved!=='object')return base;
  const validColor=x=>typeof x==='string'&&/^#[0-9a-f]{6}$/i.test(x);
  if(KITS.some(k=>k.id===saved.kitId))base.kitId=saved.kitId;
  const kit=kitById(base.kitId);base.frames=kit.defaults.map(a=>design(a,kit));
  for(const key of ['name','initialOverride'])if(typeof saved[key]==='string')base[key]=saved[key].slice(0,key==='name'?50:2);
  if(typeof saved.autoInitial==='boolean')base.autoInitial=saved.autoInitial;
  if(['kit','single'].includes(saved.composition))base.composition=saved.composition;
  if(['scene','art'].includes(saved.mode))base.mode=saved.mode;
  if(SCENES.some(scene=>scene.id===saved.sceneId))base.sceneId=saved.sceneId;
  if(['a4','24x33','square','original'].includes(saved.format))base.format=saved.format;
  if(['white','wood','pink','black','none'].includes(saved.frame))base.frame=saved.frame;
  if(validColor(saved.wallColor))base.wallColor=saved.wallColor;
  if(typeof saved.proof==='boolean')base.proof=saved.proof;
  base.selected=Number.isInteger(saved.selected)?clamp(saved.selected,0,2):1;
  const cleanFrame=(f,i)=>{
    const a=artById(f?.artId);if(!a)return design(kit.defaults[i],kit);
    const d=design(a.id,kit);
    for(const key of ['color','background','initialColor'])if(validColor(f[key]))d[key]=f[key];
    for(const key of ['showName','showInitial','removePaper','border'])if(typeof f[key]==='boolean')d[key]=f[key];
    for(const[key,min,max]of [['size',4,24],['imageScale',35,140],['imageY',-25,25],['nameX',.02,.98],['nameY',.03,.97],['initialSize',25,110],['initialX',.15,.85],['initialY',.15,.70]])if(Number.isFinite(f[key]))d[key]=clamp(f[key],min,max);
    if(['Caligrafia','Delicada','Classica','Moderna'].includes(f.font))d.font=f.font;
    if(['Classica','Moderna'].includes(f.initialFont))d.initialFont=f.initialFont;
    if(['watercolor','solid','stars','stripes','spots'].includes(f.initialPattern))d.initialPattern=f.initialPattern;
    if(['top','bottom'].includes(f.namePlacement))d.namePlacement=f.namePlacement;
    if(typeof f.subtitle==='string')d.subtitle=f.subtitle.slice(0,100);
    return d;
  };
  if(Array.isArray(saved.frames)&&saved.frames.length===3)base.frames=saved.frames.map(cleanFrame);
  if(saved.drafts&&typeof saved.drafts==='object')for(const k of KITS)if(Array.isArray(saved.drafts[k.id])&&saved.drafts[k.id].length===3)base.drafts[k.id]=saved.drafts[k.id].map(cleanFrame);
  return base;
}
async function init(){
  state=fresh();
  for(const scene of SCENES)$('sceneSelect').add(new Option(scene.title,scene.id));
  for(const kit of KITS){const o=new Option(kit.icon+' '+kit.title,kit.id);$('kitSelect').add(o);$('artFilter').add(new Option(kit.title,kit.id));}
  $('artFilter').add(new Option('Minhas imagens','custom'));
  try{db=await openDB();const saved=await dbOperation('readonly',s=>s.getAll());arts.push(...saved.filter(a=>a.blob instanceof Blob).map(a=>({...a,url:URL.createObjectURL(a.blob),custom:true,kit:'custom',hasName:true,removePaper:false})));}catch{db=null;}
  try{
    const saved=JSON.parse(localStorage.getItem(KEY)||'null');
    if(saved)state=sanitize(saved);
    else{const old=JSON.parse(localStorage.getItem(LEGACY)||'null');if(old){state.name=typeof old.name==='string'?old.name.slice(0,50):'';if(artById(old.artId)){state.composition='single';state.kitId=artById(old.artId).kit||'classicos';state.frames=kitById(state.kitId).defaults.map(a=>design(a,kitById(state.kitId)));state.frames[1]={...design(old.artId,kitById(state.kitId)),...old};}}}
  }catch{}
  $('artFilter').value=state.kitId;renderGallery();sync();
  await Promise.all(['Caligrafia','Delicada','Classica','Moderna'].map(f=>document.fonts.load('100px "'+f+'"'))).catch(()=>toast('Uma fonte não carregou. Atualize a página.'));
  await refreshImages();
}
init();
