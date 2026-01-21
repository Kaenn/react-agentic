---
created: 2026-01-21T14:30
title: Fix inline code space preservation in ordered list items
area: transpiler
files:
  - src/app/commit-helper.tsx:26
  - .claude/commands/commit-helper.md:19
  - src/transformer.ts
---

## Problem

Inline `<code>` elements inside `<li>` in ordered lists lose surrounding whitespace during transpilation.

**Source (commit-helper.tsx:26):**
```tsx
<li>Run <code>git diff --cached</code> to see staged changes</li>
```

**Output (commit-helper.md:19):**
```md
1. Run`git diff --cached`to see staged changes
```

**Expected:**
```md
1. Run `git diff --cached` to see staged changes
```

The space before and after the `<code>` element is lost. This same pattern was addressed in Plan 07-03 for unordered lists with explicit `{' '}` JSX expressions, but the ordered list case either:
1. Wasn't covered by the fix
2. Has different whitespace handling in the transformer

## Solution

TBD — investigate if 07-03 fix applies to `<ol>` items or if `transformListItem` needs additional handling for ordered lists. Check if the `{' '}` pattern works in `<ol><li>` context.
