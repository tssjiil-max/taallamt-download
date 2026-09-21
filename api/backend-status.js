export default function handler(req,res){
  const hasSplit=Boolean(process.env.FIREBASE_PROJECT_ID&&process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY);
  const hasJson=Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const hasB64=Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_B64);
  const environment=process.env.TAALLAMT_ENV||process.env.VERCEL_ENV||process.env.CONTEXT||'unknown';
  const workspaceId=process.env.TAALLAMT_WORKSPACE_ID?.trim()||'second-4';
  res.status(200).json({
    ok:true,
    environment,
    workspaceId,
    firebaseAdminConfigured:hasSplit||hasJson||hasB64,
    splitServiceAccount:hasSplit,
    jsonServiceAccount:hasJson,
    base64ServiceAccount:hasB64
  });
}
