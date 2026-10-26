type Progress={backupId:string;count:number;complete:boolean};
type StorageLike={getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void};
// One explicit user action advances one page. Failures retain the saved ID.
export async function advanceBackup(post:(body:Record<string,unknown>)=>Promise<Progress>,storage:StorageLike,key:string):Promise<Progress>{
 const existing=storage.getItem(key)||'';
 if(existing&&!/^[a-f0-9]{32}$/.test(existing))throw new Error('BACKUP_INVALID');
 // Verify persistence before creating any server-side copy.
 storage.setItem(key,existing);
 const result=await post({action:'backup',...(existing?{backupId:existing}:{})});
 if(!/^[a-f0-9]{32}$/.test(result.backupId)||(existing&&existing!==result.backupId))throw new Error('BACKUP_INVALID');
 storage.setItem(key,result.backupId);
 return result;
}
