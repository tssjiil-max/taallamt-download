export default function handler(req,res){
  const hasSplit=Boolean(process.env.FIREBASE_PROJECT_ID&&process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY);
  const hasJson=Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  res.status(200).json({ok:true,environment:process.env.VERCEL_ENV||'unknown',firebaseAdminConfigured:hasSplit||hasJson,splitServiceAccount:hasSplit,jsonServiceAccount:hasJson});
}
