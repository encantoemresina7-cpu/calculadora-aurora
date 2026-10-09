import { DEFAULT_STATE, FORMATS, clamp, getDimensions, renderArt, renderScene, renderFlatPreview } from './render.mjs';
import { setPngDpi } from './export.mjs';

const $ = id => document.getElementById(id);
const BUILTINS = [
  { id: 'bailarina', title: 'Bailarina', url: 'assets/bailarina.png' },
  { id: 'sereia', title: 'Sereia', url: 'assets/sereia.png' },
  { id: 'passarinho', title: 'Passarinho', url: 'assets/passarinho.png' },
  { id: 'cavalinho', title: 'Cavalinho', url: 'assets/cavalinho.png' },
];
const COLORS = ['#987180', '#8d719d', '#7c9bb4', '#91a18a', '#bc975d', '#373139'];
const STATE_KEY = 'atelie-quadros-v1';
const canvas = $('previewCanvas');
const ctx = canvas.getContext('2d');
const artCanvas = document.createElement('canvas');
const artContext = artCanvas.getContext('2d');
let state = { ...DEFAULT_STATE };
let arts = [...BUILTINS], activeImage = null, activeArtId = null, imageReady = false, db = null;
let history = [], imageCache = new Map(), selectionRevision = 0;
let layout = null, nameBounds = null, drag = null, paintRequest = 0, saveTimer = 0;
let toastTimer = 0, storageAvailable = true, exporting = false;

function toast(message) {
  clearTimeout(toastTimer);$('toast').textContent = message;$('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 6500);
}

function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); }
    catch { if (storageAvailable) toast('Não foi possível guardar os ajustes neste navegador. Você ainda pode baixar a imagem.');storageAvailable = false; }
  }, 300);
}

function remember() {
  const serialized = JSON.stringify(state);
  if (history.length && JSON.stringify(history[history.length - 1]) === serialized) return;
  history.push({ ...state });if (history.length > 50) history.shift();$('undoBtn').disabled = false;
}

function change(patch, record = true) {
  if (Object.entries(patch).every(([key,value]) => state[key] === value)) return;
  if (record) remember();state = { ...state, ...patch };syncControls();requestPaint();saveState();
}

function setExportEnabled() {
  ['downloadPreview','downloadArt','shareBtn'].forEach(id => { $(id).disabled = !imageReady || exporting; });
}

function renderGallery() {
  $('gallery').replaceChildren();
  for (const art of arts) {
    const button = document.createElement('button');button.type = 'button';
    button.className = 'art-option' + (art.id === state.artId ? ' active' : '');
    button.setAttribute('aria-label', 'Escolher arte: ' + art.title);
    button.setAttribute('aria-pressed', String(art.id === state.artId));button.dataset.artId = art.id;
    const thumb = document.createElement('span');thumb.className = 'thumbnail';
    const image = document.createElement('img');image.src = art.url;image.alt = '';image.loading = 'lazy';
    thumb.append(image);const text = document.createElement('span');text.className = 'art-title';text.textContent = art.title;
    button.append(thumb,text);button.addEventListener('click', () => selectArt(art.id));$('gallery').append(button);
  }
  $('artCount').textContent = arts.length + (arts.length === 1 ? ' modelo' : ' modelos');
}

