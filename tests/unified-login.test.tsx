import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
vi.hoisted(()=>{vi.stubGlobal('location',{hostname:'test.example',search:'',pathname:'/',origin:'https://test.example'});});
import {StudentLogin} from '../src/app/student-login';

describe('shared teacher and student entry',()=>{
  it('shows both roles and a six digit student password by default',()=>{
    const html=renderToStaticMarkup(<StudentLogin/>);
    expect(html).toContain('دخول الطالب');
    expect(html).toContain('دخول المعلم');
    expect(html).toContain('pattern="[0-9]{6}"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).not.toContain('type="email"');
  });
  it('uses the same entry for teachers with a text password and no roster request',()=>{
    const html=renderToStaticMarkup(<StudentLogin initialRole="teacher"/>);
    expect(html).toContain('كلمة سر المعلم');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('pattern="[0-9]{6}"');
    expect(html).not.toContain('type="email"');
  });
});
