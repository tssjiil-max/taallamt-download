export function isVisibleAnnouncement(item,classId,now=new Date().toISOString()){
  return item.status==='published'&&(!item.classId||item.classId===classId)&&(!item.expiresAt||Date.parse(item.expiresAt)>Date.parse(now));
}
export function visibleAnnouncements(items,classId,reads={},now=new Date().toISOString()){
  const visible=items.filter(item=>isVisibleAnnouncement(item,classId,now)).sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||String(b.date||b.updatedAt||'').localeCompare(String(a.date||a.updatedAt||''))).map(item=>({id:item.id,title:String(item.title||''),body:String(item.body||''),date:String(item.date||''),updatedAt:String(item.updatedAt||''),pinned:item.pinned===true,hasImage:Boolean(item.imageDataUrl),read:Boolean(reads[item.id])}));
  return {items:visible,unread:visible.filter(item=>!item.read).length};
}
