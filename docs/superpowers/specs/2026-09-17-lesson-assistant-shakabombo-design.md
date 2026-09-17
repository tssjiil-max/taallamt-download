# Lesson Assistant + Shakabombo Design

## Goal
Turn the existing **ابدأ الحصة** action into a full mobile-first lesson workspace for the teacher. The page must use the project's existing timetable/distribution preview, let the teacher control only selected elements such as strategy, and let Shakabombo assist the teacher or answer a student's lesson-related question without changing student records.

## Source of truth
- Current/future lesson resolution uses the existing `GET /api/learning-automation?action=preview` flow.
- The flow already resolves Riyadh date, week, timetable when present, verified fallback schedule when timetable is empty, subject content, lesson, unit/surah, and skill.
- Do not create a parallel timetable, distribution, curriculum collection, or lesson database.
- The current teacher card is hard-coded and may disagree with the automation preview; the new lesson page trusts the automation preview.

## User flow
1. Teacher taps **ابدأ الحصة** from **حصتي الآن**.
2. Route opens `/teacher/lesson` as a full page, not a modal.
3. Page loads lesson context from `learning-automation`.
4. If more than one subject is scheduled, teacher selects the subject. If one subject is scheduled, it is selected automatically.
5. Teacher may choose one optional control: strategy, activity, technology, or time management; or tap **جهّز الحصة لي**.
6. The system builds a concise sequence: warm-up, explain/model, student practice, quick assessment, close. Only relevant evidence is shown.
7. Shakabombo appears as a visual teaching assistant with a short tip for the current step.
8. Teacher can ask Shakabombo a single-turn question or switch to **سؤال طالب**. Quick actions include: simplify, another example, quick question, two-minute activity, advanced-student prompt.

## Shakabombo behavior
- Context sent to the model is limited to subject, unit/surah, lesson, skill, grade/class and the current request.
- It must answer in clear Saudi/standard Arabic suitable for an 8-year-old when the request is from a student.
- It must not invent textbook content that is not supported by the supplied lesson context.
- When the answer requires information outside the available lesson context, it should say briefly that the teacher should clarify or that the question is outside today's lesson.
- Teacher mode may provide pedagogical suggestions: explanation, example, question, activity, differentiation, feedback, or assessment idea.
- No student names are sent automatically. No conversation archive is created.
- No writes to assessments, stars, behavior, values, guardian messages, student profiles, or curriculum data.

## AI integration
- Add one Vercel Function: `POST /api/lesson-assistant`.
- Use Vercel AI SDK `generateText` through AI Gateway.
- Model: `openai/gpt-5.6-luna` for low-latency, high-volume classroom assistance.
- Vercel OIDC may authenticate AI Gateway on deployed previews; local environments may optionally use `AI_GATEWAY_API_KEY`.
- Cap question/context lengths and return a short answer only.
- If AI generation is unavailable, return a controlled error so the lesson page remains usable without Shakabombo generation.

## Lesson planning logic
- Planning is deterministic and immediate so **ابدأ الحصة** does not depend on an AI request.
- Strategy choices are subject-aware and limited to 3–5 options.
- Quran flow differs from Arabic, Islamic studies, spelling and handwriting.
- Technology is optional and appears only when selected.
- Time management appears only when selected and adapts to the known 45-minute session when no other duration is supplied.
- Changing strategy updates the activity/participation wording when necessary without changing lesson or skill.

## UX
- Follow current Taallamt identity: white, sky blue, rounded cards, light shadows, clear Arabic, mobile-first.
- Reuse the existing Shakabombo asset. Do not alter the character.
- Keep one current Shakabombo answer on screen rather than a long chat transcript.
- Avoid scores, readiness percentages, badges, required evidence counts, admin reports, and new bottom-navigation items.

## Explicitly out of scope
- Production deployment.
- New curriculum/timetable data model.
- Full PDF textbook parsing in this iteration.
- Parent/guardian exposure.
- Student-facing standalone AI page.
- Automatic assessment writes.
- Long-term lesson evidence archive.

## Safety stop
If implementation requires a broad migration, production write, new student model, guardian-page modification, or replacement of the timetable/distribution architecture, stop with `IMPLEMENTATION_BLOCKED`.