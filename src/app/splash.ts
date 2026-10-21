// Finish as soon as the destination can display data, an error or its sign-in screen.
export function finishSplash(){
 const splash=document.getElementById('site-splash'),img=splash?.querySelector('img');
 const done=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>splash?.remove()));
 if(img&&!img.complete)img.addEventListener('load',done,{once:true});else done();
}
