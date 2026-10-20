import {it,expect,vi,afterEach} from 'vitest';
import {adoptPreviewVoice,readPreviewVoice,PREVIEW_DEFAULT} from './voice-preview-settings';
afterEach(()=>vi.unstubAllGlobals());
it('adoption is explicit and limited to session storage, with a clear original mode',()=>{const data=new Map();vi.stubGlobal('sessionStorage',{getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>data.set(k,v)});expect(readPreviewVoice()).toBeNull();adoptPreviewVoice('noura',{...PREVIEW_DEFAULT,processed:false});expect(readPreviewVoice()).toEqual({voice:'noura',...PREVIEW_DEFAULT,processed:false})});
it('rejects extreme pitch and forged voices',()=>{expect(()=>adoptPreviewVoice('lulwa',{...PREVIEW_DEFAULT,pitch:1.65})).toThrow();expect(()=>adoptPreviewVoice('unknown' as never,PREVIEW_DEFAULT)).toThrow()});
