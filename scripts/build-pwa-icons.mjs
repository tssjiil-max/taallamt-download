import {readFileSync,writeFileSync} from 'node:fs';
import {deflateSync,inflateSync} from 'node:zlib';

const SOURCE='public/pwa/shakabumbo-app-icon-source.png';

function crcTable(){
  const table=new Uint32Array(256);
  for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);table[n]=c>>>0}
  return table;
}
const CRC=crcTable();
function crc32(buf){let c=0xffffffff;for(const b of buf)c=CRC[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
function chunk(type,data){
  const t=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);
  len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));
  return Buffer.concat([len,t,data,crc]);
}
function parsePng(buf){
  if(buf.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('PWA_ICON_SOURCE_NOT_PNG');
  let p=8,ihdr=null,plte=null,idats=[];
  while(p<buf.length){
    const len=buf.readUInt32BE(p),type=buf.subarray(p+4,p+8).toString('ascii'),data=buf.subarray(p+8,p+8+len);
    p+=12+len;
    if(type==='IHDR')ihdr=Buffer.from(data);
    else if(type==='PLTE')plte=Buffer.from(data);
    else if(type==='IDAT')idats.push(data);
    else if(type==='IEND')break;
  }
  if(!ihdr||!plte)throw new Error('PWA_ICON_SOURCE_PALETTE_REQUIRED');
  const width=ihdr.readUInt32BE(0),height=ihdr.readUInt32BE(4),bit=ihdr[8],color=ihdr[9];
  if(bit!==8||color!==3)throw new Error('PWA_ICON_SOURCE_FORMAT_UNSUPPORTED');
  const raw=inflateSync(Buffer.concat(idats)),rows=[],stride=width;
  let prev=Buffer.alloc(stride),o=0;
  for(let y=0;y<height;y++){
    const filter=raw[o++],src=raw.subarray(o,o+stride);o+=stride;const row=Buffer.alloc(stride);
    for(let x=0;x<stride;x++){
      const a=x?row[x-1]:0,b=prev[x]||0,c=x?prev[x-1]||0:0;let v=src[x];
      if(filter===1)v=(v+a)&255;
      else if(filter===2)v=(v+b)&255;
      else if(filter===3)v=(v+Math.floor((a+b)/2))&255;
      else if(filter===4){const p0=a+b-c,pa=Math.abs(p0-a),pb=Math.abs(p0-b),pc=Math.abs(p0-c),pr=pa<=pb&&pa<=pc?a:pb<=pc?b:c;v=(v+pr)&255}
      else if(filter!==0)throw new Error('PWA_ICON_FILTER_UNSUPPORTED');
      row[x]=v;
    }
    rows.push(row);prev=row;
  }
  return {width,height,plte,rows};
}
function encode(img){
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(img.width,0);ihdr.writeUInt32BE(img.height,4);ihdr[8]=8;ihdr[9]=3;
  const raw=Buffer.alloc(img.height*(img.width+1));let o=0;
  for(const row of img.rows){raw[o++]=0;row.copy(raw,o);o+=img.width}
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('PLTE',img.plte),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
function resize(img,target,scale=1){
  const rows=Array.from({length:target},()=>Buffer.alloc(target,0));
  const drawn=Math.max(1,Math.round(target*scale)),off=Math.floor((target-drawn)/2);
  for(let y=0;y<drawn;y++){
    const sy=Math.min(img.height-1,Math.floor(y*img.height/drawn));
    for(let x=0;x<drawn;x++){
      const sx=Math.min(img.width-1,Math.floor(x*img.width/drawn));
      rows[off+y][off+x]=img.rows[sy][sx];
    }
  }
  return {width:target,height:target,plte:img.plte,rows};
}
const source=parsePng(readFileSync(SOURCE));
for(const prefix of ['student']){
  writeFileSync(`public/pwa/${prefix}-icon-192.png`,encode(resize(source,192,1)));
  writeFileSync(`public/pwa/${prefix}-icon-512.png`,encode(resize(source,512,1)));
  writeFileSync(`public/pwa/${prefix}-icon-maskable-512.png`,encode(resize(source,512,0.91)));
  writeFileSync(`public/pwa/${prefix}-apple-touch-icon.png`,encode(resize(source,180,1)));
}
console.log('Student PWA icons generated. Teacher icon is a permanent tracked Shakabumbo group asset and is never overwritten by builds.');
