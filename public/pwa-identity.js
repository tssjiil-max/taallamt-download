// One installation identity for the existing teacher/student routes. Never rewrites page URLs or invitation tokens.
(function(){
  var version='20261022',student=location.pathname==='/'||location.pathname.replace(/\/+$/,'').startsWith('/student'),role=student?'student':'teacher';
  var query=new URLSearchParams(location.search),studentId=query.get('studentId')||'',invite=query.get('invite')||query.get('inviteToken')||'';
  function link(rel,href){var el=document.querySelector('link[rel="'+rel+'"]')||document.createElement('link');el.rel=rel;el.href=href;document.head.appendChild(el)}
  link('manifest',student&&studentId&&invite?'/api/student-state?view=pwa-manifest&studentId='+encodeURIComponent(studentId)+'&invite='+encodeURIComponent(invite):'/manifest-'+role+'.webmanifest');
  link('apple-touch-icon','/pwa/'+role+'-apple-touch-icon-'+version+'.png');
  link('icon','/pwa/favicon-'+version+'.ico');
  var theme=document.querySelector('meta[name="theme-color"]')||document.createElement('meta');theme.name='theme-color';theme.content='#e0f4ff';document.head.appendChild(theme);
  var title=student?'تعلّمت - الطالب':'تعلّمت - المعلم';document.title=title;
  var apple=document.querySelector('meta[name="apple-mobile-web-app-title"]')||document.createElement('meta');apple.name='apple-mobile-web-app-title';apple.content=title;document.head.appendChild(apple);
  // End startup when the actual page has mounted; never delay entry with an artificial minimum timer.
  var splash=document.getElementById('site-splash'),root=document.getElementById('root');
  function finish(){var image=splash&&splash.querySelector('img');function remove(){requestAnimationFrame(function(){requestAnimationFrame(function(){if(splash)splash.remove()})})}if(image&&!image.complete)image.addEventListener('load',remove,{once:true});else remove()}
  if(splash&&root){if(root.childElementCount)finish();else{var observer=new MutationObserver(function(){if(root.childElementCount){observer.disconnect();finish()}});observer.observe(root,{childList:true});setTimeout(function(){observer.disconnect();splash.remove()},6000)}}
  if('serviceWorker' in navigator){function register(){navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(function(reg){return reg.update()}).catch(function(){})}if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true})}
})();
