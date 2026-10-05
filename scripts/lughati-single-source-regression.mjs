import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const svgPath='public/shakabumbo-icons/03_lughati.svg';
const svg=readFileSync(svgPath,'utf8');
const visualSafe=readFileSync('public/student-parent-visual-safe.js','utf8');
const remap=readFileSync('public/student-shakabumbo-icons.js','utf8');
const patch=readFileSync('public/student-style-patch.js','utf8');

// 1) The artwork itself must be a complete image. A truncated paste once shipped here and showed a broken icon.
const match=svg.match(/href="data:image\/webp;base64,([^"]+)"/);
assert.ok(svg.trimStart().startsWith('<svg')&&match,'Lughati icon must be an SVG wrapping an embedded WebP');
const bytes=Buffer.from(match[1],'base64');
assert.equal(bytes.subarray(0,4).toString('latin1'),'RIFF','embedded image must start with a RIFF header');
assert.equal(bytes.subarray(8,12).toString('latin1'),'WEBP','embedded image must be WebP');
assert.equal(bytes.readUInt32LE(4)+8,bytes.length,'embedded WebP must be complete (RIFF size must match the data length)');
assert.equal(match[1].length%4,0,'embedded base64 must not be cut mid-group');

// 2) Exactly one script decides the Lughati source.
assert.ok(/'لغتي':'\/shakabumbo-icons\/03_lughati\.svg\?v=[0-9a-z]+'/.test(visualSafe),'student-parent-visual-safe.js must own the Lughati source');
assert.equal(remap.includes('03_lughati'),false,'student-shakabumbo-icons.js must not set the Lughati source');
assert.equal(patch.includes('03_lughati'),false,'student-style-patch.js must not set the Lughati source');
assert.ok(patch.includes("'لغتي':null")&&patch.includes('ensureSubjectImgOnly'),'student-style-patch.js must keep the Lughati <img> element without writing its src');
assert.equal(existsSync('public/shakabumbo-icons/03_lughati_fixed_20261003.svg'),false,'no second copy of the Lughati artwork');

// 3) The other subject icons are still handled as before.
for(const asset of ['04_imlaa_khatt.svg','05_quran.svg','06_islamic_studies.svg']){
  assert.ok(visualSafe.includes(asset)&&remap.includes(asset),`${asset} must stay mapped as before`);
}

console.log('Lughati single-source regression checks passed.');
