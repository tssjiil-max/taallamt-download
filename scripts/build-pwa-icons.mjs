import sharp from 'sharp';
import {copyFile} from 'node:fs/promises';
const version='20261022',source=`public/pwa/shakabumbo-source-${version}.png`;
for(const role of ['teacher','student']){
 for(const [kind,size,scale,opaque] of [['icon-192',192,.88,false],['icon-512',512,.88,false],['icon-maskable-512',512,.56,true],['apple-touch-icon',180,.74,true]]){
  const inner=Math.round(size*scale),before=Math.floor((size-inner)/2),after=size-inner-before;
  const background=opaque?{r:224,g:244,b:255,alpha:1}:{r:0,g:0,b:0,alpha:0};
  const output=`public/pwa/${role}-${kind}-${version}.png`;
  let pipeline=sharp(source).resize(inner,inner,{fit:'contain',background}).extend({top:before,bottom:after,left:before,right:after,background});
  if(opaque)pipeline=pipeline.flatten({background:{r:224,g:244,b:255}});
  await pipeline.png({compressionLevel:9}).toFile(output);
  await copyFile(output,`public/pwa/${role}-${kind}.png`);
 }
}
console.log('PWA icons: exact approved source, transparent any icons, light-blue maskable safe zone.');
