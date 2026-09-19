(()=>{
  const nativeFetch=window.fetch.bind(window);
  const CACHE_MS=5000;
  const ERROR_CACHE_MS=2000;
  const cache=new Map();
  const inflight=new Map();

  const parseUrl=input=>{
    try{return new URL(typeof input==='string'||input instanceof URL?String(input):input.url,location.origin)}catch{return null}
  };
  const methodOf=(input,init)=>String(init?.method||((typeof Request!=='undefined'&&input instanceof Request)?input.method:'GET')||'GET').toUpperCase();
  const toResponse=record=>new Response(record.body,{status:record.status,statusText:record.statusText,headers:record.headers});
  const clearStateCache=()=>cache.clear();

  window.fetch=async(input,init)=>{
    const url=parseUrl(input),method=methodOf(input,init);
    if(!url)return nativeFetch(input,init);

    if(method!=='GET'){
      const response=await nativeFetch(input,init);
      if(['/api/student-state','/api/homework-complete','/api/star-adjust','/api/student-evaluation'].includes(url.pathname))clearStateCache();
      return response;
    }

    if(url.pathname!=='/api/student-state')return nativeFetch(input,init);

    const key=`${url.pathname}${url.search}`;
    const cached=cache.get(key);
    if(cached&&cached.expiresAt>Date.now())return toResponse(cached);
    if(cached)cache.delete(key);

    if(inflight.has(key))return toResponse(await inflight.get(key));

    const pending=(async()=>{
      const response=await nativeFetch(input,init);
      const body=await response.text();
      const headers={};response.headers.forEach((value,name)=>{headers[name]=value});
      const record={body,status:response.status,statusText:response.statusText,headers,expiresAt:Date.now()+(response.ok?CACHE_MS:ERROR_CACHE_MS)};
      cache.set(key,record);
      return record;
    })();
    inflight.set(key,pending);
    try{return toResponse(await pending)}finally{inflight.delete(key)}
  };
})();
