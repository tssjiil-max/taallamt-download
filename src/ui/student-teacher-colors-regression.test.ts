import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const css=readFileSync('public/student-teacher-palette.css','utf8');
const index=readFileSync('index.html','utf8');

describe('student page matches teacher color palette only',()=>{
  it('loads the palette after the existing student redesign',()=>{
    expect(index).toContain('/student-teacher-palette.css');
    expect(index.indexOf('/student-teacher-palette.css')).toBeGreaterThan(index.indexOf('/student-redesign-safe-v1.css'));
  });

  it('uses the teacher blue palette for the student surface',()=>{
    expect(css).toContain('--student-ink:#123a72!important;');
    expect(css).toContain('--student-blue:#168fe6!important;');
    expect(css).toContain('--student-blue-soft:#eef7ff!important;');
    expect(css).toContain('--student-bg:#f6fbff!important;');
    expect(css).toContain('background:linear-gradient(180deg,#e9f7ff 0,#f8fdff 230px,#f6fbff 100%)!important;');
    expect(css).toContain('background:linear-gradient(180deg,#eaf8ff 0%,#b9e7fb 100%)!important;');
  });

  it('keeps layout intact except the requested subject-icon enlargement',()=>{
    expect(css).not.toMatch(/\b(?:position|display|grid-template|gap|top|right|left)\s*:/);
    expect(css).not.toMatch(/content\s*:|url\(|@font-face|animation|transform\s*:/);
  });
});
