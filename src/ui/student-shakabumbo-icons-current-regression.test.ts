import {describe,expect,it} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';

const index=readFileSync('index.html','utf8');

describe('current student page uses supplied Shakabumbo SVG assets',()=>{
  const files=[
    '01_sourati.svg','02_main_logo.svg','03_lughati.svg','04_imlaa_khatt.svg',
    '05_quran.svg','06_islamic_studies.svg','07_star_of_day.svg'
  ];

  it('ships all seven supplied SVG files',()=>{
    for(const file of files){
      expect(existsSync(`public/shakabumbo-icons/${file}`)).toBe(true);
    }
  });

  it('loads the current student icon remap after existing student scripts',()=>{
    expect(index).toContain('/student-shakabumbo-icons.js');
    expect(index.indexOf('/student-shakabumbo-icons.js')).toBeGreaterThan(index.indexOf('/student-display-names.js'));
  });
});
