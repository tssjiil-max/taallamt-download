import {readFileSync} from 'node:fs';

const toml=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8');
if(!toml.includes('to = "/.netlify/functions/api/:splat"')){
  throw new Error('NETLIFY_API_REWRITE_MUST_USE_PATH_SPLAT');
}

process.env.TAALLAMT_ENV='staging';
const {default:handler}=await import('../netlify/functions/api.mts');
const response=await handler(new Request('https://taallamt.test/.netlify/functions/api/backend-status'),{});
const payload=await response.json();
if(response.status!==200||payload?.ok!==true||payload?.environment!=='staging'){
  throw new Error(`NETLIFY_API_PATH_ROUTING_FAILED:${response.status}`);
}

console.log('Netlify API routing regression passed.');
