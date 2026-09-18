import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('../main.tsx',import.meta.url),'utf8');
const screenPath=new URL('./lesson-session-screen.tsx',import.meta.url);

describe('teacher lesson session regression',()=>{
  it('routes ابدأ الحصة to a dedicated teacher lesson screen',()=>{
    expect(main).toContain("location.pathname==='/teacher/lesson'");
    expect(main).toContain("go('/teacher/lesson')");
    expect(main).not.toContain("alert('تم بدء الحصة')");
  });

  it('keeps Shakabambo inside the lesson experience without student or guardian writes',()=>{
    const screen=readFileSync(screenPath,'utf8');
    expect(screen).toContain('شكابمبو');
    expect(screen).toContain('replyAsShakabambo');
    expect(screen).toContain('askShakabamboRemote');
    expect(screen).toContain('سؤال طالب');
    expect(screen).toContain('تعذر تشغيل شكابمبو الآن');
    expect(screen).toContain('remoteUnavailable');
    expect(screen).toContain('المساعدة المحلية');
    expect(screen).not.toMatch(/student-evaluation|star-adjust|guardian|ولي الأمر/);
  });
});
