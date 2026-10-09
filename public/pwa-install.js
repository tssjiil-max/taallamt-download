(function(){
  if(!('serviceWorker' in navigator))return;
  var standalone=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;
  var role=location.pathname.replace(/\/+$/,'').startsWith('/student')?'student':'teacher';
  var key='taallamt_install_prompt_'+role;
  var deferred=null,box=null;
  function seen(){return document.cookie.split(';').some(function(x){return x.trim().indexOf(key+'=1')===0})}
  function remember(){document.cookie=key+'=1; Path=/; Max-Age=31536000; SameSite=Lax'}
  function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)||(/macintosh/i.test(navigator.userAgent)&&navigator.maxTouchPoints>1)}
  function close(mark){if(mark)remember();if(box){box.remove();box=null}}
  function instructions(){
    if(standalone){alert('الصفحة محفوظة بالفعل على الشاشة الرئيسية.');return}
    if(isIOS())alert('في Safari: اضغط زر المشاركة ثم اختر «إضافة إلى الشاشة الرئيسية».');
    else alert('من قائمة المتصفح اختر «إضافة إلى الشاشة الرئيسية» أو «تثبيت التطبيق».');
  }
  async function installNow(){
    if(standalone){instructions();return}
    if(deferred){
      try{deferred.prompt();await deferred.userChoice}catch(e){}
      deferred=null;remember();close(false);return;
    }
    instructions();
  }
  window.taallamtInstallPage=installNow;
  function show(){
    if(!deferred||box||seen()||standalone)return;
    box=document.createElement('div');
    box.setAttribute('dir','rtl');
    box.setAttribute('role','dialog');
    box.setAttribute('aria-label','حفظ تعلّمت على الجوال');
    box.style.cssText='position:fixed;z-index:2147483000;right:14px;left:14px;bottom:18px;max-width:520px;margin:auto;background:#fff;border:1px solid #dbe3ec;border-radius:22px;box-shadow:0 14px 45px rgba(15,35,55,.22);padding:15px;font-family:inherit;color:#16324a';
    var title=document.createElement('div');
    title.innerHTML='<b style="font-size:17px">احفظ «تعلّمت» على جوالك</b><div style="font-size:13px;margin-top:4px;color:#587083">يفتح نفس الموقع من الشاشة الرئيسية وبنفس رابط الطالب.</div>';
    var row=document.createElement('div');row.style.cssText='display:flex;gap:8px;margin-top:12px';
    var install=document.createElement('button');install.type='button';install.textContent='إضافة إلى الشاشة الرئيسية';install.style.cssText='flex:1;border:0;border-radius:14px;padding:11px 12px;background:#156fa8;color:white;font-weight:800;font-size:15px';
    var later=document.createElement('button');later.type='button';later.textContent='لاحقًا';later.style.cssText='border:1px solid #d8e1e9;border-radius:14px;padding:11px 14px;background:#fff;color:#516575;font-weight:700;font-size:14px';
    install.onclick=function(){void installNow()};
    later.onclick=function(){close(true)};
    row.appendChild(install);row.appendChild(later);box.appendChild(title);box.appendChild(row);document.body.appendChild(box);
  }
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;if(!seen())window.setTimeout(show,1200)});
  window.addEventListener('appinstalled',function(){deferred=null;standalone=true;close(true)});
})();
