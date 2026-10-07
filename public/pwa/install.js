(()=>{
 const role=location.pathname.startsWith('/student')?'student':'teacher';
 const name=role==='student'?'تعلّمت':'تعلّمت — المعلم';
 function link(rel,href){const e=document.createElement('link');e.rel=rel;e.href=href;document.head.append(e);}
 const access=new URLSearchParams();const query=new URLSearchParams(location.search);for(const key of ['studentId','invite','inviteToken'])if(query.has(key))access.set(key,query.get(key));
 link('manifest',role==='student'&&access.has('studentId')?'/api/student-state?view=pwa-manifest&'+access.toString():`/pwa/${role}.webmanifest`);link('apple-touch-icon',`/pwa/${role}-180.png`);link('icon',`/pwa/${role}-32.png`);
 for(const [n,v] of [['apple-mobile-web-app-capable','yes'],['apple-mobile-web-app-title',name],['theme-color','#c9e9fe']]){const e=document.createElement('meta');e.name=n;e.content=v;document.head.append(e);}
 let promptEvent=null,button;
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;if(button&&!standalone())button.hidden=false;});
 window.addEventListener('appinstalled',()=>{promptEvent=null;if(button)button.hidden=true;});
 document.addEventListener('DOMContentLoaded',()=>{
  const wrap=document.createElement('aside');wrap.dir='rtl';wrap.style.cssText='text-align:center;padding:8px 12px;color:#245779;font:16px sans-serif;margin-bottom:100px';
  button=document.createElement('button');button.textContent='تثبيت التطبيق';button.hidden=standalone();button.style.cssText='border:1px solid #92c9e9;border-radius:16px;background:#e8f6ff;color:#165f96;padding:12px 24px;min-height:44px;font:inherit;cursor:pointer';
  const notice=document.createElement('p');notice.hidden=true;notice.setAttribute('role','status');
  button.onclick=async()=>{
   if(promptEvent){const e=promptEvent;promptEvent=null;await e.prompt();await e.userChoice;return;}
   notice.hidden=false;const ua=navigator.userAgent;
   notice.textContent=/iPhone|iPad|iPod/.test(ua)?'للتثبيت: افتح الصفحة في Safari، ثم مشاركة، ثم إضافة إلى الشاشة الرئيسية.':/WhatsApp|FBAN|FBAV|Instagram/.test(ua)?'افتح الرابط في Chrome أو Safari من قائمة المتصفح، ثم اختر تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية.':'من قائمة المتصفح اختر تثبيت التطبيق. إذا لم يظهر الخيار، افتح الرابط في Chrome وانتظر اكتمال تحميل الصفحة.';
  };
  function online(){if(!navigator.onLine){notice.hidden=false;notice.textContent='أنت غير متصل بالإنترنت. لا يمكن تأكيد حفظ رسالة أو تقييم حتى يعود الاتصال.';}else{notice.hidden=true;notice.textContent='';}}
  window.addEventListener('offline',online);window.addEventListener('online',online);online();wrap.append(button,notice);document.body.append(wrap);
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/pwa/sw.js',{scope:'/',updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});
 });
})();
