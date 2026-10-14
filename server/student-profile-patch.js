export function studentProfilePatch(studentId,body,timestamp){
  const photoDataUrl=String(body.photoDataUrl||'').trim();
  if(photoDataUrl&&!/^data:image\/(png|jpeg|webp);base64,/.test(photoDataUrl))throw new Error('PHOTO_INVALID');
  if(photoDataUrl.length>280000)throw new Error('PHOTO_TOO_LARGE');
  const patch={studentId,updatedAt:timestamp};
  if(photoDataUrl)patch.photoDataUrl=photoDataUrl;
  else if(body.removePhoto===true)patch.photoDataUrl='';
  if(body.hobbies!==undefined){
    if(!Array.isArray(body.hobbies))throw new Error('HOBBIES_INVALID');
    const hobbies=[...new Set(body.hobbies.map(x=>String(x||'').trim()).filter(Boolean))].slice(0,12);
    if(hobbies.some(x=>x.length>40))throw new Error('HOBBIES_INVALID');
    patch.hobbies=hobbies;
  }
  return patch;
}
