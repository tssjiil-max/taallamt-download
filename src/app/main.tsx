// Entry of the new teacher and student pages (reference design). Legacy teacher tools keep their own entry (legacy.html).
import React from 'react';
import {createRoot} from 'react-dom/client';
import './app.css';
import {StudentApp} from './student';
import {TeacherApp} from './teacher';

// The path is read once at start: the static staging copy rewrites the address bar right after boot.
const path=location.pathname.replace(/\/+$/,'')||'/';

// A student/guardian link carries the access token in its query string.
// Preserve that exact verified link locally so an installed PWA can reopen the same student's page
// after Chrome launches the manifest start_url (/student?source=pwa).
if(path.startsWith('/student')){
  const params=new URLSearchParams(location.search);
  const studentId=params.get('studentId')||'';
  const invite=params.get('invite')||params.get('inviteToken')||'';
  if(studentId&&invite){
    try{localStorage.setItem('taallamt:pwa:last-student-link',location.pathname+location.search+location.hash)}catch{}
  }else if(params.get('source')==='pwa'){
    try{
      const saved=localStorage.getItem('taallamt:pwa:last-student-link')||'';
      if(saved.startsWith('/student?')&&saved.includes('studentId=')&&(saved.includes('invite=')||saved.includes('inviteToken='))){
        location.replace(saved);
      }
    }catch{}
  }
}
function App(){
  if(path.startsWith('/student'))return <StudentApp/>;
  if(path==='/teacher/quran-followup')return <TeacherApp initialRoute="assess/quran"/>;
  return <TeacherApp/>;
}
document.documentElement.lang='ar';document.documentElement.dir='rtl';
createRoot(document.getElementById('root')!).render(<App/>);
