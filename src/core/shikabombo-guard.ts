export type ShikabomboAction='read_curriculum'|'explain'|'practice'|'encourage'|'change_assessment'|'change_stars'|'change_remediation'|'read_guardian_contact';
const allowed=new Set<ShikabomboAction>(['read_curriculum','explain','practice','encourage']);
export function shikabomboMay(action:ShikabomboAction){return allowed.has(action)}
export function assertShikabomboMay(action:ShikabomboAction){if(!shikabomboMay(action))throw new Error(`Shikabombo action denied: ${action}`)}
