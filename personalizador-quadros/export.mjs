function crc32(bytes) {
  let crc=0xffffffff;
  for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
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