function syncControls() {
  const fields = {nameInput:'name',subtitleInput:'subtitle',fontSelect:'font',colorInput:'color',sizeRange:'size',formatSelect:'format',imageScale:'imageScale',imageY:'imageY',frameSelect:'frame',backgroundInput:'background'};
  for (const [id,key] of Object.entries(fields)) if ($(id).value !== String(state[key])) $(id).value = state[key];
  $('borderCheck').checked = state.border;$('proofCheck').checked = state.proof;
  $('nameCount').textContent = state.name.length + '/50';$('sizeOutput').value = state.size + '%';
  $('imageScaleOutput').value = state.imageScale + '%';$('imageYOutput').value = state.imageY === 0 ? 'Centro' : (state.imageY > 0 ? '+' : '') + state.imageY + '%';
  $('colorHex').textContent = state.color.toUpperCase();$('backgroundHex').textContent = state.background.toUpperCase();
  $('currentNameLabel').textContent = state.name.trim() || 'Sem nome';
  const art = arts.find(a => a.id === state.artId);$('currentArtLabel').textContent = art?.title || 'Sua imagem';
  $('removeArtBtn').hidden = !art?.custom;
  document.querySelectorAll('[data-position]').forEach(b => { b.classList.toggle('active', b.dataset.position === state.namePlacement); });
  document.querySelectorAll('.swatch').forEach(b => { b.classList.toggle('active', b.dataset.color === state.color);b.setAttribute('aria-pressed',String(b.dataset.color === state.color)); });
  for (const [id,mode] of [['sceneMode','scene'],['artMode','art']]) { $(id).classList.toggle('active',state.mode === mode);$(id).setAttribute('aria-pressed',String(state.mode === mode)); }
  document.querySelectorAll('.art-option').forEach(b => { b.classList.toggle('active', b.dataset.artId === state.artId);b.setAttribute('aria-pressed',String(b.dataset.artId === state.artId)); });
  const dimensions = getDimensions(state.format,activeImage);$('formatBadge').textContent = dimensions.label;
  $('exportInfo').textContent = 'Prévia JPG · 1600 × 1600 px / Arte PNG · ' + dimensions.width + ' × ' + dimensions.height + ' px' + (state.format !== 'original' ? ' · 300 dpi' : '');
}

function requestPaint() {
  if (paintRequest) return;
  paintRequest = requestAnimationFrame(() => { paintRequest = 0;paint(); });
}

function paint() {
  if (!imageReady || !activeImage) return;
  const dimensions = getDimensions(state.format,activeImage), ratio = dimensions.width / dimensions.height;
  artCanvas.width = Math.max(1,Math.round(Math.min(1000,2000*ratio)));
  artCanvas.height = Math.max(1,Math.round(artCanvas.width/ratio));
  nameBounds = renderArt(artContext,artCanvas.width,artCanvas.height,state,activeImage);
  layout = state.mode === 'scene' ? renderScene(ctx,canvas.width,canvas.height,state,artCanvas) : renderFlatPreview(ctx,canvas.width,canvas.height,artCanvas);
  $('canvasLoading').hidden = true;
}

async function decodeImage(url) {
  const image = new Image();image.decoding = 'async';
  const promise = new Promise((resolve,reject) => { image.onload = () => resolve(image);image.onerror = () => reject(new Error('Imagem inválida')); });
  image.src = url;return promise;
}

async function selectArt(id, record = true) {
  const art = arts.find(a => a.id === id);if (!art) return;
  const previousId = activeArtId, previousImage = activeImage;
  if (id !== state.artId && record) remember();
  state.artId = id;imageReady = false;setExportEnabled();syncControls();$('canvasLoading').hidden = false;
  const revision = ++selectionRevision;
  try {
    if (!imageCache.has(id)) imageCache.set(id,decodeImage(art.url));
    const image = await imageCache.get(id);if (revision !== selectionRevision) return;
    activeImage = image;activeArtId = id;imageReady = true;syncControls();paint();setExportEnabled();saveState();
  } catch {
    imageCache.delete(id);if (revision !== selectionRevision) return;
    state.artId = previousImage ? previousId : BUILTINS[0].id;activeImage = previousImage;
    imageReady = !!previousImage;$('canvasLoading').hidden = true;syncControls();setExportEnabled();
    toast('Não foi possível abrir essa imagem. Tente outra arte.');
    if (imageReady) requestPaint();
  }
}

function openDatabase() {
  return new Promise((resolve,reject) => {
    const request = indexedDB.open('atelie-quadros-imagens',1);
    request.onupgradeneeded = () => request.result.createObjectStore('arts',{keyPath:'id'});
    request.onsuccess = () => resolve(request.result);request.onerror = () => reject(request.error);
  });
}

function databaseOperation(mode, operation) {
  return new Promise((resolve,reject) => {
    if (!db) return reject(new Error('Armazenamento indisponível'));
    const transaction = db.transaction('arts',mode), request = operation(transaction.objectStore('arts'));
    let result;request.onsuccess = () => {result=request.result;};request.onerror = () => reject(request.error);
    transaction.oncomplete = () => resolve(result);transaction.onerror = () => reject(transaction.error);transaction.onabort = () => reject(transaction.error);
  });
}

