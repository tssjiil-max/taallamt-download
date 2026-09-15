import {describe,it,expect} from 'vitest';
import fs from 'node:fs';

describe('teacher dashboard routing patch',()=>{
  const interactions=fs.readFileSync('public/teacher-interactions.js','utf8');
  const admin=fs.readFileSync('public/teacher-student-admin.js','utf8');
  it('routes dashboard actions to teacher student workflows',()=>{
    expect(interactions).toContain("toStudents('assessment'");
    expect(interactions).toContain("toStudents('followup'");
    expect(interactions).toContain("toStudents('homework'");
    expect(interactions).toContain("toStudents('behavior'");
  });
  it('preserves requested workflow when a student is opened',()=>{
    expect(admin).toContain("actionToTab");
    expect(admin).toContain("target.set('tab',tab)");
    expect(admin).toContain("selectTab(params.get('tab')||'assessment')");
  });
});
