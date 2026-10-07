// Entry of the new teacher and student pages (reference design). Legacy teacher tools keep their own entry (legacy.html).
import React from 'react';
import {createRoot} from 'react-dom/client';
import './app.css';
import {StudentApp} from './student';
import {TeacherApp} from './teacher';

// The path is read once at start: the static staging copy rewrites the address bar right after boot.
const path=location.pathname.replace(/\/+$/,'')||'/';
function App(){
  if(path.startsWith('/student'))return <StudentApp/>;
  if(path==='/teacher/quran-followup')return <TeacherApp initialRoute="assess/quran"/>;
  return <TeacherApp/>;
}
document.documentElement.lang='ar';document.documentElement.dir='rtl';
createRoot(document.getElementById('root')!).render(<App/>);
