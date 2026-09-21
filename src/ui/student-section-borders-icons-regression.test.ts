import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const css=readFileSync('public/student-teacher-palette.css','utf8');
const quran=readFileSync('public/shakabumbo-icons/05_quran.svg','utf8');

describe('student visual separation and supplied subject icons',()=>{
  it('uses a light blue outline on the main student sections',()=>{
    expect(css).toContain('--student-section-border:#b9dcf4!important;');
    expect(css).toContain('.student .studentSubject{border-color:var(--student-section-border)!important}');
    expect(css).toContain('.student .dayPanel{border-color:var(--student-section-border)!important}');
    expect(css).toContain('.student .miniCards>div{border-color:var(--student-section-border)!important}');
  });

  it('enlarges only the subject mascot icons by about ten percent',()=>{
    expect(css).toContain('width:90px!important;');
    expect(css).toContain('height:84px!important;');
    expect(css).toContain('width:81px!important;');
    expect(css).toContain('height:77px!important;');
  });

  it('keeps the Quran asset as an SVG document with a browser-safe embedded PNG',()=>{
    expect(quran.trimStart().startsWith('<svg')).toBe(true);
    expect(quran).toContain('data:image/png;base64,');
  });
});
