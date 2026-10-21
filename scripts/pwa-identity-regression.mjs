import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const version='20261022';
for(const role of ['teacher','student']){
 const manifest=JSON.parse(readFileSync(`public/manifest-${role}.webmanifest`));
 assert.equal(manifest.id,'/'+role);assert.equal(manifest.scope,'/'+role);assert.equal(manifest.background_color,'#e0f4ff');
 for(const icon of manifest.icons){assert.ok(icon.src.includes(version));const file='public'+icon.src;assert.ok(existsSync(file));const b=readFileSync(file);assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(`${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`,icon.sizes)}
}
const handlers={},removed=[],network=[],kept='https://school.test/offline-answers';
const context={URL,self:{location:{origin:'https://school.test'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:()=>{},clients:{claim:async()=>{}}},caches:{keys:async()=>['taallamt-old','other-app'],open:async()=>({keys:async()=>[{url:'https://school.test/pwa/teacher-icon-512.png'},{url:kept}],delete:async req=>removed.push(req.url)})},fetch:async(...args)=>{network.push(args);return {ok:true}}};
vm.runInNewContext(readFileSync('public/sw.js','utf8'),context);let active;handlers.activate({waitUntil:p=>active=p});await active;assert.deepEqual(removed,['https://school.test/pwa/teacher-icon-512.png']);
let response;handlers.fetch({request:{method:'GET',url:'https://school.test/pwa/student-icon-512-20261022.png'},respondWith:p=>response=p});await response;assert.equal(network.at(-1)[1].cache,'no-store');
handlers.fetch({request:{method:'GET',url:kept},respondWith:p=>response=p});await response;assert.equal(network.at(-1).length,1);
console.log('PWA identity checks passed: versioned assets, retained identities, network refresh, cached student work preserved.');
