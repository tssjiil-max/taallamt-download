import {existsSync,readFileSync} from 'node:fs';

const patch=readFileSync('public/student-style-patch.js','utf8');
const main=readFileSync('src/main.tsx','utf8');

const assets=[
  '/student-assets/vector/student-profile.svg',
  '/student-assets/vector/student-main-logo.svg',
  '/student-assets/vector/student-reward-star.svg',
  '/student-assets/vector/subject-lughati.svg',
  '/student-assets/vector/subject-quran.svg',
  '/student-assets/vector/subject-islamic.svg',
  '/student-assets/vector/subject-writing.svg',
];

const checks=[
  ['student profile uses the vector asset',patch.includes("const SHAKABUMBO_PROFILE='/student-assets/vector/student-profile.svg'")],
  ['student main/logo uses the vector asset',patch.includes("const SHAKABUMBO_MAIN='/student-assets/vector/student-main-logo.svg'")],
  ['student reward uses the vector asset',patch.includes("const SHAKABUMBO_REWARD='/student-assets/vector/student-reward-star.svg'")],
  ['student subject assets use vector SVG files',
    patch.includes("'لغتي':'/student-assets/vector/subject-lughati.svg'")&&
    patch.includes("'القرآن الكريم':'/student-assets/vector/subject-quran.svg'")&&
    patch.includes("'الدراسات الإسلامية':'/student-assets/vector/subject-islamic.svg'")&&
    patch.includes("'الإملاء والخط':'/student-assets/vector/subject-writing.svg'")],
  ['SVG assets are not rasterized through canvas before display',patch.includes("if(/\\.svg(?:$|\\?)/i.test(src))return src;")],
  ['student hero mascot is switched only inside the student patch',patch.includes("student.querySelector('.studentMascotWrap .heroMascot')")&&patch.includes('heroMascot.src=SHAKABUMBO_MAIN')],
  ['shared React mascot source remains unchanged for teacher page safety',main.includes("src={asset('student-assets/student-main-logo.webp')}")],
  ...assets.map(src=>[`vector file exists: ${src}`,existsSync(`public${src}`)]),
];

const failed=checks.filter(([,ok])=>!ok);
if(failed.length){
  console.error('Student vector asset regression checks failed:');
  for(const [name] of failed)console.error(`- ${name}`);
  process.exit(1);
}
console.log(`Student vector asset regression checks passed (${checks.length}/${checks.length}).`);