async function importFiles(files) {
  const chosen = Array.from(files).slice(0,12);let imported = 0,lastId = null,notSaved = false;
  if (files.length > 12) toast('Adicione até 12 imagens por vez.');
  for (const file of chosen) {
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) {toast('Use imagens PNG, JPG ou WEBP.');continue;}
    if (file.size > 15*1024*1024) {toast('A imagem ' + file.name + ' ultrapassa 15 MB.');continue;}
    const url = URL.createObjectURL(file);
    try {
      const image = await decodeImage(url);
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth*image.naturalHeight > 65000000) throw new Error('Muito grande');
      const id = 'custom-' + (crypto.randomUUID?.() || Date.now() + '-' + Math.random().toString(16).slice(2));
      const title = file.name.replace(/\.[^.]+$/,'').slice(0,50) || 'Minha arte';
      const item = {id,title,blob:file};
      try {await databaseOperation('readwrite',store => store.put(item));} catch {notSaved = true;}
      arts.push({id,title,url,custom:true});imageCache.set(id,Promise.resolve(image));imported++;lastId = id;
    } catch {URL.revokeObjectURL(url);toast('Não foi possível abrir ' + file.name + '. Use uma imagem menor em PNG ou JPG.');}
  }
  $('uploadInput').value = '';
  if (imported) {renderGallery();await selectArt(lastId);toast(notSaved ? 'Imagem adicionada. Este navegador não permitiu guardá-la; baixe a arte antes de sair.' : (imported === 1 ? 'Sua imagem foi adicionada e salva neste aparelho.' : imported + ' imagens adicionadas e salvas neste aparelho.'));}
}

function canvasBlob(output, type, quality) {
  return new Promise((resolve,reject) => {output.toBlob(blob => blob ? resolve(blob) : reject(new Error('Falha ao gerar imagem')),type,quality);});
}

async function makeExport(kind) {
  if (!imageReady || !activeImage) throw new Error('Aguarde a imagem carregar');
  const current = {...state}, image = activeImage;
  await document.fonts.ready;
  const dimensions = getDimensions(current.format,image), output = document.createElement('canvas');
  if (kind === 'art') {
    output.width = dimensions.width;output.height = dimensions.height;
    renderArt(output.getContext('2d'),output.width,output.height,current,image);
    const png = await canvasBlob(output,'image/png');return {blob:current.format === 'original' ? png : await setPngDpi(png,300),extension:'png'};
  }
  const art = document.createElement('canvas');
  art.width = Math.round(Math.min(1400,2400*dimensions.width/dimensions.height));art.height = Math.round(art.width*dimensions.height/dimensions.width);
  renderArt(art.getContext('2d'),art.width,art.height,current,image);
  output.width = 1600;output.height = 1600;renderScene(output.getContext('2d'),1600,1600,current,art);
  return {blob:await canvasBlob(output,'image/jpeg',0.95),extension:'jpg'};
}

function filename(kind,extension) {
  const name = (state.name.trim() || 'sem-nome').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase() || 'quadro';
  return (kind === 'art' ? 'arte-' : 'previa-') + name + '.' + extension;
}

function downloadBlob(blob,name) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url;link.download = name;document.body.append(link);link.click();link.remove();
  setTimeout(() => URL.revokeObjectURL(url),30000);
}

async function exportImage(kind,share=false) {
  if (exporting || !imageReady) return;
  exporting=true;setExportEnabled();const sourceButton = $(share ? 'shareBtn' : kind === 'art' ? 'downloadArt' : 'downloadPreview');
  const label = sourceButton.innerHTML;sourceButton.textContent = 'Preparando…';
  try {
    const result = await makeExport(kind), name = filename(kind,result.extension);
    const file = new File([result.blob],name,{type:result.blob.type});
    if (share && navigator.share && navigator.canShare?.({files:[file]})) {
      try {await navigator.share({files:[file],title:'Prévia do seu quadro',text:'Preparei esta prévia com carinho. Confira o nome e me conte o que achou!'});}
      catch(error) {if(error.name!=='AbortError'){downloadBlob(result.blob,name);toast('Prévia baixada. Abra o WhatsApp e anexe a imagem ao cliente.');}}
    } else {downloadBlob(result.blob,name);toast(share ? 'Prévia baixada. Abra o WhatsApp e anexe a imagem ao cliente.' : kind === 'art' ? 'Arte em alta resolução pronta para baixar.' : 'Prévia pronta! Anexe a imagem no WhatsApp para seu cliente.');}
  } catch {toast('Não foi possível gerar o arquivo. Tente novamente ou use uma imagem menor.');}
  finally {sourceButton.innerHTML=label;exporting=false;setExportEnabled();}
}

