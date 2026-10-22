import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

const view=readFileSync(new URL('../src/app/student-login.tsx',import.meta.url),'utf8');
describe('Firestore backup quota protection',()=>{
 it('never repeatedly posts backup steps in a loop',()=>{
  expect(view).not.toMatch(/while\s*\(\s*!r\.complete\s*\)/);
  expect(view).toContain('Exactly one page per click');
  expect(view).toContain("backupId?{backupId}:{}");
 });
 it('retains the snapshot identifier on the teacher device for a safe resume',()=>{
  expect(view).toContain('BACKUP_SESSION_KEY');
  expect(view).toContain('saveBackupId(r.backupId)');
  expect(view).toContain('React.useState(savedBackupId)');
 });
 it('prevents PIN issuance while the backup is incomplete',()=>{
  expect(view).toContain('disabled={busy||!backupId||!backupComplete}');
 });
});
