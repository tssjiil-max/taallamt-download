import {existsSync,readFileSync} from 'node:fs';

if(!existsSync('public/student-vector-assets.js')){
  console.log('Student vector asset regression skipped: vector swap is not installed on this branch.');
  process.exit(0);
}

const swap=readFileSync('public/student-vector-assets.js','utf8');
const main=readFileSync('src/main.tsx','utf8');
const index=readFileSync('index.html','utf8');

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
  ['student-only guard prevents teacher-page changes',swap.includes("if(!location.pathname.startsWith('/student'))return;")],
  ['student hero and bottom-nav mascot use the main vector asset',swap.includes("'.studentMascotWrap .heroMascot'")&&swap.includes("'.studentNavMascot'")&&swap.includes('/student-assets/vector/student-main-logo.svg')],
  ['student reward uses the star vector asset',swap.includes("'.rewardMascotImage'")&&swap.includes('/student-assets/vector/student-reward-star.svg')],
  ['student profile default uses the profile vector asset without blocking saved photos',swap.includes("'.studentCleanPhotoImage'")&&swap.includes('/student-assets/vector/student-profile.svg')&&swap.includes('photoDataUrl')],
  ['student subject assets use the four vector SVG files',
    swap.includes("'لغتي':'/student-assets/vector/subject-lughati.svg'")&&
    swap.includes("'القرآن الكريم':'/student-assets/vector/subject-quran.svg'")&&
    swap.includes("'الدراسات الإسلامية':'/student-assets/vector/subject-islamic.svg'")&&
    swap.includes("'الإملاء والخط':'/student-assets/vector/subject-writing.svg'")],
  ['vector swap script loads after the existing student visual patch',index.includes('/student-vector-assets.js')&&index.indexOf('/student-vector-assets.js')>index.indexOf('/student-style-patch.js')],
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
