import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const patch=readFileSync('public/student-style-patch.js','utf8');
const bridge=readFileSync('public/student-automation-bridge.js','utf8');

describe('student stabilization safeguards',()=>{
  it('keeps the visible subject title while replacing only the icon',()=>{
    expect(patch).not.toContain('removeRenderedSubjectTitle(card,subject)');
  });

  it('does not issue a duplicate student automation startup refresh',()=>{
    expect(bridge).not.toContain('setTimeout(()=>void refresh(),700)');
    expect(bridge).toContain('AUTOMATION_REFRESH_THROTTLE_MS');
  });

  it('normalizes accepted student photos to a compact jpeg before saving',()=>{
    expect(patch).toContain("return canvas.toDataURL('image/jpeg'");
    expect(patch).toContain('5 * 1024 * 1024');
  });
});
