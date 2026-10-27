// Generates a reviewable config; never authenticates, creates cloud resources or deploys.
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export function stagingHostingConfig(region){
 if(!/^[a-z]+(?:-[a-z]+)+[0-9]$/.test(String(region||'')))throw new Error('VERIFIED_CLOUD_RUN_REGION_REQUIRED');
 const config=JSON.parse(readFileSync(new URL('../deployment/firebase.staging.template.json',import.meta.url),'utf8'));
 config.hosting.site='taallamt-988e6-staging';
 config.hosting.rewrites[0].run={serviceId:'taallamt-api-staging',region,pinTag:true};
 config.hosting.headers.push({source:'**',headers:[{key:'Cache-Control',value:'no-cache, max-age=0, must-revalidate'}]});
 return config;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const config=stagingHostingConfig(process.argv[2]);
 const target=new URL('../firebase.staging.generated.json',import.meta.url);
 writeFileSync(target,JSON.stringify(config,null,2)+'\n');
 console.log('Generated staging-only Hosting config for taallamt-988e6-staging. No resources created or deployed.');
}
