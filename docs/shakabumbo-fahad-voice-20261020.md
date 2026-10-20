# Fahad processed voice — Preview only

Provider: Groq canopylabs/orpheus-arabic-saudi, voice fahad, response_format wav.
No pitch or speed parameter is sent to Groq.
Client pipeline: WAV decode → worker-based SoundTouchJS 0.3.0 WSOLA stretching/resampling → mono AudioBuffer → Web Audio playback at its default rate.
Independent pitch 1.12 and tempo/speed 0.96. Input padding flushes the filter; output duration is input duration / 0.96. No reverb, echo or device voice fallback. Original educational text/diacritics unchanged. Unsupported processing fails explicitly.
Processing is on a dedicated worker, with abort/termination and 15-second timeout. Existing session cancellation and microphone isolation remain.
Numerical test: 400 Hz tone → approximately 448 Hz; output frames ceil(input frames / 0.96); finite bounded samples. This measures DSP, not Arabic intelligibility.
Full unit/integration tests, TypeScript and build passed before deployment. Physical Android Chrome is not available in this environment; no claim of a real Android test or audited Arabic consonant clarity is made. The user must audition the deployed voice on the Samsung before final approval.
SoundTouchJS is LGPL-2.1; license and source notice are shipped under /licenses/.
