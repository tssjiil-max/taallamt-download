const teacherSubjectStickerMap = {
  'لغتي': 'https://raw.githack.com/tssjiil-max/taallamt-download/feature/student-teacher-staging-20261003/staging-site/teacher-subject-stickers/lughati.svg',
  'القرآن الكريم': 'https://raw.githack.com/tssjiil-max/taallamt-download/feature/student-teacher-staging-20261003/staging-site/teacher-subject-stickers/quran.svg',
  'الدراسات الإسلامية': 'https://raw.githack.com/tssjiil-max/taallamt-download/feature/student-teacher-staging-20261003/staging-site/teacher-subject-stickers/islamic.svg',
  'الإملاء والخط': 'https://raw.githack.com/tssjiil-max/taallamt-download/feature/student-teacher-staging-20261003/staging-site/teacher-subject-stickers/handwriting.svg',
};

function applyTeacherSubjectStickers() {
  const teacher = document.querySelector('.teacher');
  if (!teacher) return false;

  teacher.querySelectorAll('.courseProgress').forEach((row) => {
    const label = row.querySelector('b')?.textContent?.trim();
    const src = label ? teacherSubjectStickerMap[label] : undefined;
    const image = row.querySelector('img.subjectIcon');
    if (!src || !image) return;
    image.src = src;
    image.alt = label;
    image.removeAttribute('aria-hidden');
    image.classList.add('teacherSubjectSticker');
  });

  const currentLessonHeading = teacher.querySelector('.lessonDetails h3');
  if (currentLessonHeading) {
    const label = currentLessonHeading.textContent?.trim();
    const src = label ? teacherSubjectStickerMap[label] : undefined;
    const image = currentLessonHeading.querySelector('img.subjectIcon');
    if (src && image) {
      image.src = src;
      image.alt = label;
      image.removeAttribute('aria-hidden');
      image.classList.add('teacherSubjectSticker', 'teacherCurrentSubjectSticker');
    }
  }

  return true;
}

if (!applyTeacherSubjectStickers()) {
  const observer = new MutationObserver(() => {
    if (applyTeacherSubjectStickers()) observer.disconnect();
  });
  observer.observe(document.documentElement, {childList: true, subtree: true});
  window.setTimeout(() => observer.disconnect(), 5000);
}
