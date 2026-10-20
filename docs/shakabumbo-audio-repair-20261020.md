# Shakabumbo audio repair — 2026-10-20

Base: bf378a44891e5de426ec142ba7f01e290e1c7d70, chatgpt/groq-preview-smoke-20261020.
Repair branch: fix/shakabumbo-audio-20261020. PR #12. Preview only.

## Proven failures

1. Original published /api/student-state action shakabumbo_speech returned HTTP 404 PILOT_NOT_AVAILABLE. The reference branch was absent from the pilot allowlist; no Groq request occurred.
2. Authorizing the isolated repair branch exposed upstream HTTP 400. Live diagnostic response: {"error":"GROQ_SPEECH_UNAVAILABLE","upstreamStatus":400,"providerCode":"model_terms_required"}. The Groq organization administrator must accept the Orpheus Arabic Saudi model terms. The agent has not accepted them or upgraded any plan.
3. VoiceSession previously declared speaking before playback and listening before recognition onstart. These are now generating-audio and requesting-permission; actual events alone advance states.
4. Provider accepts at most 200 characters, while old code sent 240. Text is now split by words without deleting vowel marks.

## Changes

- server/learning-pilot.js: explicitly allow isolated repair branch; Production/unrelated branches remain denied.
- api/student-state.js and server/shakabumbo-speech.js: existing function routes to testable server-only Groq adapter; preview guard, lesson authorization, safe provider code, timeouts, 200-character limit, WAV RIFF/WAVE validation.
- src/app/shakabumbo/remote-speech.ts and speak.ts: Web Audio unlocked directly in image tap, chunk generation, decoding, fallback HTML audio only for the same Groq WAV, abort/URL/resource cleanup. No silent fallback to old device/Nabra voice in the remote lesson path.
- ShakabumboCompanion.tsx: unlock audio in user gesture; original visual unchanged.
- VoiceSession/ShakabumboChat: truthful phases, microphone startup timeout, friendly errors, one owner, close/mute cancellation.
- server/shakabumbo-model.js: tutor limited to Arabic, spelling, handwriting; Quran remains excluded.
- vercel.json: auto-deploy this repair branch only in addition to existing branches.
- Tests: provider failures/auth/config/invalid WAV, lifecycle phases/retry/permission timeout, long Arabic chunks/vowels, autoplay rejection, Blob URL cleanup.

## Engines and configuration

Brain: Cloudflare Workers AI @cf/qwen/qwen3-30b-a3b-fp8 using authorized published lesson context, not answer keys. Verified live question about tanween receives a lesson-specific reply.
TTS: Groq canopylabs/orpheus-arabic-saudi, voice sultan, WAV. It is configured but BLOCKED by model_terms_required. No successful generated audio or intelligibility claim.
STT: browser SpeechRecognition ar-SA, sequential turn-taking; device/browser availability varies.
GROQ_API_KEY presence verified from metadata only. SHAK_MODEL_URL and SHAK_SERVICE_TOKEN copied to the exact repair Preview branch without logging secret values. Production settings were not modified.

## Verification and limits

137 Vitest tests (21 files) + 30 learning-core Node tests passed, followed by two additional lifecycle tests passing (26 total lifecycle tests). Full build, 37 API tests and TypeScript passed. Browser reproduces provider failure and verifies generating-audio rather than false speaking state. Opening/closing was tested through UI.

No physical Android Chrome device is available. No real microphone three-round conversation, generated WAV playback, auditory quality, kasratayn pronunciation or full conversation acceptance can pass while the provider refuses generation. Unit/integration simulations do not substitute for those checks.

Activation URL: https://console.groq.com/playground?model=canopylabs/orpheus-arabic-saudi
Only the account owner can accept the binding model terms. No paid plan/card/subscription was added. Free quota is limited and not unlimited usage. After activation, repeat speech API, file decode, browser playback and three-round microphone acceptance on the Samsung phone before approving the release.
