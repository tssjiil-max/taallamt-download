// Loaded first on the legacy teacher tools (legacy.html). These pages are teacher-only: without a valid teacher
// session the page stays hidden and the browser goes to the sign-in screen. The server enforces the same rule on every
// request, so hiding here is only to avoid showing an empty shell.
(function(){
  if(!location.pathname.startsWith('/teacher'))return;
  var hide=document.createElement('style');
  hide.id='teacherGateHide';hide.textContent='#root{visibility:hidden!important}';
  document.head.appendChild(hide);
  var signIn=function(){location.replace('/teacher')};
  fetch('/api/learning-automation?action=session',{cache:'no-store',credentials:'same-origin'})
    .then(function(response){return response.json()})
    .then(function(session){if(session&&session.teacher===true)hide.remove();else signIn()})
    .catch(signIn);
})();
