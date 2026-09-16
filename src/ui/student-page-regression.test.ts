import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const css=readFileSync('public/student-profile-refine.css','utf8');
const patch=readFileSync('public/student-style-patch.js','utf8');
const interactions=readFileSync('public/student-interactions.js','utf8');

describe('student page regression guards',()=>{
  it('keeps the four subject cards inside the mobile viewport',()=>{
    expect(css).toContain('grid-template-columns:repeat(4,minmax(0,1fr))');
    expect(css).toContain('.student .studentSubject{min-width:0');
    expect(css).toContain('.student .studentSubject .studentSubjectMascot{max-width:100%');
  });

  it('gives student info and more-menu items real destinations',()=>{
    for(const kind of ['hobbies','goals','achievements','skills','settings']){
      expect(patch).toContain(`if(kind==='${kind}')`);
    }
    expect(patch).toContain('bindStudentInfoCards');
    expect(patch).not.toContain("label==='صورتي'?openStudentPanel('photo'):toast('لا توجد بيانات متاحة حاليًا')");
  });

  it('does not hijack the More navigation before its real panel opens',()=>{
    expect(interactions).not.toContain("if(text!=='المزيد')return");
  });
});
