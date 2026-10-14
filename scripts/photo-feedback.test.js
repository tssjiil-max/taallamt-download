import {test,expect} from 'vitest';
import {photoFeedback} from '../server/photo-feedback.js';
test('verified estimates receive different encouragement by name and observed progress',()=>{
 expect(photoFeedback({firstName:'أسامة',estimate:{estimatedScore:100,items:[]}})).toMatchObject({level:'excellent',text:expect.stringContaining('ممتاز يا أسامة')});
 expect(photoFeedback({firstName:'أسامة',estimate:{estimatedScore:75,items:[]},previousScore:50})).toMatchObject({level:'good',text:expect.stringContaining('تقدّمت')});
 expect(photoFeedback({firstName:'أسامة',estimate:{estimatedScore:40,items:[]}}).text).not.toContain('ممتاز');
});
test('unreadable or unapproved answers never receive an academic praise label',()=>{
 for(const estimate of [null,{estimatedScore:null,items:[{status:'needs_review'}]},{estimatedScore:null,items:[{status:'no_approved_key'}]}]){
 const result=photoFeedback({firstName:'أسامة',estimate});expect(['excellent','good']).not.toContain(result.level);expect(result.text).toContain('أسامة');
 }
 expect(photoFeedback({firstName:'أسامة',quality:{status:'needs_clearer_photo'}}).text).toContain('ورقة واحدة');
});
