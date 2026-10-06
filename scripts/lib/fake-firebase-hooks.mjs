// Node module hook: resolves the firebase-admin entry points to the in-memory stand-in (regression scripts only).
const target=new URL('./fake-firestore.mjs',import.meta.url).href;
export async function resolve(specifier,context,nextResolve){
  if(/^firebase-admin\/(app|firestore|storage)$/.test(specifier))return {url:target,shortCircuit:true};
  return nextResolve(specifier,context);
}
