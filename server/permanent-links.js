// Never derive shared access URLs from a per-deployment Vercel hostname.
export function guardianShareUrl(studentId,invite,env=process.env){
  const configured=env.STUDENT_PUBLIC_ORIGIN;
  if(!configured)throw new Error('STUDENT_PUBLIC_ORIGIN_REQUIRED');
  const origin=new URL(configured);
  if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('STUDENT_PUBLIC_ORIGIN_INVALID');
  if(!/^s2-4-\d{2}$/.test(studentId)||!/^[A-Za-z0-9_-]{20,200}$/.test(invite))throw new Error('STUDENT_LINK_INVALID');
  const url=new URL('/student',origin);url.searchParams.set('studentId',studentId);url.searchParams.set('invite',invite);
  return url.href;
}
