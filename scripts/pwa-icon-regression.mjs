import {existsSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const studentFiles=[
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
for(const [path,size] of studentFiles){
  assert.ok(existsSync(path),path+' missing');
  assert.deepEqual(pngSize(path),[size,size],path+' wrong dimensions');
}
const teacherAsset='public/pwa/teacher-shakabumbo-group.webp';
assert.ok(existsSync(teacherAsset),teacherAsset+' missing');
const teacher=readFileSync('public/manifest-teacher.webmanifest','utf8');
const teacherManifest=JSON.parse(teacher);
assert.ok(teacherManifest.icons.some(i=>i.src.includes('/pwa/teacher-shakabumbo-group.webp')&&i.purpose==='any'));
assert.ok(teacherManifest.icons.some(i=>i.src.includes('/pwa/teacher-shakabumbo-group.webp')&&i.purpose==='maskable'));
assert.ok(!teacher.includes('vercel')&&!teacher.includes('dist/assets')&&!teacher.includes('any maskable'));

const student=readFileSync('public/manifest-student.webmanifest','utf8');
const studentManifest=JSON.parse(student);
assert.ok(studentManifest.icons.some(i=>i.sizes==='192x192'&&i.purpose==='any'));
assert.ok(studentManifest.icons.some(i=>i.sizes==='512x512'&&i.purpose==='any'));
assert.ok(studentManifest.icons.some(i=>i.sizes==='512x512'&&i.purpose==='maskable'));

const html=readFileSync('index.html','utf8');
assert.ok(html.includes('/pwa/teacher-shakabumbo-group.webp'));
assert.ok(html.includes('/pwa/student-apple-touch-icon.png'));
assert.ok(existsSync('public/pwa/shakabumbo-app-icon-source.png'));
console.log('PWA icon regression checks passed.');
