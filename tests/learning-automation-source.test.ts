import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("lib/server/learning-automation.ts", "utf8");

test("server automation never repeats a guessed legacy day schedule across the week", () => {
  assert.doesNotMatch(source, /EXISTING_DAY_SLOTS/);
  assert.match(source, /EMPTY_CLASS_TIMETABLE/);
  assert.match(source, /TIMETABLE_INCOMPLETE/);
});

test("weekly and daily publishing are blocked until a real class timetable is configured", () => {
  assert.match(source, /if \(!source\.settings\.autoWeeklyPlan \|\| !source\.timetableConfigured\) return null/);
  assert.match(source, /if \(!source\.settings\.autoDailyAssignments \|\| !source\.timetableConfigured\) return null/);
});
