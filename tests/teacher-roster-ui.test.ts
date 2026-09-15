import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync("app/layout.tsx", "utf8");
let css = "";
try {
  css = readFileSync("app/teacher-roster-reference.css", "utf8");
} catch {}

test("teacher roster loads the dedicated compact reference stylesheet", () => {
  assert.match(layout, /teacher-roster-reference\.css/);
});

test("active roster cards hide management actions without deleting them from the page logic", () => {
  assert.match(css, /student-card-actions:has\(\.student-portfolio-link\)/);
  assert.match(css, /display\s*:\s*none\s*!important/);
});

test("archived roster keeps restore available while edit and delete stay hidden", () => {
  assert.match(css, /student-card-actions:not\(:has\(\.student-portfolio-link\)\)/);
  assert.match(css, /student-delete-action/);
});

test("compact cards center the student name, hide secondary metadata, and render the left chevron", () => {
  assert.match(css, /student-summary-copy\s*\{[^}]*text-align\s*:\s*center/s);
  assert.match(css, /student-summary-copy\s*>\s*p[^}]*display\s*:\s*none/s);
  assert.match(css, /student-summary-card:not\(\.is-empty-slot\)::after/);
  assert.match(css, /content\s*:\s*["']‹["']/);
});
