---
status: diagnosed
trigger: "Diagnose why bold text in list items breaks onto new lines"
created: 2026-01-21T00:00:00Z
updated: 2026-01-21T00:01:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - JsxText in li creates separate paragraph instead of merging
test: Traced transformListItem logic for `<li><b>bold</b> text</li>`
expecting: n/a - root cause found
next_action: Return diagnosis

## Symptoms

expected: `- **Working directory:** Current git repository` (inline)
actual: `- **Working directory:**\n  Current git repository` (line break)
errors: none
reproduction: Any list item with bold text followed by more text
started: unknown

## Eliminated

- hypothesis: emitter.ts inserts newlines incorrectly
  evidence: list.test.ts line 227-251 shows emitter correctly handles paragraph with bold+text
  timestamp: 2026-01-21T00:00:30Z

## Evidence

- timestamp: 2026-01-21T00:00:10Z
  checked: tests/emitter/list.test.ts
  found: Test at line 227-251 expects `- **Important**: do this` - emitter is correct
  implication: Bug is in how IR is created, not emitted

- timestamp: 2026-01-21T00:00:20Z
  checked: tests/parser/transformer.test.ts lines 438-467
  found: Test expects TWO paragraphs for `<li><b>bold</b> text</li>`
  implication: This is the documented (buggy) behavior - transformer creates separate paragraphs

- timestamp: 2026-01-21T00:00:30Z
  checked: src/parser/transformer.ts lines 329-369 (transformListItem)
  found: JsxText branch (lines 334-339) always creates new paragraph
  implication: JsxText doesn't merge into last paragraph like inline elements do (lines 357-363)

## Resolution

root_cause: In transformListItem() (src/parser/transformer.ts lines 334-339), JsxText content always creates a NEW paragraph instead of merging into the last paragraph. Inline elements (lines 357-363) correctly check for existing paragraph and merge, but JsxText does not.

fix: JsxText branch should use same "merge into last paragraph" logic as inline elements
verification:
files_changed: []
