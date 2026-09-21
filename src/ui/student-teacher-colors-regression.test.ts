import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const css=readFileSync('public/student-redesign-safe-v1.css','utf8');

describe('student page matches teacher color palette only',()=>{
  it('uses the teacher blue palette for the student surface',()=>{
    expect(css).toContain('--student-ink:#123a72;');
    expect(css).toContain('--student-blue:#168fe6;');
    expect(css).toContain('--student-blue-soft:#eef7ff;');
    expect(css).toContain('--student-bg:#f6fbff;');
    expect(css).toContain('background:linear-gradient(180deg,#e9f7ff 0,#f8fdff 230px,#f6fbff 100%)!important;');
  });

  it('removes the student-only green accent from the stable redesign palette',()=>{
    expect(css).not.toContain('--student-green:#22b881;');
    expect(css).not.toContain('rgba(34,184,129,.08)');
    expect(css).not.toContain('#f4fff9');
  });
});
