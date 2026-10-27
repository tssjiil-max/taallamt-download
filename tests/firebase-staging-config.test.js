import {it,expect} from 'vitest';
import {stagingHostingConfig} from '../scripts/prepare-firebase-staging.mjs';
it('targets only the separate staging site and pins API with static resources for rollback',()=>{
 const c=stagingHostingConfig('europe-west1');
 expect(c.hosting.site).toBe('taallamt-988e6-staging');
 expect(c.hosting.rewrites[0]).toEqual({source:'/api/**',run:{serviceId:'taallamt-api-staging',region:'europe-west1',pinTag:true}});
 expect(c.hosting.rewrites.at(-1)).toEqual({source:'**',destination:'/index.html'});
 expect(()=>stagingHostingConfig('')).toThrow();expect(()=>stagingHostingConfig('region; deploy')).toThrow();
 expect(c).not.toHaveProperty('firestore');expect(c).not.toHaveProperty('functions');
});
