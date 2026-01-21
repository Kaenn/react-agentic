---
created: 2026-01-21T14:30
completed: 2026-01-21T10:26
title: Fix inline code space preservation in ordered list items
area: transpiler
files:
  - src/app/commit-helper.tsx:26
  - .claude/commands/commit-helper.md:21
---

## Problem

Inline `<code>` elements inside `<li>` in ordered lists lose surrounding whitespace during transpilation.

**Source (commit-helper.tsx:26):**
```tsx
<li>Run <code>git diff --cached</code> to see staged changes</li>
```

**Output (commit-helper.md:21):**
```md
1. Run`git diff --cached`to see staged changes
```

**Expected:**
```md
1. Run `git diff --cached` to see staged changes
```

## Root Cause Analysis

This is **not a transformer bug** but expected JSX whitespace behavior.

When JSX parses `<li>Run <code>...</code> to see</li>`:
- Text node 1: "Run " (trailing space preserved)
- Element: `<code>`
- Text node 2: "to see" (leading space **stripped** by JSX parser)

The TypeScript JSX parser strips whitespace adjacent to closing tags on the same line. This is standard JSX behavior.

## Solution

Use the `{' '}` pattern for explicit whitespace around inline elements (same pattern established in 07-03):

**Fixed source:**
```tsx
<li>Run{' '}<code>git diff --cached</code>{' '}to see staged changes</li>
```

**Output:**
```md
1. Run `git diff --cached` to see staged changes
```

The `{' '}` JSX expression creates an explicit space text node that the parser preserves.

## Key Learning

JSX whitespace collapsing is intentional. The `{' '}` pattern is the correct solution for preserving spaces around inline elements in JSX, regardless of list type (ul or ol).
