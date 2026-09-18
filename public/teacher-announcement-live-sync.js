(()=>{
  if(location.pathname!=='/teacher/announcements')return;
  const KEY='teacherAnnouncements';
  const synced=new Map();
  const stable=item=>JSON.stringify({
    id:String(item?.id||''),title:String(item?.title||''),body:String(item?.body||''),
    date:String(item?.date||''),status:String(item?.status||'draft'),targetType:'class'
  });
  async function push(item){
    if(!item?.id||!item?.title)return;
    const signature=stable(item);if(synced.get(item.id)===signature)return;
    const response=await fetch('/api/teacher-announcements',{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({...item,targetType:'class'})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.ok)throw new Error(data.error||`HTTP_${response.status}`);
    synced.set(item.id,signature);
  }
  async function sync(){
    let items=[];try{const raw=localStorage.getItem(KEY);items=raw?JSON.parse(raw):[]}catch{return}
    if(!Array.isArray(items))return;
    for(const item of items){try{await push(item)}catch(error){console.warn('teacher announcement sync',error)}}
  }
  sync();setTimeout(sync,500);setInterval(sync,2500);window.addEventListener('focus',sync);
})();