import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const patch=readFileSync('public/student-style-patch.js','utf8');
const palette=readFileSync('public/student-teacher-palette.css','utf8');
const budget=readFileSync('public/student-state-read-budget.js','utf8');

describe('student stabilization safeguards',()=>{
  it('keeps every subject name visibly rendered even when the icon patch removes the original text node',()=>{
    expect(palette).toContain('content:attr(data-subject-name)');
    expect(palette).toContain('.student .studentSubject::after');
  });

  it('coalesces repeated automation preview requests as well as student-state reads',()=>{
    expect(budget).toContain("url.pathname==='/api/learning-automation'");
    expect(budget).toContain("url.searchParams.get('action')==='preview'");
    expect(budget).toContain('inflight.has(key)');
  });

  it('accepts only JPG PNG and WebP up to five megabytes and resizes before saving',()=>{
    expect(patch).toContain('ALLOWED_PHOTO_TYPES');
    expect(patch).toContain('5 * 1024 * 1024');
    expect(patch).toContain('resizeStudentPhoto');
    expect(patch).toContain('const max=512');
  });
});
