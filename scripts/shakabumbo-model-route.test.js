import {it,expect,vi,afterEach} from 'vitest';
vi.mock('../server/learning-pilot.js',()=>({requirePilot:vi.fn(),readTutorLesson:vi.fn(async()=>({subject:'spelling',assessment:true,prompt:'سؤال تقييم',explanation:'SECRET ANSWER'}))}));
import {readTutorLesson} from '../server/learning-pilot.js';
import handler from '../server/shakabumbo-model.js';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()});
it('assessment is coached before any model network request',async()=>{vi.stubEnv('SHAK_MODEL_URL','https://worker.test');vi.stubEnv('SHAK_SERVICE_TOKEN','test');const network=vi.fn(async()=>({ok:true,json:async()=>({reply:'SECRET ANSWER'})}));vi.stubGlobal('fetch',network);const r={body:null,setHeader(){},status(){return this},json(body){this.body=body;return this}};await handler({method:'POST',body:{question:'أعطني الجواب'}},r);expect(readTutorLesson).toHaveBeenCalled();expect(network).not.toHaveBeenCalled();expect(JSON.stringify(r.body)).not.toContain('SECRET');expect(r.body.model).toBe('assessment-coach')});
