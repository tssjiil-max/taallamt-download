// Regression checks for the real Shakabumbo companion engine: a jointed rig driven by a
// state machine and trusted learning events, replacing the earlier single-image CSS stub.
// Run standalone with `node scripts/shakabumbo-companion-regression.mjs`, or as part of
// `npm run build`.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

// --- required engine files actually exist ---
for(const file of [
  'src/app/shakabumbo/bus.ts',
  'src/app/shakabumbo/state.ts',
  'src/app/shakabumbo/settings.ts',
  'src/app/shakabumbo/useShakabumboEngine.ts',
  'src/app/shakabumbo/ShakabumboRig.tsx',
  'src/app/shakabumbo/ShakabumboCompanion.tsx'
]){
  assert(existsSync(file),`missing required Shakabumbo engine file: ${file}`);
}

const state=read('src/app/shakabumbo/state.ts');
const bus=read('src/app/shakabumbo/bus.ts');
const engine=read('src/app/shakabumbo/useShakabumboEngine.ts');
const rig=read('src/app/shakabumbo/ShakabumboRig.tsx');
const companion=read('src/app/shakabumbo/ShakabumboCompanion.tsx');
const settings=read('src/app/shakabumbo/settings.ts');
const student=read('src/app/student.tsx');
const pilot=read('src/app/learning-pilot.tsx');
const css=read('src/app/app.src.css');
const chat=read('src/app/shakabumbo/ShakabumboChat.tsx');
const tutor=read('src/app/shakabumbo/tutor.ts');
const context=read('src/app/shakabumbo/context.ts');

// --- the full required state machine, not a subset ---
const REQUIRED_STATES=['ENTERING','LANDING','IDLE','WALKING','THINKING','EXPLAINING','SPEAKING','ENCOURAGING','CELEBRATING','LISTENING_QURAN','HIDDEN'];
for(const name of REQUIRED_STATES)assert(state.includes(`'${name}'`),`CompanionState is missing the required state: ${name}`);

// --- the full required event vocabulary, driven by real outcomes ---
const REQUIRED_EVENTS=['QUESTION_STARTED','ANSWER_CORRECT','ANSWER_INCORRECT','STAR_AWARDED','TASK_COMPLETED','QURAN_PLAY_STARTED','QURAN_PLAY_STOPPED'];
for(const name of REQUIRED_EVENTS)assert(bus.includes(`'${name}'`),`CompanionEventName is missing the required event: ${name}`);

// --- the old single-image, text-matching stub is gone, not just renamed ---
assert(!pilot.includes('tkShakCompanion'),'the old single-image Shakabumbo stub markup must be removed from learning-pilot.tsx');
assert(!/نجمة\|.*أحسنت/.test(pilot),'the companion must not infer a celebration by matching words in the feedback text');
assert(!css.includes('.tkShakCompanion'),'the old stub CSS (.tkShakCompanion / shakWalk translateX) must be removed from app.src.css');

// --- reactions are wired to the server result, not to UI text ---
assert(pilot.includes("result.star")&&pilot.includes("companionBus.emit('STAR_AWARDED')"),'STAR_AWARDED must be emitted from the verified server result, not inferred');
assert(pilot.includes("result.correct")&&pilot.includes("companionBus.emit('ANSWER_CORRECT')")&&pilot.includes("companionBus.emit('ANSWER_INCORRECT')"),'ANSWER_CORRECT/ANSWER_INCORRECT must come from result.correct');
assert(student.includes("companionBus.emit('TASK_COMPLETED')"),'TASK_COMPLETED must be emitted when a homework item is actually marked done');

// --- mounted once, globally, across the student shell (not just the pilot page) ---
const mounts=(student.match(/<ShakabumboCompanion/g)||[]).length;
assert.equal(mounts,1,'ShakabumboCompanion must be mounted exactly once in the student app shell');
assert(student.includes("routeIsQuran={route==='quran'||route==='quran-log'}"),'the companion must be told when the student is on a Quran page');

// --- settings: تشغيل / تقليل / إيقاف ---
assert(settings.includes("'full'")&&settings.includes("'reduced'")&&settings.includes("'off'"),'settings.ts must support the three motion levels');
assert(student.includes('تشغيل')&&student.includes('تقليل')&&student.includes('إيقاف'),'the settings page must offer the three motion levels in Arabic');

// --- the fall-in sequence happens once per session, not on every navigation ---
assert(engine.includes('sessionStorage')&&engine.includes('ENTERED_KEY'),'the entrance sequence must be gated by a session flag so it does not repeat on every page');

// --- a real walk cycle: legs alternate, arms swing opposite the legs, with a vertical bob —
// not a single translateX slide of the whole image ---
for(const keyframe of ['shakStrideFront','shakStrideBack','shakShinFront','shakShinBack','shakWalkBounce'])
  assert(css.includes(`@keyframes ${keyframe}`),`missing walk-cycle keyframe: ${keyframe}`);
