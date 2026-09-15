import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/teacher/students/page.tsx", "utf8");
const layout = readFileSync("app/layout.tsx", "utf8");
let css = "";
try {
  css = readFileSync("app/teacher-roster-reference.css", "utf8");
} catch {}

test("teacher roster uses the compact reference-card presentation", () => {
  assert.match(page, /teacher-roster-reference/);
  assert.match(page, /student-row-open/);
  assert.match(layout, /teacher-roster-reference\.css/);
});

test("student admin actions stay hidden on the active roster cards", () => {
  assert.match(page, /student-admin-actions/);
  assert.match(css, /\.teacher-roster-reference\s+\.student-admin-actions\s*\{[^}]*display\s*:\s*none\s*!important/);
});

test("compact cards center the student name and hide secondary metadata", () => {
  assert.match(css, /\.teacher-roster-reference\s+\.student-summary-copy\s*\{[^}]*text-align\s*:\s*center/);
  assert.match(css, /\.teacher-roster-reference\s+\.student-summary-copy\s*>\s*p\s*,\s*\.teacher-roster-reference\s+\.student-summary-copy\s*>\s*small\s*\{[^}]*display\s*:\s*none/);
});
