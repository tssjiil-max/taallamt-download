// Bottom bar of the older teacher tools: the same five entries as the new teacher pages, with Shakabumbo as a small
// assistant button instead of the large picture that used to cover the page. Navigation only.
(function(){
  if(!location.pathname.startsWith('/teacher/'))return;
  var path=location.pathname;
  var items=[
    ['/teacher','الرئيسية','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 10.6 12 3.4l8.6 7.2v8.6c0 .9-.7 1.6-1.6 1.6h-3.9v-5.4c0-.8-.6-1.4-1.4-1.4h-3.4c-.8 0-1.4.6-1.4 1.4v5.4H5c-.9 0-1.6-.7-1.6-1.6Z"/></svg>',false],
    ['/teacher#students','الطلاب','<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8.2" r="3.4"/><path d="M2.8 20C3.2 16.3 5.6 14.2 9 14.2S14.8 16.3 15.2 20Z"/><path d="M15.6 5.2A3.2 3.2 0 0 1 15.6 11.4M17.6 14.6C19.7 15.2 20.9 17 21.2 20"/></svg>',/^\/teacher\/(student|students|followup|messages)/.test(path)],
    ['/teacher#assistant','شكابمبو','<img src="/unified/shak-logo.webp" alt="" aria-hidden="true"/>',false],
    ['/teacher#library','الكتب','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C10.2 5 7.6 4.4 4.7 4.6 4.1 4.6 3.7 5.1 3.7 5.6V17.1C3.7 17.7 4.2 18.1 4.8 18.1 7.6 17.9 10.1 18.5 12 19.8 13.9 18.5 16.4 17.9 19.2 18.1 19.8 18.1 20.3 17.7 20.3 17.1V5.6C20.3 5.1 19.9 4.6 19.3 4.6 16.4 4.4 13.8 5 12 6.5ZM12 6.5V19.8"/></svg>',path==='/teacher/library'],
    ['/teacher#more','المزيد','<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/></svg>',/^\/teacher\/(settings|announcements|tasks|stars)/.test(path)]
  ];
  function mount(){
    if(document.querySelector('.uiNav'))return;
    var nav=document.createElement('nav');nav.className='uiNav';nav.setAttribute('aria-label','تنقل المعلم');
    items.forEach(function(item){var link=document.createElement('a');link.href=item[0];if(item[3]){link.className='on';link.setAttribute('aria-current','page')}link.innerHTML=item[2]+'<span></span>';link.querySelector('span').textContent=item[1];nav.appendChild(link)});
    document.body.appendChild(nav);
  }
  if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount);
})();
