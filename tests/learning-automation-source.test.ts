import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("lib/server/learning-automation.ts", "utf8");

test("server automation never repeats a guessed legacy day schedule across the week", () => {
  assert.doesNotMatch(source, /EXISTING_DAY_SLOTS/);
  assert.match(source, /EMPTY_CLASS_TIMETABLE/);
  assert.match(source, /TIMETABLE_INCOMPLETE/);
});

test("weekly and daily publishing keep the timetable configuration guard", () => {
  assert.match(source, /if \(!source\.settings\.autoWeeklyPlan \|\| !source\.timetableConfigured\) return null/);
  assert.match(source, /if \(!source\.settings\.autoDailyAssignments \|\| !source\.timetableConfigured\) return null/);
});

test("approved second-4 teacher timetable is the configured fallback", () => {
  assert.match(source, /APPROVED_CLASS_TIMETABLE/);
  assert.match(source, /الأحد:\s*\[lughatiSlot\(2\), lughatiSlot\(3\), deenSlot\(7\)\]/);
  assert.match(source, /الاثنين:\s*\[lughatiSlot\(1\), deenSlot\(7\)\]/);
  assert.match(source, /الثلاثاء:\s*\[deenSlot\(1\), lughatiSlot\(4\), lughatiSlot\(5\)\]/);
  assert.match(source, /الأربعاء:\s*\[lughatiSlot\(1\), deenSlot\(2\)\]/);
  assert.match(source, /الخميس:\s*\[lughatiSlot\(1\), deenSlot\(4\)\]/);
  assert.match(source, /includedSubjectIds:\s*\["lughati", "spelling"\]/);
  assert.match(source, /includedSubjectIds:\s*\["quran", "islamic"\]/);
  assert.match(source, /parsed\.configured \? parsed\.timetable : APPROVED_CLASS_TIMETABLE/);
  assert.match(source, /timetableConfigured:\s*true/);
});
