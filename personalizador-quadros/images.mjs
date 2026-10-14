// Only the paper connected to an image edge is removed. White inside the
// illustrations (spacesuits, eyes, clouds) stays opaque behind their outlines.
export function paperMask(rgba, width, height, seeds=[]) {
  const count = width * height, visited = new Uint8Array(count), queue = new Int32Array(count);
  let head = 0, tail = 0;
  const isPaper = p => {
    const i = p * 4, r=rgba[i],g=rgba[i+1],b=rgba[i+2];
    return rgba[i+3] < 8 || (Math.min(r,g,b) > 224 && Math.max(r,g,b)-Math.min(r,g,b) < 28);
  };
  const visit = p => {if(!visited[p] && isPaper(p)){visited[p]=1;queue[tail++]=p;}};
  for(let x=0;x<width;x++){visit(x);visit((height-1)*width+x);}
  for(let y=0;y<height;y++){visit(y*width);visit(y*width+width-1);}
  for(const[x,y]of seeds)visit(Math.min(height-1,Math.floor(y*height))*width+Math.min(width-1,Math.floor(x*width)));
  while(head<tail){
    const p=queue[head++],x=p%width;
    if(x>0)visit(p-1);if(x<width-1)visit(p+1);
    if(p>=width)visit(p-width);if(p<count-width)visit(p+width);
  }
  return visited;
}
export function prepareImage(image, removePaper, options={}) {
  const c=document.createElement('canvas');
  c.width=image.naturalWidth;c.height=image.naturalHeight;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  if(removePaper){
    const pixels=ctx.getImageData(0,0,c.width,c.height),data=pixels.data;
    const mask=paperMask(data,c.width,c.height,options.paperSeeds);
    for(let p=0;p<mask.length;p++)if(mask[p])data[p*4+3]=0;
    ctx.putImageData(pixels,0,0);
    if(!options.monogram && !options.embeddedName){
      let left=c.width,top=c.height,right=0,bottom=0;
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>10){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      if(right>left&&bottom>top){
        const cropped=document.createElement('canvas');cropped.width=right-left+1;cropped.height=bottom-top+1;
        cropped.getContext('2d').drawImage(c,left,top,cropped.width,cropped.height,0,0,cropped.width,cropped.height);
        cropped.sourceWidth=image.naturalWidth;cropped.sourceHeight=image.naturalHeight;return cropped;
      }
    }
  }
  return c;
}
