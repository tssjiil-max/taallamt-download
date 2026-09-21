import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const index=readFileSync('index.html','utf8');
const iconPatch=readFileSync('public/student-shakabumbo-icons.js','utf8');

describe('student Shakabumbo icon mapping',()=>{
  it('loads the icon-only patch after the existing student scripts',()=>{
    expect(index).toContain('<script type="module" src="/student-shakabumbo-icons.js"></script>');
    expect(index.indexOf('/student-shakabumbo-icons.js')).toBeGreaterThan(index.indexOf('/student-style-patch.js'));
  });

  it('maps every supplied Shakabumbo SVG to its intended student-page role',()=>{
    for(const asset of [
      '/shakabumbo-icons/01_sourati.svg',
      '/shakabumbo-icons/02_main_logo.svg',
      '/shakabumbo-icons/03_lughati.svg',
      '/shakabumbo-icons/04_imlaa_khatt.svg',
      '/shakabumbo-icons/05_quran.svg',
      '/shakabumbo-icons/06_islamic_studies.svg',
      '/shakabumbo-icons/07_star_of_day.svg',
    ]) expect(iconPatch).toContain(asset);
    expect(iconPatch).toContain("'لغتي':'/shakabumbo-icons/03_lughati.svg'");
    expect(iconPatch).toContain("'الإملاء والخط':'/shakabumbo-icons/04_imlaa_khatt.svg'");
    expect(iconPatch).toContain("'القرآن الكريم':'/shakabumbo-icons/05_quran.svg'");
    expect(iconPatch).toContain("'الدراسات الإسلامية':'/shakabumbo-icons/06_islamic_studies.svg'");
  });

  it('changes image sources only and does not alter layout or application data',()=>{
    expect(iconPatch).not.toMatch(/style\.|className\s*=|innerHTML|localStorage|fetch\(|appendChild|remove\(/);
  });
});
