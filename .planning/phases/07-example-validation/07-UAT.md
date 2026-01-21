---
status: complete
phase: 07-example-validation
source: 07-01-SUMMARY.md
started: 2026-01-21T14:00:00Z
updated: 2026-01-21T14:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Valid JSX Structure
expected: Open docs/examples/command.tsx - all content is inside the <Command> wrapper (no content outside the tags)
result: issue
reported: "I have error: This JSX tag requires the module path 'react/jsx-runtime' to exist, but none could be found. Make sure you have types for the appropriate package installed.ts(2875) Cannot find name 'Command'.ts(2304)"
severity: major

### 2. Build Command Success
expected: Run `npx react-agentic build docs/examples/command.tsx` - completes without errors, outputs to .claude/commands/
result: pass

### 3. YAML Frontmatter
expected: Output .claude/commands/command.md starts with YAML frontmatter containing name, description, and allowed-tools array
result: pass

### 4. Headings Transpilation
expected: h2 elements become ## headings, h3 elements become ### headings in output
result: pass

### 5. Lists Transpilation
expected: ul/li becomes bullet list (-), ol/li becomes numbered list (1. 2. 3.) in output
result: pass

### 6. Text Formatting
expected: <b> becomes **bold**, <code> becomes `code` in output
result: pass

### 7. Link Transpilation
expected: <a href="url">text</a> becomes [text](url) markdown link in output
result: pass

### 8. XML Block Output
expected: <div name="instructions"> transpiles to <instructions>...</instructions> XML block in output
result: pass

### 9. Markdown Passthrough
expected: Content inside <Markdown> component passes through unchanged (## Examples heading, bullet list with backticks)
result: pass

## Summary

total: 9
passed: 8
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Example TSX file opens without TypeScript errors"
  status: failed
  reason: "User reported: This JSX tag requires the module path 'react/jsx-runtime' to exist, but none could be found. Cannot find name 'Command'."
  severity: major
  test: 1
  artifacts: []
  missing: []

- truth: "Bold text in list items stays inline with following content"
  status: failed
  reason: "User reported: List items with bold break onto new lines. Expected '- **Working directory:** Current git repository' but got multiline output."
  severity: minor
  test: 6
  artifacts: []
  missing: []

## Feature Requests (Out of Phase Scope)

- Move example to src/app folder
- Watch mode for src/app/**/*.tsx
