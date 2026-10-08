import sharp from 'sharp';

const studentSource='public/pwa/shakabumbo-app-icon-source.png';
const teacherSource='public/pwa/teacher-shakabumbo-group.webp';

async function makeIcon(source, output, target, contentScale, background) {
  const inner=Math.max(1, Math.round(target*contentScale));
  const padBefore=Math.floor((target-inner)/2);
  const padAfter=target-inner-padBefore;
  await sharp(source)
    .resize(inner, inner, {
      fit:'contain',
      background
    })
    .extend({
      top:padBefore,
      bottom:padAfter,
      left:padBefore,
      right:padAfter,
      background
    })
    .png({compressionLevel:9, palette:true, colours:128})
    .toFile(output);
}

async function buildRole(prefix, source, background) {
  await makeIcon(source, `public/pwa/${prefix}-icon-192.png`, 192, 0.74, background);
  await makeIcon(source, `public/pwa/${prefix}-icon-512.png`, 512, 0.74, background);
  await makeIcon(source, `public/pwa/${prefix}-icon-maskable-512.png`, 512, 0.60, background);
  await makeIcon(source, `public/pwa/${prefix}-apple-touch-icon.png`, 180, 0.74, background);
}

await buildRole('student', studentSource, {r:246,g:248,b:251,alpha:1});
await buildRole('teacher', teacherSource, {r:224,g:244,b:255,alpha:1});

console.log('PWA icons generated from permanent tracked sources with protected safe margins.');
