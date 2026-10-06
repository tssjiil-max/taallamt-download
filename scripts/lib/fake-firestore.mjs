// In-memory stand-in for the subset of firebase-admin this project uses. For regression scripts only.
// It keeps the real behaviours that matter: undefined values are rejected and range filters need care.
const store=globalThis.__FAKE_STORE__||(globalThis.__FAKE_STORE__=new Map());
const stats=globalThis.__FAKE_STATS__||(globalThis.__FAKE_STATS__={reads:0,writes:0,queries:0});
const clone=value=>structuredClone(value);
function assertNoUndefined(value,path){
  if(value===undefined)throw new Error(`Cannot use "undefined" as a Firestore value (found in field "${path}").`);
  if(Array.isArray(value))value.forEach((item,index)=>assertNoUndefined(item,`${path}[${index}]`));
  else if(value&&typeof value==='object')for(const [key,item] of Object.entries(value))assertNoUndefined(item,path?`${path}.${key}`:key);
}
function setDoc(path,data,options){
  if(path.split('/').length%2!==0)throw new Error('Invalid document path: '+path);
  for(const [key,value] of Object.entries(data))assertNoUndefined(value,key);
  const previous=options?.merge?store.get(path)||{}:{};
  store.set(path,{...previous,...clone(data)});stats.writes++;
}
class DocSnap{constructor(path,data){this.id=path.split('/').pop();this.ref=docRef(path);this._data=data;this.exists=data!==undefined}data(){return this._data===undefined?undefined:clone(this._data)}}
function docRef(path){return {path,id:path.split('/').pop(),get:async()=>{stats.reads++;return new DocSnap(path,store.get(path))},set:async(data,options)=>setDoc(path,data,options),delete:async()=>{store.delete(path);stats.writes++}}}
const compare=(value,op,expected)=>{
  if(op==='==')return value===expected;
  if(value===undefined||value===null)return false;
  if(op==='>=')return value>=expected;if(op==='>')return value>expected;if(op==='<=')return value<=expected;if(op==='<')return value<expected;
  if(op==='in')return expected.includes(value);
  throw new Error('unsupported operator '+op);
};
function query(collectionPath,filters=[],fields=null){
  if(collectionPath.split('/').length%2!==1)throw new Error('Invalid collection path: '+collectionPath);
  return {
    where:(field,op,value)=>{if(value===undefined)throw new Error('where() value undefined for '+field);return query(collectionPath,[...filters,[field,op,value]],fields)},
    select:(...names)=>query(collectionPath,filters,names),
    doc:id=>docRef(`${collectionPath}/${id}`),
    get:async()=>{
      stats.queries++;
      const ranges=new Set(filters.filter(filter=>filter[1]!=='=='&&filter[1]!=='in').map(filter=>filter[0]));
      if(ranges.size>1)throw new Error('FAKE_FIRESTORE: range filters on several fields need a composite index');
      if(ranges.size&&filters.some(filter=>filter[1]==='=='))throw new Error('FAKE_FIRESTORE: equality + range on different fields needs a composite index');
      const docs=[];
      for(const [path,data] of store){
        if(!path.startsWith(collectionPath+'/')||path.slice(collectionPath.length+1).includes('/'))continue;
        if(!filters.every(([field,op,value])=>compare(data[field],op,value)))continue;
        let visible=data;if(fields){visible={};for(const name of fields)if(name in data)visible[name]=data[name]}
        docs.push(new DocSnap(path,visible));stats.reads++;
      }
      return {docs,size:docs.length,empty:!docs.length};
    }
  };
}
const db={
  doc:docRef,collection:query,
  batch(){const operations=[];return {
    set(ref,data,options){operations.push([ref.path,data,options]);return this},
    delete(ref){operations.push([ref.path,null]);return this},
    commit:async()=>{if(operations.length>500)throw new Error('FAKE_FIRESTORE: batch larger than 500 writes');for(const [path,data,options] of operations){if(data===null){store.delete(path);stats.writes++}else setDoc(path,data,options)}}
  }},
  runTransaction:async fn=>fn({get:ref=>ref.get(),set:(ref,data,options)=>setDoc(ref.path,data,options),update:(ref,data)=>setDoc(ref.path,data,{merge:true}),delete:ref=>store.delete(ref.path)})
};
export const getFirestore=()=>db;
export const fakeStore=store;
export const fakeStats=stats;
// firebase-admin/app
export const cert=value=>value;
export const getApps=()=>[{name:'fake'}];
export const initializeApp=()=>({name:'fake'});
// firebase-admin/storage
export const getStorage=()=>({bucket:()=>({file:()=>({save:async()=>{},download:async()=>[Buffer.from('')],delete:async()=>{}})})});
