(()=>{
  const originalFetch=window.fetch.bind(window);
  const STUDENT_PATH=location.pathname.startsWith('/student');
  const TEACHER_MATCH=location.pathname.match(/^\/teacher\/student\/(s2-4-\d{2})\/?$/);

  async function accessPost(studentId,action,payload={}){
    const response=await originalFetch('/api/student-state',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId,action,...payload})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.ok){const error=new Error(data.error||`HTTP_${response.status}`);error.code=data.error||`HTTP_${response.status}`;throw error;}
    return data;
  }

  function installStyle(){
    if(document.getElementById('student-access-guard-style'))return;
    const style=document.createElement('style');style.id='student-access-guard-style';style.textContent=`
      html.studentAccessPending #root{visibility:hidden!important}
      .studentAccessGate{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:22px;background:#f4f9fd;direction:rtl;font-family:inherit}
      .studentAccessGateCard{width:min(420px,94vw);background:#fff;border:1px solid #dceaf4;border-radius:22px;padding:24px 20px;text-align:center;box-shadow:0 10px 34px rgba(37,91,126,.12);color:#244c75}
      .studentAccessGateCard h2{margin:0 0 10px;color:#1475bd;font-size:22px}.studentAccessGateCard p{margin:0;line-height:1.8;font-size:14px;color:#5f7890}
      .guardianShareButton{display:block;width:calc(100% - 28px);margin:0 14px 12px;min-height:46px;border:0;border-radius:13px;background:#168fe6;color:#fff;font-weight:900;font-size:14px;box-shadow:0 4px 12px rgba(22,143,230,.18)}
      .guardianShareButton:disabled{opacity:.55}
    `;document.head.appendChild(style);
  }
  function gate(title,message){
    document.querySelector('.studentAccessGate')?.remove();
    const wrap=document.createElement('div');wrap.className='studentAccessGate';
    const card=document.createElement('section');card.className='studentAccessGateCard';
    const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.textContent=message;
    card.append(h,p);wrap.appendChild(card);document.body.appendChild(wrap);
  }

  if(STUDENT_PATH){
    const params=new URLSearchParams(location.search),studentId=params.get('studentId')||'',invite=params.get('invite')||'';
    if(!studentId)return;
    installStyle();document.documentElement.classList.add('studentAccessPending');
    if(!invite){gate('الرابط غير صالح','استخدم رابط الطالب المرسل من المعلم.');return;}

    window.fetch=async(input,init)=>{
      const method=String(init?.method||((typeof Request!=='undefined'&&input instanceof Request)?input.method:'GET')||'GET').toUpperCase();
      let parsed=null;
      try{parsed=new URL(typeof input==='string'||input instanceof URL?String(input):input.url,location.origin);}catch{}
      if(method==='GET'&&parsed?.pathname==='/api/student-state'){
        parsed.searchParams.set('guardianAccess','1');
        parsed.searchParams.set('inviteToken',invite);
        const response=await originalFetch(parsed.pathname+parsed.search,init);
        if(response.ok){
          document.documentElement.classList.remove('studentAccessPending');
          document.querySelector('.studentAccessGate')?.remove();
        }else if(response.status===403){
          gate('الرابط غير صالح','اطلب من المعلم مشاركة رابط الطالب الصحيح مرة أخرى.');
        }else{
          gate('تعذر تحميل البيانات','حاول فتح الصفحة مرة أخرى بعد قليل.');
        }
        return response;
      }
      return originalFetch(input,init);
    };
  }

  if(TEACHER_MATCH){
    installStyle();const studentId=TEACHER_MATCH[1];
    const installShare=()=>{
      const admin=document.querySelector('.teacherStudentAdmin');if(!admin||admin.querySelector('[data-guardian-share]'))return false;
      const card=admin.querySelector('.tsaStudentCard');if(!card)return false;
      const button=document.createElement('button');button.type='button';button.className='guardianShareButton';button.dataset.guardianShare='true';button.textContent='مشاركة رابط الطالب';
      card.insertAdjacentElement('afterend',button);
      button.addEventListener('click',async()=>{
        button.disabled=true;const oldText=button.textContent;button.textContent='جارٍ تجهيز الرابط...';
        try{
          const data=await accessPost(studentId,'access_share',{});
          const invite=String(data.inviteToken||'');
          if(!invite)throw new Error('ACCESS_INVITE_MISSING');
          const url=`${location.origin}/student?studentId=${encodeURIComponent(studentId)}&invite=${encodeURIComponent(invite)}`;
          const shareData={title:'متابعة الطالب',text:'رابط متابعة الطالب في تعلّمت',url};
          if(navigator.share){try{await navigator.share(shareData);}catch(error){if(error?.name!=='AbortError')throw error;}}
          else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);alert('تم نسخ رابط الطالب.');}
          else{window.prompt('انسخ رابط الطالب:',url);}
          button.textContent='مشاركة رابط الطالب';
        }catch{
          alert('تعذر تجهيز رابط الطالب الآن. حاول مرة أخرى.');
          button.textContent=oldText;
        }finally{button.disabled=false;}
      });
      return true;
    };
    if(!installShare()){const observer=new MutationObserver(()=>{if(installShare())observer.disconnect();});observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});}
  }
})();
