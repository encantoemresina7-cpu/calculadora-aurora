import { renderInitial } from './initial.mjs?v=20261014-kits';
import { roomPictureArea } from './scenes.mjs?v=20261014-cenarios';
export const FORMATS = {
  a4: { label: 'A4', width: 2480, height: 3508 },
  '24x33': { label: '24 × 33 cm', width: 2835, height: 3898 },
  square: { label: '20 × 20 cm', width: 2362, height: 2362 },
};

export const DEFAULT_STATE = {
  artId: 'bailarina', name: 'Alice', subtitle: '', font: 'Caligrafia', color: '#987180',
  size: 14, nameX: 0.5, nameY: 0.885, namePlacement: 'bottom', format: 'a4',
  imageScale: 100, imageY: 0, frame: 'white', background: '#ffffff', border: false,
  proof: true, mode: 'scene',
};

export function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

export function getDimensions(format, image) {
  if (FORMATS[format]) return FORMATS[format];
  const iw = image?.sourceWidth || image?.naturalWidth || image?.width || 1000;
  const ih = image?.sourceHeight || image?.naturalHeight || image?.height || 1400;
  const ratio = iw / ih;
  const longer = Math.min(4200, Math.max(2400, Math.max(iw, ih)));
  return { label: 'Original', width: Math.round(ratio > 1 ? longer : longer * ratio), height: Math.round(ratio > 1 ? longer / ratio : longer) };
}

