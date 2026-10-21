import {it,expect} from 'vitest';
import {guardianShareUrl} from '../server/permanent-links.js';
it('keeps the same authenticated URL across two deployment updates',()=>{
 const env={VERCEL_ENV:'preview',STUDENT_PUBLIC_ORIGIN:'https://taallamt-links-preview.vercel.app'};
 const link=()=>guardianShareUrl('s2-4-02','a'.repeat(32),env);
 const first=link();env.VERCEL_URL='second.vercel.app';expect(link()).toBe(first);env.VERCEL_URL='third.vercel.app';expect(link()).toBe(first);
 expect(new URL(first).searchParams.get('invite')).toBe('a'.repeat(32));
});
it('fails closed without an approved stable origin or access token',()=>{
 expect(()=>guardianShareUrl('s2-4-02','a'.repeat(32),{})).toThrow();
 expect(()=>guardianShareUrl('s2-4-02','',{STUDENT_PUBLIC_ORIGIN:'https://school.example'})).toThrow();
 expect(()=>guardianShareUrl('s2-4-02','a'.repeat(32),{STUDENT_PUBLIC_ORIGIN:'http://school.example'})).toThrow();
});
import {inviteMatches} from '../server/access.js';
it('revoked access denies even a previously valid token',()=>{const token='a'.repeat(32);expect(inviteMatches({guardianInviteToken:token,guardianAccessRevokedAt:'2026-10-21'},token)).toBe(false)});
