import {StudentLogin} from './student-login';
import {api} from './kit';
// Entry of the new teacher and student pages (reference design). Legacy teacher tools keep their own entry (legacy.html).
import React from 'react';
import {createRoot} from 'react-dom/client';
import './app.css';
import {StudentApp} from './student';
import {TeacherApp} from './teacher';

// The path is read once at start: the static staging copy rewrites the address bar right after boot.
const path=location.pathname.replace(/\/+$/,'')||'/';
function App(){
  if(path==='/'||path==='/student-login'||(path==='/student'&&!location.search))return <StudentLogin/>;
  if(path.startsWith('/student'))return <StudentEntry/>;
  if(path==='/teacher/quran-followup')return <TeacherApp initialRoute="assess/quran"/>;
  return <TeacherApp/>;
}
function StudentEntry(){
 const query=new URLSearchParams(location.search),legacy=Boolean(query.get('invite')||query.get('inviteToken'));
 const [ready,setReady]=React.useState(legacy),[denied,setDenied]=React.useState(false),[teacherPreview,setTeacherPreview]=React.useState(false);
 React.useEffect(()=>{if(legacy)return;void api<{session:{studentId:string}|null;teacher:boolean}>('/api/student-state?view=student-login').then(r=>{if(r.teacher){setTeacherPreview(true);setReady(true)}else if(r.session?.studentId===query.get('studentId'))setReady(true);else setDenied(true)}).catch(()=>setDenied(true))},[]);
 if(denied)return <StudentLogin/>;
 if(!ready)return <p dir="rtl" role="status">جارٍ استعادة دخولك…</p>;
 return <>{!legacy&&!teacherPreview&&<button className="tkAct" onClick={()=>void api('/api/student-state?view=student-login',{method:'POST',body:{action:'logout'}}).then(()=>location.replace('/student-login'))}>تسجيل الخروج</button>}<StudentApp/></>;
}
document.documentElement.lang='ar';document.documentElement.dir='rtl';
createRoot(document.getElementById('root')!).render(<App/>);
