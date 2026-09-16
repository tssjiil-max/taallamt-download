(()=>{
  const originalFetch=window.fetch.bind(window);
  const STUDENT_PATH=location.pathname.startsWith('/student');
  const TEACHER_MATCH=location.pathname.match(/^\/teacher\/student\/(s2-4-\d{2})\/?$/);
  const tokenKey=(studentId)=>`taallamtGuardianDevice:${studentId}`;
  const inviteKey=(studentId)=>`taallamtGuardianInvite:${studentId}`;

  const randomToken=()=>{
    const bytes=new Uint8Array(24);crypto.getRandomValues(bytes);
    return [...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');
  };
  const deviceLabel=()=>{
    const platform=navigator.userAgentData?.platform||navigator.platform||'';
    return platform?`جهاز ولي الأمر · ${String(platform).slice(0,40)}`:'جهاز ولي الأمر';
  };
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
      .studentAccessRelease{width:100%;min-height:44px;margin-top:10px;border:1px solid #efcaca;border-radius:12px;background:#fff5f5;color:#a13e3e;font-weight:800;font-size:13px}
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
  function accessMessage(code){
    if(code==='ACCESS_DEVICE_LIMIT')return ['تم استخدام الجهازين المسموحين','هذه الصفحة مرتبطة بجهازين فقط. لإضافة جهاز جديد افتحها من أحد الجهازين الحاليين واختر «إلغاء ربط هذا الجهاز».'];
    if(code==='ACCESS_DEVICE_NOT_LINKED')return ['هذا الجهاز غير مرتبط','افتح رابط الطالب الأصلي المرسل من المعلم لربط هذا الجهاز إذا كان هناك مكان متاح.'];
    if(code==='ACCESS_INVITE_INVALID')return ['الرابط غير صالح','اطلب من المعلم مشاركة رابط الطالب الصحيح مرة أخرى.'];
    return ['تعذر فتح صفحة الطالب','تحقق من الرابط والاتصال ثم حاول مرة أخرى.'];
  }

  if(STUDENT_PATH){
    const params=new URLSearchParams(location.search),studentId=params.get('studentId')||'';
    if(!studentId)return;
    installStyle();document.documentElement.classList.add('studentAccessPending');
    let activeAccess=null,resolveReady;const studentAccessReady=new Promise(resolve=>{resolveReady=resolve;});
    window.__taallamtStudentAccessReady=studentAccessReady;
    window.fetch=async(input,init)=>{
      const method=String(init?.method||((typeof Request!=='undefined'&&input instanceof Request)?input.method:'GET')||'GET').toUpperCase();
      let parsed=null;
      try{parsed=new URL(typeof input==='string'||input instanceof URL?String(input):input.url,location.origin);}catch{}
      if(method==='GET'&&parsed?.pathname==='/api/student-state'){
        await studentAccessReady;
        if(!activeAccess)throw new Error('STUDENT_ACCESS_REQUIRED');
        parsed.searchParams.set('guardianAccess','1');parsed.searchParams.set('deviceToken',activeAccess.deviceToken);
        return originalFetch(parsed.pathname+parsed.search,init);
      }
      return originalFetch(input,init);
    };

    const invite=params.get('invite')||'';
    const stored=studentId?localStorage.getItem(tokenKey(studentId))||'':'';
    let deviceToken=stored,created=false;
    (async()=>{
      try{
        let result;
        if(invite){
          if(!deviceToken){deviceToken=randomToken();created=true;localStorage.setItem(tokenKey(studentId),deviceToken);}
          result=await accessPost(studentId,'access_claim',{inviteToken:invite,deviceToken,deviceLabel:deviceLabel()});
          const clean=new URL(location.href);clean.searchParams.delete('invite');history.replaceState({},'',clean.pathname+clean.search+clean.hash);
        }else{
          if(!deviceToken)throw Object.assign(new Error('ACCESS_DEVICE_NOT_LINKED'),{code:'ACCESS_DEVICE_NOT_LINKED'});
          result=await accessPost(studentId,'access_verify',{deviceToken});
        }
        activeAccess={studentId,deviceToken,devicesCount:Number(result.devicesCount)||1,maxDevices:Number(result.maxDevices)||2};
        document.documentElement.classList.remove('studentAccessPending');resolveReady(activeAccess);
      }catch(error){
        if(created&&studentId)localStorage.removeItem(tokenKey(studentId));
        activeAccess=null;resolveReady(null);
        const [title,message]=accessMessage(error?.code||error?.message);gate(title,message);
      }
    })();

    const installRelease=()=>{
      const panel=document.querySelector('.studentPatchModal .studentMorePanel');
      if(!panel||panel.querySelector('[data-student-access-release]'))return;
      const button=document.createElement('button');button.type='button';button.className='studentAccessRelease';button.dataset.studentAccessRelease='true';button.textContent='إلغاء ربط هذا الجهاز';
      button.addEventListener('click',async()=>{
        if(!activeAccess)return;
        if(!confirm('سيتم إلغاء ربط هذا الجهاز بصفحة الطالب، وبعدها يمكن استخدام مكانه لجهاز آخر. هل تريد المتابعة؟'))return;
        button.disabled=true;
        try{
          await accessPost(activeAccess.studentId,'access_release',{deviceToken:activeAccess.deviceToken});
          localStorage.removeItem(tokenKey(activeAccess.studentId));activeAccess=null;
          document.documentElement.classList.add('studentAccessPending');document.querySelector('.studentPatchModal')?.remove();
          gate('تم إلغاء ربط الجهاز','أصبح بإمكان ولي الأمر فتح رابط الطالب من جهاز آخر. هذا الجهاز يحتاج رابط الدعوة من المعلم إذا أردت ربطه مرة أخرى.');
        }catch{button.disabled=false;alert('تعذر إلغاء ربط الجهاز الآن. حاول مرة أخرى.');}
      });
      panel.appendChild(button);
    };
    new MutationObserver(installRelease).observe(document.documentElement,{childList:true,subtree:true});
    installRelease();
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
          let invite=localStorage.getItem(inviteKey(studentId))||'';
          if(!invite){invite=randomToken();localStorage.setItem(inviteKey(studentId),invite);}
          const data=await accessPost(studentId,'access_share',{inviteToken:invite});
          invite=data.inviteToken||invite;localStorage.setItem(inviteKey(studentId),invite);
          const url=`${location.origin}/student?studentId=${encodeURIComponent(studentId)}&invite=${encodeURIComponent(invite)}`;
          const shareData={title:'متابعة الطالب',text:'رابط متابعة الطالب في تعلّمت',url};
          if(navigator.share){try{await navigator.share(shareData);}catch(error){if(error?.name!=='AbortError')throw error;}}
          else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);alert('تم نسخ رابط الطالب.');}
          else{window.prompt('انسخ رابط الطالب:',url);}
          button.textContent=`مشاركة رابط الطالب · ${Number(data.devicesCount)||0}/2 جهاز`;
        }catch(error){
          if(error?.code==='ACCESS_SHARE_FORBIDDEN'){alert('تم إنشاء رابط حماية لهذا الطالب من قبل على جهاز معلم آخر. استخدم جهاز المعلم الذي أنشأ الرابط أول مرة.');}
          else alert('تعذر تجهيز رابط الطالب الآن. حاول مرة أخرى.');
          button.textContent=oldText;
        }finally{button.disabled=false;}
      });
      return true;
    };
    if(!installShare()){const observer=new MutationObserver(()=>{if(installShare())observer.disconnect();});observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});}
  }
})();
