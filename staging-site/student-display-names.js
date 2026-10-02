(()=>{
  const NAMES_BY_ID={
    's2-4-01':'أحمد بسام الأحمد','s2-4-02':'أسامه سلطان الصاعدي','s2-4-03':'أمير نايف الحجيلي','s2-4-04':'أنس أحمد الجهني','s2-4-05':'أوس نايف الشريف','s2-4-06':'أويس عادل المالكي','s2-4-07':'تميم ماجد الحجيلي','s2-4-08':'ثامر عبدالله العوفي','s2-4-09':'راكان حاتم الجهني','s2-4-10':'ريان محمود بري','s2-4-11':'سلطان فهد الجهني','s2-4-12':'شامخ بدر الجهني','s2-4-13':'عادل غالب العنزي','s2-4-14':'عبدالجليل سالم عبدالجليل','s2-4-15':'عبدالرحمن نواف الحازمي','s2-4-16':'عمر حميد العمري','s2-4-17':'فيصل محمد المطيري','s2-4-18':'قصي عبدالله الحجيلي','s2-4-19':'كنان محمد اليوسفي','s2-4-20':'محمد سماح البوق','s2-4-21':'محمد صالح عواد','s2-4-22':'موسى رياض الأحمد','s2-4-23':'نايف أحمد الجهني','s2-4-24':'نواف مطلق العمري','s2-4-25':'الحسن عادل الرجبي','s2-4-26':'وسام سلطان السناني','s2-4-27':'يمان أحمد الجهني','s2-4-28':'يوسف فلاح الحربي','s2-4-29':'يوسف محمد الجهني'
  };
  const STALE_TO_APPROVED={
    'أحمد بسام صالح الأحمد':'أحمد بسام الأحمد',
    'أسامه سلطان بن بخت الصاعدي':'أسامه سلطان الصاعدي',
    'أمير نايف عبدالله الحجلي':'أمير نايف الحجيلي',
    'أنس احمد عبدالله الجهني':'أنس أحمد الجهني',
    'أوس نايف بن حمد الشريف':'أوس نايف الشريف',
    'أويس عادل فيصل المالكي':'أويس عادل المالكي',
    'تميم ماجد جابر الحجلي':'تميم ماجد الحجيلي',
    'ثامر عبدالله رجاء العوفي':'ثامر عبدالله العوفي',
    'راكان حاتم مهل الجهني':'راكان حاتم الجهني',
    'ريان محمود - باري':'ريان محمود بري',
    'سلطان فهد زعل الجهني':'سلطان فهد الجهني',
    'شامخ بدر لافي الجهني':'شامخ بدر الجهني',
    'عادل غالب عبدالله العنزي':'عادل غالب العنزي',
    'عبدالجليل سالم محمود عبدالجليل':'عبدالجليل سالم عبدالجليل',
    'عبدالرحمن نواف هندي الحازمي':'عبدالرحمن نواف الحازمي',
    'عمر حميد بن سليم العروي':'عمر حميد العمري',
    'فيصل محمد عويض المطيري':'فيصل محمد المطيري',
    'قصي عبدالله ظاهر الحجلي':'قصي عبدالله الحجيلي',
    'كنان محمد عبدالعزيز اليوسفي':'كنان محمد اليوسفي',
    'محمد سماح سعد البوق':'محمد سماح البوق',
    'محمد صالح حمد عواد':'محمد صالح عواد',
    'موسى رياض صالح الأحمد':'موسى رياض الأحمد',
    'نايف احمد صويدر الجهني':'نايف أحمد الجهني',
    'نواف مطلق صالح العمري':'نواف مطلق العمري',
    'وائل محمد حسين روزي':'الحسن عادل الرجبي',
    'وسام سلطان عبيد السناني':'وسام سلطان السناني',
    'يمان احمد بن عايد الجهني':'يمان أحمد الجهني',
    'يوسف فلاح خلف الحربي':'يوسف فلاح الحربي',
    'يوسف محمد لافي الجهني':'يوسف محمد الجهني'
  };

  const activeId=()=>{
    const path=location.pathname.match(/\/teacher\/student\/(s2-4-\d{2})\/?$/)?.[1];
    if(path)return path;
    const query=new URLSearchParams(location.search).get('studentId');
    if(query&&NAMES_BY_ID[query])return query;
    try{return localStorage.getItem('activeStudentId')||null;}catch{return null;}
  };

  function updateStoredObject(key,id,name){
    try{
      const raw=localStorage.getItem(key);if(!raw)return;
      const value=JSON.parse(raw);if(!value||typeof value!=='object')return;
      if(value.id&&value.id!==id)return;
      localStorage.setItem(key,JSON.stringify({...value,id,name,fullName:name}));
    }catch{}
  }

  function syncStorage(){
    const id=activeId(),name=id?NAMES_BY_ID[id]:null;if(!id||!name)return;
    try{
      localStorage.setItem('activeStudentId',id);
      localStorage.setItem('studentName',name);
      updateStoredObject('studentProfile',id,name);
      updateStoredObject('teacherActiveStudent',id,name);
    }catch{}
  }

  function approvedText(value){
    let next=String(value||'');
    for(const [stale,approved] of Object.entries(STALE_TO_APPROVED))if(next.includes(stale))next=next.split(stale).join(approved);
    return next;
  }

  function fixTextNode(node){
    const current=node.nodeValue||'',next=approvedText(current);if(next!==current)node.nodeValue=next;
  }

  function fixTree(root){
    if(!root)return;
    if(root.nodeType===Node.TEXT_NODE){fixTextNode(root);return;}
    if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_FRAGMENT_NODE&&root.nodeType!==Node.DOCUMENT_NODE)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;while((node=walker.nextNode()))fixTextNode(node);
  }

  function run(){syncStorage();fixTree(document.body);}
  run();
  const observer=new MutationObserver(records=>{
    syncStorage();
    for(const record of records){
      if(record.type==='characterData')fixTextNode(record.target);
      for(const node of record.addedNodes)fixTree(node);
    }
  });
  if(document.body)observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  window.addEventListener('popstate',run);
  window.addEventListener('pageshow',run);
})();
