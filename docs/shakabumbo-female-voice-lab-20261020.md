# Female voice comparison — Preview

The /shakabumbo-demo page adds an isolated comparison panel for lulwa, noura and aisha with the same Arabic text. Each voice has original and modified playback. Original bypasses DSP; modified uses independent pitch 1.04–1.16 and tempo 0.94–1.02 in the existing worker. Current site voice remains Fahad until the user explicitly adopts an original or modified female voice for this browser session only.

Samples are generated on demand, held in memory and sessionStorage with a 24-hour expiration. Slider changes and original/processed comparisons reuse the same WAV. Stop, cancellation and Quran mode abort work; processing remains off the UI thread. No added Vercel function or API key. Server allows only Fahad and the three specified voices, requires Preview and authorized lesson context, validates WAV and exposes safe quota headers only. Greeting uses the authorized roster first name after access checks; client supplied names are ignored.

149 Vitest tests, 30 Node learning-core tests, TypeScript and full build passed before deployment. Includes provider voice validation, no unsupported pitch/speed API fields, trusted-name boundary, session-only explicit adoption, DSP parameter bounds and signal/worker cleanup.

Groq documentation was reviewed: limits apply to the organization; exact account limits depend on account settings. Response quota headers are available for inspection. No paid plan/card/upgrade was added. No unlimited-free guarantee. The lab should generate just three base samples per browser session when all three voices are auditioned; replay and processing use the cached samples. Concurrent separate browsers are not a shared cache.

Real Android Chrome is unavailable. Automated signal tests do not prove Arabic clarity, childlike identity or subjective voice quality. The final voice selection belongs to the user after listening. Do not claim one voice is best without a listening assessment. Browser/runtime and live provider evidence are recorded in PR #12 after deployment.
