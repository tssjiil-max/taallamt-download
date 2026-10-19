export type CompanionState=
  |'ENTERING'      // falls in from the top of the screen
  |'LANDING'       // absorbs the landing, knees bend, a small bounce
  |'IDLE'          // stands, breathes, glances around
  |'WALKING'       // real walk cycle along the bottom edge
  |'THINKING'      // hand on head
  |'EXPLAINING'    // points at the question
  |'SPEAKING'      // mouth moves with the read-aloud audio
  |'ENCOURAGING'   // calm smile/support after a wrong try, or a clap after a right one
  |'CELEBRATING'   // jump + clap for a verified star or a finished task
  |'LISTENING_QURAN' // sits, quiet, no jumping or clapping
  |'HIDDEN';       // minimized by the student/guardian

export const AMBIENT_STATES:ReadonlySet<CompanionState>=new Set(['IDLE','WALKING']);
export const QURAN_SAFE_STATES:ReadonlySet<CompanionState>=new Set(['LISTENING_QURAN','HIDDEN']);