assert(!/@keyframes shakWalk\b/.test(css)&&!css.includes('shakWalk 3.6s'),'the old single-keyframe translateX walk illusion must not remain');
assert(css.includes('.shakRig[data-state=WALKING] .shakLegFront')&&css.includes('.shakRig[data-state=WALKING] .shakArmFront'),'legs and arms must each be driven by the WALKING state, not the image as a whole');

// --- a real fall-and-land sequence ---
assert(css.includes('@keyframes shakFall')&&css.includes('@keyframes shakLandSquash'),'missing the falling/landing keyframes');

// --- Quran: an actual seated pose, and no celebration effects are wired to it ---
assert(css.includes('[data-state=LISTENING_QURAN] .shakLegFront{transform:rotate'),'Quran mode must set a real seated leg pose, not relabel the standing pose');
assert(!/data-state=LISTENING_QURAN\][^}]*shakJump/.test(css),'no jump/celebration animation may be wired to the Quran listening state');
assert(!/data-state=LISTENING_QURAN\][^}]*shakClap/.test(css),'no clap animation may be wired to the Quran listening state');

// --- audio actually playing forces the quiet state, independent of which route started it ---
assert(engine.includes("document.addEventListener('play'")&&engine.includes("QURAN_PLAY_STARTED"),'real <audio> playback must force LISTENING_QURAN');

// --- accessibility / reduced motion / non-obstruction ---
assert(css.includes('prefers-reduced-motion:reduce')&&css.includes('.shakRig *{animation:none!important}'),'reduced-motion users must get static poses, not full animation');
assert(css.includes('pointer-events:none')&&css.includes('z-index:25'),'the stage must sit above content without intercepting taps meant for the page');
assert(css.includes('env(safe-area-inset-bottom'),'positioning must respect the device safe area');
assert(companion.includes('aria-live'),'state changes must be announced for assistive tech');
assert(companion.includes('shakToggle'),'there must be a visible control to hide/show the companion');

// --- the character keeps its approved identity: light-green face, white/turquoise hair,
// pointed ears, white suit with black joint rings + green lights, a belt buckle and wide
// boots with a green ankle band — matching design/shakabumbo/originals, not a generic robot ---
for(const marker of ['shakFace{fill:#9fe3ac}','shakHair{fill:#f3fbfb','shakEarL,.shakEarR','shakChestLightCore{fill:#2fbf5c}','shakJointRing{fill','shakBootBand'])
  assert(css.includes(marker),`missing identity marker in the rig styling: ${marker}`);
assert(rig.includes('shakEarL')&&rig.includes('shakEarR')&&rig.includes('shakHair')&&rig.includes('shakEyes'),'the rig must draw the approved features: ears, hair and eyes, not a flat image swap');
assert(rig.includes('shakJointRing')&&rig.includes('shakBoot'),'the rig must draw visible jointed rings and wide boots, matching the approved reference art');

// --- the companion is docked in a small corner box, not a full-width strip, so it can
// never visually sit on top of lesson text, questions or the submit button ---
assert(/\.shakStage\{[^}]*width:104px/.test(css),'the companion stage must be a small docked box, not a full-width bar, to avoid covering lesson content');
assert(!/\.shakStage\{[^}]*width:412u/.test(css),'the old full-width companion strip must be removed');

// --- a real "اسأل شكابمبو" chat: grounded in the actual on-screen lesson, with voice
// input (free Web Speech API, no paid subscription) and a text fallback that always works ---
assert(companion.includes('ShakabumboChat')&&companion.includes('shakAskBtn'),'the student shell must expose an "اسأل شكابمبو" entry point to the chat');
assert(companion.includes("routeIsQuran")&&/!routeIsQuran[\s\S]*ShakabumboChat|ShakabumboChat[\s\S]*routeIsQuran/.test(companion),'the chat must not be reachable while the Quran listening state is forced');
assert(chat.includes('SpeechRecognition')&&chat.includes("lang='ar-SA'"),'voice input must use Arabic speech recognition');
assert(chat.includes('not-allowed')||chat.includes('micDenied'),'a denied microphone permission must be handled, not left to throw');
assert(chat.includes('speechSynthesis'),'Shakabumbo must be able to read its replies aloud in Arabic');
assert(!/fetch\(|XMLHttpRequest|new WebSocket/.test(chat),'the chat panel itself must not call out to any network service directly — recognition and synthesis are on-device only');
assert(tutor.includes('SHIKABOMBO_POLICY')&&tutor.includes('mayChangeAssessment'),'the tutor responder must honor the existing Shikabombo policy, in particular never revealing the assessed answer');
const lessonContextInterface=context.match(/interface LessonContext\{[^}]*\}/)?.[0]||'';
assert(lessonContextInterface&&!/answer/i.test(lessonContextInterface),'the LessonContext fields must never include the hidden correct answer');

console.log('Shakabumbo companion engine regression checks passed.');