function previewPoint(event) {
  const rect = canvas.getBoundingClientRect();return {x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};
}

function nameScreenBounds() {
  if(!layout||!nameBounds)return null;
  const scaleX = layout.width/artCanvas.width,scaleY=layout.height/artCanvas.height;
  return {x:layout.x+nameBounds.x*scaleX,y:layout.y+nameBounds.y*scaleY,width:nameBounds.width*scaleX,height:nameBounds.height*scaleY};
}

canvas.addEventListener('pointerdown',event => {
  if(!imageReady||!state.name.trim()||event.button>0)return;
  const point=previewPoint(event),box=nameScreenBounds();if(!box)return;
  const pad=24;
  if(Math.abs(point.x-box.x)>box.width/2+pad||Math.abs(point.y-box.y)>box.height/2+pad)return;
  event.preventDefault();remember();canvas.focus({preventScroll:true});
  drag={pointerId:event.pointerId,offsetX:point.x-box.x,offsetY:point.y-box.y};canvas.setPointerCapture(event.pointerId);canvas.classList.add('is-dragging');
});
canvas.addEventListener('pointermove',event => {
  if(!drag||event.pointerId!==drag.pointerId||!layout)return;
  event.preventDefault();const point=previewPoint(event);
  state.nameX=clamp((point.x-drag.offsetX-layout.x)/layout.width,0.02,0.98);
  state.nameY=clamp((point.y-drag.offsetY-layout.y)/layout.height,0.03,0.97);requestPaint();
});
function endDrag(event){if(!drag||event.pointerId!==drag.pointerId)return;drag=null;canvas.classList.remove('is-dragging');if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);saveState();}
canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
canvas.addEventListener('keydown',event => {
  const movement={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(!movement)return;
  event.preventDefault();const step=event.shiftKey?0.025:0.005;change({nameX:clamp(state.nameX+movement[0]*step,0.02,0.98),nameY:clamp(state.nameY+movement[1]*step,0.03,0.97)});
});

const textInputs={nameInput:'name',subtitleInput:'subtitle',colorInput:'color',backgroundInput:'background'};
for(const [id,key] of Object.entries(textInputs))$(id).addEventListener('input',event=>change({[key]:event.target.value}));
const selects={fontSelect:'font',formatSelect:'format',frameSelect:'frame'};
for(const [id,key] of Object.entries(selects))$(id).addEventListener('change',event=>change({[key]:event.target.value}));
for(const [id,key] of Object.entries({sizeRange:'size',imageScale:'imageScale',imageY:'imageY'})){
  $(id).addEventListener('pointerdown',remember);
  $(id).addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key))remember();});
  $(id).addEventListener('input',event=>change({[key]:Number(event.target.value)},false));
}
$('borderCheck').addEventListener('change',event=>change({border:event.target.checked}));
$('proofCheck').addEventListener('change',event=>change({proof:event.target.checked}));
document.querySelectorAll('[data-position]').forEach(button=>button.addEventListener('click',()=>change({namePlacement:button.dataset.position,nameX:0.5,nameY:button.dataset.position==='top'?0.115:0.885})));
$('centerBtn').addEventListener('click',()=>change({nameX:0.5}));
$('sceneMode').addEventListener('click',()=>change({mode:'scene'}));$('artMode').addEventListener('click',()=>change({mode:'art'}));
$('downloadPreview').addEventListener('click',()=>exportImage('preview'));$('downloadArt').addEventListener('click',()=>exportImage('art'));$('shareBtn').addEventListener('click',()=>exportImage('preview',true));
$('uploadInput').addEventListener('change',event=>importFiles(event.target.files));
for(const event of ['dragenter','dragover'])$('uploadZone').addEventListener(event,e=>{e.preventDefault();$('uploadZone').classList.add('drag-over');});
$('uploadZone').addEventListener('dragleave',()=>$('uploadZone').classList.remove('drag-over'));
$('uploadZone').addEventListener('drop',event=>{event.preventDefault();$('uploadZone').classList.remove('drag-over');importFiles(event.dataTransfer.files);});
$('resetBtn').addEventListener('click',()=>{remember();state={...DEFAULT_STATE,artId:state.artId};syncControls();requestPaint();saveState();toast('Ajustes reiniciados. Você pode começar uma nova personalização.');});
$('undoBtn').addEventListener('click',async()=>{
  if(!history.length)return;const previous=history.pop(),oldArt=state.artId;state=previous;
  if(!arts.some(a=>a.id===state.artId))state.artId=BUILTINS[0].id;
  $('undoBtn').disabled=history.length===0;syncControls();if(oldArt!==state.artId)await selectArt(state.artId,false);else requestPaint();saveState();
});
$('removeArtBtn').addEventListener('click',async()=>{
  const art=arts.find(a=>a.id===state.artId);if(!art?.custom)return;
  try{if(db)await databaseOperation('readwrite',store=>store.delete(art.id));}catch{toast('Não foi possível remover a imagem salva. Tente novamente.');return;}
  arts=arts.filter(a=>a.id!==art.id);history=history.filter(s=>s.artId!==art.id);$('undoBtn').disabled=history.length===0;
  await selectArt(BUILTINS[0].id,false);URL.revokeObjectURL(art.url);imageCache.delete(art.id);renderGallery();toast('Imagem removida deste aparelho.');
});
$('helpBtn').addEventListener('click',()=>$('helpDialog').showModal());
$('goToEditor').addEventListener('click',()=>{$('namePanel').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});$('nameInput').focus({preventScroll:true});$('nameInput').select();});
for(const id of ['closeHelp','startBtn'])$(id).addEventListener('click',()=>$('helpDialog').close());
$('helpDialog').addEventListener('click',event=>{if(event.target!==$('helpDialog'))return;const r=$('helpDialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('helpDialog').close();});
for(const color of COLORS){const button=document.createElement('button');button.className='swatch';button.type='button';button.style.backgroundColor=color;button.dataset.color=color;button.setAttribute('aria-label','Usar cor '+color);button.addEventListener('click',()=>change({color}));$('nameSwatches').append(button);}

function restoreState(saved){
  const next={...DEFAULT_STATE};
  for(const key of ['name','subtitle','artId'])if(typeof saved[key]==='string')next[key]=saved[key].slice(0,key==='subtitle'?100:key==='name'?50:100);
  if(['Caligrafia','Delicada','Classica','Moderna'].includes(saved.font))next.font=saved.font;
  if(['a4','24x33','square','original'].includes(saved.format))next.format=saved.format;
  if(['white','wood','pink','black','none'].includes(saved.frame))next.frame=saved.frame;
  if(['scene','art'].includes(saved.mode))next.mode=saved.mode;
  if(['top','bottom'].includes(saved.namePlacement))next.namePlacement=saved.namePlacement;
  for(const key of ['color','background'])if(/^#[a-f0-9]{6}$/i.test(saved[key]))next[key]=saved[key];
  for(const [key,min,max] of [['size',4,24],['imageScale',35,140],['imageY',-25,25],['nameX',0.02,0.98],['nameY',0.03,0.97]])if(Number.isFinite(saved[key]))next[key]=clamp(saved[key],min,max);
  for(const key of ['border','proof'])if(typeof saved[key]==='boolean')next[key]=saved[key];
  return next;
}

async function init(){
  setExportEnabled();
  try{const saved=JSON.parse(localStorage.getItem(STATE_KEY)||'null');if(saved&&typeof saved==='object')state=restoreState(saved);}catch{}
  const fonts=Promise.all(['Caligrafia','Delicada','Classica','Moderna'].map(font=>document.fonts.load(`100px "${font}"`))).catch(()=>toast('Uma fonte não carregou. Atualize a página para usar todas as letras.'));
  try{db=await openDatabase();const saved=await databaseOperation('readonly',store=>store.getAll());arts.push(...saved.filter(art=>art.blob instanceof Blob).map(art=>({id:art.id,title:art.title,url:URL.createObjectURL(art.blob),custom:true})));}catch{db=null;}
  if(!arts.some(art=>art.id===state.artId))state.artId=BUILTINS[0].id;
  renderGallery();syncControls();await fonts;await selectArt(state.artId,false);
}
init();
