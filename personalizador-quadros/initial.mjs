export function renderInitial(ctx,w,h,state){
  const letter=Array.from(String(state.initial||'').trim().normalize('NFC'))[0]?.toLocaleUpperCase('pt-BR');
  if(!state.showInitial||!letter)return;
  const font=state.initialFont==='Moderna'?'Moderna':'Classica';
  const size=w*(state.initialSize||76)/100;
  ctx.save();ctx.font=size+'px "'+font+'"';ctx.textAlign='center';ctx.textBaseline='alphabetic';
  const m=ctx.measureText(letter),ascent=m.actualBoundingBoxAscent||size*.75,descent=m.actualBoundingBoxDescent||0;
  const x=w*(state.initialX??.5),y=h*(state.initialY??.40),baseline=y+(ascent-descent)/2;
  const layer=document.createElement('canvas');layer.width=w;layer.height=h;
  const l=layer.getContext('2d');l.font=ctx.font;l.textAlign='center';l.textBaseline='alphabetic';
  l.fillStyle=state.initialColor||state.color;l.fillText(letter,x,baseline);
  if(state.initialPattern!=='solid'){
    l.globalCompositeOperation='source-atop';
    let seed=937;
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    l.fillStyle='#ffffff';
    if(state.initialPattern==='stripes'){
      l.globalAlpha=.67;for(let yy=0;yy<h;yy+=w*.18)l.fillRect(0,yy,w,w*.085);
    }else{
      for(let i=0;i<190;i++){
        const xx=random()*w,yy=random()*h,r=w*(.005+random()*.035);
        l.globalAlpha=state.initialPattern==='spots'?.16:.09;
        l.fillStyle=state.initialPattern==='spots'&&i%2?'#243d24':'#ffffff';
        l.beginPath();l.ellipse(xx,yy,r,r*.8,random()*3,0,Math.PI*2);l.fill();
      }
      if(state.initialPattern==='stars'){
        l.globalAlpha=.9;l.fillStyle='#f7e4b4';
        for(let i=0;i<16;i++){
          const xx=random()*w,yy=random()*h,r=w*.012;
          l.beginPath();for(let j=0;j<10;j++){const a=-Math.PI/2+j*Math.PI/5,rr=j%2?r*.43:r;l.lineTo(xx+Math.cos(a)*rr,yy+Math.sin(a)*rr);}l.closePath();l.fill();
        }
      }
    }
  }
  ctx.drawImage(layer,0,0);ctx.restore();
}
