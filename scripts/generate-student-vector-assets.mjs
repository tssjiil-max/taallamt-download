import {mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';

const partsDir='scripts/student-vector-bundle';
const correctedParts=new Map([
  ['vector.part02',['vector.fix02a','vector.fix02b','vector.fix02c']],
  ['vector.part06',['vector.fix06a','vector.fix06bc']],
]);
const encoded=readdirSync(partsDir)
  .filter(name=>name.startsWith('vector.part'))
  .sort()
  .map(name=>{
    const replacement=correctedParts.get(name);
    if(replacement)return replacement.map(part=>readFileSync(join(partsDir,part),'utf8').trim()).join('');
    return readFileSync(join(partsDir,name),'utf8').trim();
  })
  .join('');

if(!encoded)throw new Error('STUDENT_VECTOR_BUNDLE_MISSING');

const bundle=gunzipSync(Buffer.from(encoded,'base64')).toString('utf8');
const targetDir='public/student-assets/vector';
mkdirSync(targetDir,{recursive:true});

const matches=[...bundle.matchAll(/@@FILE:([^@]+)@@\n([\s\S]*?)(?=\n@@FILE:|$)/g)];
if(matches.length!==7)throw new Error(`STUDENT_VECTOR_BUNDLE_INVALID:${matches.length}`);

for(const match of matches){
  const filename=match[1].trim();
  const svg=match[2].trim()+"\n";
  if(!svg.includes('<svg')||svg.includes('<image'))throw new Error(`STUDENT_VECTOR_NOT_PATH_ONLY:${filename}`);
  writeFileSync(join(targetDir,filename),svg,'utf8');
}

console.log(`Generated ${matches.length} student vector assets.`);
