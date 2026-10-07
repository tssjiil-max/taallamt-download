import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
assert.ok(fs.existsSync('public/pwa/sw.js'),'PWA service worker must exist');
const handlers={};let intercepted=false;
vm.runInNewContext(fs.readFileSync('public/pwa/sw.js','utf8'),{self:{location:{origin:'https://example.test'},addEventListener:(n,f)=>handlers[n]=f},URL,caches:{},fetch:()=>{},Promise});
for(const path of ['/api/messages','/student?token=private','/teacher','/assets/private.json']){
 intercepted=false;handlers.fetch({request:{url:'https://example.test'+path,method:'GET'},respondWith:()=>intercepted=true});assert.equal(intercepted,false,`Never cache ${path}`);
}
const student=JSON.parse(fs.readFileSync('public/pwa/student.webmanifest'));const teacher=JSON.parse(fs.readFileSync('public/pwa/teacher.webmanifest'));
assert.notEqual(student.id,teacher.id);assert.equal(student.start_url,'/student');assert.equal(teacher.start_url,'/teacher');
for(const m of [student,teacher])for(const i of m.icons)assert.ok(fs.existsSync('public'+i.src));
console.log('PWA isolation and private-data cache checks passed');
