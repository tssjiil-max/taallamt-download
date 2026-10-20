import {it,expect,vi,afterEach} from 'vitest';
import {passwordlessTeacherPreview,sessionStatus,requireTeacher} from '../server/access.js';
afterEach(()=>vi.unstubAllEnvs());
function enable(){vi.stubEnv('VERCEL_ENV','preview');vi.stubEnv('VERCEL_GIT_COMMIT_REF','fix/shakabumbo-audio-20261020');vi.stubEnv('TEACHER_PREVIEW_PASSWORDLESS','enabled')}
it('only explicitly enabled preview opens the teacher page',()=>{enable();expect(passwordlessTeacherPreview()).toBe(true);expect(sessionStatus({headers:{}}).teacher).toBe(true);expect(requireTeacher({headers:{}})).toBe(true)});
it('production never uses passwordless preview',()=>{enable();vi.stubEnv('VERCEL_ENV','production');expect(passwordlessTeacherPreview()).toBe(false)});
it('another branch remains protected',()=>{enable();vi.stubEnv('VERCEL_GIT_COMMIT_REF','main');expect(passwordlessTeacherPreview()).toBe(false)});
it('still rejects cross-origin teacher writes',()=>{enable();expect(()=>requireTeacher({headers:{host:'preview.test',origin:'https://other.test'}},{write:true})).toThrow('ORIGIN_INVALID')});