export function getNameBox(ctx, w, h, state) {
  const text = (state.name || '').trim();
  let fontSize = w * state.size / 100;
  const font = ['Caligrafia', 'Delicada', 'Classica', 'Moderna'].includes(state.font) ? state.font : 'Moderna';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${fontSize}px "${font}"`;
  let metrics = ctx.measureText(text || 'Nome');
  const rawWidth = Math.max(metrics.width, (metrics.actualBoundingBoxLeft || 0) + (metrics.actualBoundingBoxRight || 0));
  if (rawWidth > w * 0.86) {
    fontSize *= w * 0.86 / rawWidth;
    ctx.font = `${fontSize}px "${font}"`;
    metrics = ctx.measureText(text || 'Nome');
  }
  const width = Math.min(w * 0.88, Math.max(metrics.width, (metrics.actualBoundingBoxLeft || 0) + (metrics.actualBoundingBoxRight || 0)));
  const ascent = Math.max(0, metrics.actualBoundingBoxAscent ?? fontSize * 0.8);
  const descent = Math.max(0, metrics.actualBoundingBoxDescent ?? fontSize * 0.2);
  const height = Math.max(ascent + descent, fontSize * 0.4);
  const x = clamp(w * state.nameX, w * 0.05 + width / 2, w * 0.95 - width / 2);
  const y = clamp(h * state.nameY, h * 0.035 + height / 2, h * 0.965 - height / 2);
  return { x, y, width, height, fontSize, baseline: y + (ascent - descent) / 2, font, text };
}

export function renderArt(ctx, w, h, state, image) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = state.background;
  ctx.fillRect(0, 0, w, h);
  ctx.beginPath();ctx.rect(0, 0, w, h);ctx.clip();
  renderInitial(ctx,w,h,state);
  if (image) {
    const iw = image.naturalWidth || image.width;
    const ih = image.naturalHeight || image.height;
    const topName = state.namePlacement === 'top';
    const monogram=state.monogram;
    const hasName=state.showName!==false && state.name.trim() && !state.embeddedName;
    const box = monogram
      ? {x:0,y:0,width:w,height:h*.87}
      : { x: w * 0.035, y: h * (topName && hasName ? 0.20 : 0.025), width: w * 0.93, height: h * (hasName ? 0.77 : .95) };
    const scale = Math.min(box.width / iw, box.height / ih) * state.imageScale / 100;
    const dw = iw * scale, dh = ih * scale;
    const dx = box.x + (box.width - dw) / 2;
    const dy = box.y + (box.height - dh) / 2 + h * state.imageY / 100;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, dx, dy, dw, dh);
  }
  if (state.border) {
    ctx.strokeStyle = state.color;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = Math.max(1, w * 0.0018);
    ctx.strokeRect(w * 0.035, h * 0.025, w * 0.93, h * 0.95);
    ctx.globalAlpha = 1;
  }
  const nameBox = getNameBox(ctx, w, h, state);
  ctx.fillStyle = state.color;
  if (nameBox.text && state.showName!==false) ctx.fillText(nameBox.text, nameBox.x, nameBox.baseline);
  if ((state.subtitle || '').trim()) {
    let size = w * 0.028;
    ctx.font = `${size}px "Moderna"`;
    const words = state.subtitle.trim().split(/\s+/);
    const lines = [''];
    words.forEach(word => {
      const index = lines.length - 1;
      const candidate = (lines[index] + ' ' + word).trim();
      if (ctx.measureText(candidate).width > w * 0.83 && lines[index] && lines.length < 2) lines.push(word);
      else lines[index] = candidate;
    });
    const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    if (maxWidth > w * 0.83) size *= w * 0.83 / maxWidth;
    ctx.font = `${size}px "Moderna"`;
    ctx.textBaseline = 'middle';ctx.textAlign = 'center';
    const lineHeight = size * 1.45;
    const firstY = clamp(nameBox.y + nameBox.height / 2 + h * 0.028 + lineHeight / 2, h * 0.06, h * 0.96 - (lines.length - 1) * lineHeight);
    const captionWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    const x = clamp(nameBox.x, w * 0.05 + captionWidth / 2, w * 0.95 - captionWidth / 2);
    lines.forEach((line, i) => ctx.fillText(line, x, firstY + i * lineHeight));
  }
  ctx.restore();
  return nameBox;
}

export function getSceneLayout(w, h, artRatio, frame, room=false) {
  const border = frame === 'none' ? 0 : w * (room ? 0.012 : 0.019);
  if(room){
    const area=roomPictureArea(w,h);
    const height=Math.min(area.height,area.width/artRatio),width=height*artRatio;
    return {x:area.x+(area.width-width)/2,y:area.y+(area.height-height)/2,width,height,border};
  }
  let innerW = w * (artRatio > 1.1 ? 0.65 : artRatio > 0.95 ? 0.52 : 0.44);
  let innerH = innerW / artRatio;
  if (innerH > h * 0.65) { innerH = h * 0.65; innerW = innerH * artRatio; }
  const x = (w - innerW) / 2, y = h * 0.137 + (h * 0.65 - innerH) / 2;
  return { x, y, width: innerW, height: innerH, border };
}

function sceneBackground(ctx,w,h,state,backgroundImage){
  if(backgroundImage){
    const iw=backgroundImage.naturalWidth||backgroundImage.width,ih=backgroundImage.naturalHeight||backgroundImage.height;
    const scale=Math.max(w/iw,h/ih);
    ctx.drawImage(backgroundImage,(w-iw*scale)/2,(h-ih*scale)/2,iw*scale,ih*scale);
    return;
  }
  const wall = ctx.createLinearGradient(0, 0, w, h);
  wall.addColorStop(0, state.wallColor||'#f9f6f1');wall.addColorStop(1, state.wallColor||'#ece7df');
  ctx.fillStyle = wall;ctx.fillRect(0,0,w,h);
  // Light architectural lines and a narrow shelf keep attention on the picture.
  ctx.strokeStyle = '#ffffff55';ctx.lineWidth = w * 0.003;
  for (const x of [w * 0.085,w * 0.915]) {ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h*0.89);ctx.stroke();}
  const shelfY = h * 0.85;
  ctx.fillStyle = '#d3c1ad25';ctx.fillRect(w*.10,shelfY+h*.018,w*.80,h*.015);
  const shelf = ctx.createLinearGradient(0,shelfY,0,shelfY+h*.017);
  shelf.addColorStop(0,'#e2d3c0');shelf.addColorStop(1,'#cbb8a0');
  ctx.fillStyle = shelf;ctx.fillRect(w*.08,shelfY,w*.84,h*.012);
  ctx.fillStyle='#f3ede4';ctx.fillRect(w*.08,shelfY,w*.84,h*.003);
}

function sceneProof(ctx,w,h,room){
  ctx.save();ctx.font=`${w*.014}px "Moderna"`;ctx.textAlign='center';ctx.textBaseline='middle';
  if(room){ctx.fillStyle='#ffffffdc';ctx.fillRect(w*.37,h*.947,w*.26,h*.026);}
  ctx.fillStyle='#76695c';ctx.fillText('PRÉVIA ILUSTRATIVA',w/2,h*(room ? .96 : .934));ctx.restore();
}

export function renderScene(ctx, w, h, state, artCanvas, backgroundImage=null) {
  ctx.save();ctx.clearRect(0,0,w,h);
  sceneBackground(ctx,w,h,state,backgroundImage);

  const layout = getSceneLayout(w,h,artCanvas.width/artCanvas.height,state.frame,!!backgroundImage);
  const {x,y,width:aw,height:ah,border:b} = layout;
  ctx.save();ctx.shadowColor='#52423438';ctx.shadowBlur=w*.038;ctx.shadowOffsetX=w*.009;ctx.shadowOffsetY=h*.017;
  ctx.fillStyle=state.frame==='none'?'#fff':({white:'#fffefd',wood:'#ccae8b',pink:'#d9b5c3',black:'#373332'}[state.frame] || '#fffefd');
  ctx.fillRect(x-b,y-b,aw+b*2,ah+b*2);ctx.restore();
  if (b) {
    const face = ctx.createLinearGradient(x-b,y-b,x+aw+b,y+ah+b);
    const colors={white:['#ffffff','#f3f0eb'],wood:['#e3c8a4','#c09e75'],pink:['#e9ccd6','#c498aa'],black:['#494342','#252122']}[state.frame] || ['#fff','#eee'];
    face.addColorStop(0,colors[0]);face.addColorStop(1,colors[1]);
    ctx.fillStyle=face;ctx.fillRect(x-b,y-b,aw+b*2,ah+b*2);
    ctx.strokeStyle=state.frame==='black'?'#766b61':'#b2a29655';ctx.lineWidth=w*.0008;ctx.strokeRect(x-b,y-b,aw+b*2,ah+b*2);
    ctx.strokeStyle='#ffffff70';ctx.beginPath();ctx.moveTo(x-b,y-b);ctx.lineTo(x,y);ctx.moveTo(x+aw+b,y-b);ctx.lineTo(x+aw,y);ctx.moveTo(x-b,y+ah+b);ctx.lineTo(x,y+ah);ctx.moveTo(x+aw+b,y+ah+b);ctx.lineTo(x+aw,y+ah);ctx.stroke();
  }
  ctx.drawImage(artCanvas,x,y,aw,ah);
  ctx.strokeStyle='#74615525';ctx.lineWidth=w*.002;ctx.strokeRect(x,y,aw,ah);
  if(state.proof)sceneProof(ctx,w,h,!!backgroundImage);
  ctx.restore();
  return layout;
}

export function renderFlatPreview(ctx, w, h, artCanvas) {
  ctx.save();ctx.clearRect(0,0,w,h);ctx.fillStyle='#f3eeeb';ctx.fillRect(0,0,w,h);
  const scale = Math.min(w * 0.87 / artCanvas.width, h * 0.87 / artCanvas.height);
  const aw = artCanvas.width * scale, ah = artCanvas.height * scale;
  const x = (w-aw)/2, y = (h-ah)/2;
  ctx.shadowColor='#69544920';ctx.shadowBlur=w*.03;ctx.shadowOffsetY=h*.01;ctx.drawImage(artCanvas,x,y,aw,ah);ctx.restore();
  return {x,y,width:aw,height:ah,border:0};
}

// The same composition is used by the screen, downloads and sharing.
export function renderKit(ctx,w,h,state,canvases,flat=false,backgroundImage=null){
  ctx.save();ctx.clearRect(0,0,w,h);
  const room=!flat&&!!backgroundImage;
  if(flat){ctx.fillStyle='#f3eeeb';ctx.fillRect(0,0,w,h);}
  else sceneBackground(ctx,w,h,state,backgroundImage);
  const area=room?roomPictureArea(w,h):null;
  const gap=w*.025,limit=room?area.width:w*.87,ratios=canvases.map(c=>c.width/c.height);
  const ah=Math.min(room?area.height:h*.59,(limit-gap*2)/ratios.reduce((a,b)=>a+b,0));
  const total=ah*ratios.reduce((a,b)=>a+b,0)+gap*2;
  let x=(w-total)/2;const y=room?area.y+(area.height-ah)/2:(h-ah)/2-h*.04,layouts=[];
  for(let i=0;i<canvases.length;i++){
    const aw=ah*ratios[i],b=flat||state.frame==='none'?0:w*.010;
    const colors={white:'#fffefd',wood:'#cdb18b',pink:'#d9b5c3',black:'#373332'};
    ctx.save();ctx.shadowColor='#52423435';ctx.shadowBlur=w*.015;ctx.shadowOffsetY=h*.007;
    ctx.fillStyle=colors[state.frame]||'#fff';ctx.fillRect(x-b,y-b,aw+b*2,ah+b*2);ctx.restore();
    ctx.drawImage(canvases[i],x,y,aw,ah);
    if(b){ctx.strokeStyle='#a79d8d45';ctx.lineWidth=w*.0008;ctx.strokeRect(x,y,aw,ah);}
    layouts.push({x,y,width:aw,height:ah,border:b});x+=aw+gap;
  }
  if(!flat){
    if(state.proof)sceneProof(ctx,w,h,room);
  }
  ctx.restore();return layouts;
}
