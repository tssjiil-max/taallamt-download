import {existsSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const files=[
  ['public/pwa/teacher-icon-192.png',192],
  ['public/pwa/teacher-icon-512.png',512],
  ['public/pwa/teacher-icon-maskable-512.png',512],
  ['public/pwa/teacher-apple-touch-icon.png',180],
  ['public/pwa/student-icon-192.png',192],
  ['public/pwa/student-icon-512.png',512],
  ['public/pwa/student-icon-maskable-512.png',512],
  ['public/pwa/student-apple-touch-icon.png',180]
];

function pngSize(path){
  const b=readFileSync(path);
  assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a',path+' must be PNG');
  return [b.readUInt32BE(16),b.readUInt32BE(20)];
}

for(const [path,size] of files){
  assert.ok(existsSync(path),path+' missing');
  assert.deepEqual(pngSize(path),[size,size],path+' wrong dimensions');
}

for(const [name,path] of [['teacher','public/manifest-teacher.webmanifest'],['student','public/manifest-student.webmanifest']]){
  const manifest=JSON.parse(readFileSync(path,'utf8'));
  const text=JSON.stringify(manifest);
  assert.ok(manifest.icons.some(i=>i.sizes==='192x192'&&i.purpose==='any'));
  assert.ok(manifest.icons.some(i=>i.sizes==='512x512'&&i.purpose==='any'));
  assert.ok(manifest.icons.some(i=>i.sizes==='512x512'&&i.purpose==='maskable'));
  assert.ok(!text.includes('vercel')&&!text.includes('dist/assets')&&!text.includes('any maskable'));
  assert.ok(manifest.icons.every(i=>i.src.startsWith('/pwa/'+name+'-icon-')));
}

const install=readFileSync('public/pwa-install.js','utf8');
assert.ok(install.includes('taallamtInstallPage'),'manual save-to-home-screen action missing');
const studentApi=readFileSync('api/student-state.js','utf8');
assert.ok(studentApi.includes('studentId=')&&studentApi.includes('&invite=')&&studentApi.includes('source=pwa'),'dynamic student start_url must retain studentId and invite');
const studentUi=readFileSync('src/app/student.tsx','utf8');
assert.ok(studentUi.includes('حفظ الصفحة على الجوال'),'student save-to-home-screen button missing');

const html=readFileSync('index.html','utf8');
assert.ok(html.includes('/pwa/teacher-apple-touch-icon.png'));
assert.ok(html.includes('/pwa/student-apple-touch-icon.png'));
assert.ok(existsSync('public/pwa/teacher-shakabumbo-group.webp'));
assert.ok(existsSync('public/pwa/student-shakabumbo-trophy.png'));

console.log('PWA icon regression checks passed.');
