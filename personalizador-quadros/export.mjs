function crc32(bytes) {
  let crc=0xffffffff;
  for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}

// A dependency-free ZIP containing the individual print-ready PNGs.
export async function zipFiles(files){
  const encoder=new TextEncoder(),parts=[],central=[];let offset=0,centralSize=0;
  const date=new Date(),dosDate=((date.getFullYear()-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();
  const dosTime=(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1);
  for(const file of files){
    const name=encoder.encode(file.name),data=new Uint8Array(await file.blob.arrayBuffer()),crc=crc32(data);
    const header=new Uint8Array(30+name.length),v=new DataView(header.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);
    v.setUint16(10,dosTime,true);v.setUint16(12,dosDate,true);v.setUint32(14,crc,true);
    v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);header.set(name,30);
    const entry=new Uint8Array(46+name.length),e=new DataView(entry.buffer);
    e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x800,true);
    e.setUint16(12,dosTime,true);e.setUint16(14,dosDate,true);e.setUint32(16,crc,true);
    e.setUint32(20,data.length,true);e.setUint32(24,data.length,true);e.setUint16(28,name.length,true);e.setUint32(42,offset,true);entry.set(name,46);
    parts.push(header,data);central.push(entry);centralSize+=entry.length;offset+=header.length+data.length;
  }
  const end=new Uint8Array(22),v=new DataView(end.buffer);
  v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);
  v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
  return new Blob([...parts,...central,end],{type:'application/zip'});
}

// Write physical-size metadata so 300 dpi PNGs retain the selected print size.
export async function setPngDpi(blob,dpi=300){
  const bytes=new Uint8Array(await blob.arrayBuffer());
  const signature=[137,80,78,71,13,10,26,10];
  if(!signature.every((byte,i)=>bytes[i]===byte))throw new Error('PNG inválido');
  const density=Math.round(dpi/0.0254),chunk=new Uint8Array(21),view=new DataView(chunk.buffer);
  view.setUint32(0,9);chunk.set([112,72,89,115],4);view.setUint32(8,density);view.setUint32(12,density);chunk[16]=1;
  view.setUint32(17,crc32(chunk.subarray(4,17)));
  const parts=[bytes.subarray(0,8)];let offset=8,inserted=false;
  while(offset+12<=bytes.length){
    const length=new DataView(bytes.buffer,bytes.byteOffset+offset,4).getUint32(0);
    const end=offset+12+length;if(end>bytes.length)throw new Error('PNG incompleto');
    const type=String.fromCharCode(...bytes.subarray(offset+4,offset+8));
    if(type!=='pHYs')parts.push(bytes.subarray(offset,end));
    if(type==='IHDR'){parts.push(chunk);inserted=true;}
    offset=end;
  }
  if(!inserted||offset!==bytes.length)throw new Error('PNG inválido');
  return new Blob(parts,{type:'image/png'});
}
