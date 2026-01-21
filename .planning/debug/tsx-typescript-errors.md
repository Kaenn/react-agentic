---
status: diagnosed
trigger: "Diagnose why example TSX files show TypeScript errors: 'This JSX tag requires the module path react/jsx-runtime to exist' and 'Cannot find name Command'"
created: 2026-01-21T00:00:00Z
updated: 2026-01-21T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - Two separate issues: 1) Missing @types/react for JSX runtime, 2) Missing type definitions for Command/Markdown components
test: Checked package.json, tsconfig.json, node_modules/@types, and src/**/*.d.ts
expecting: Confirmed both issues
next_action: Return diagnosis

## Symptoms

expected: TypeScript IDE should recognize JSX syntax and Command component type
actual: Two errors: "This JSX tag requires the module path 'react/jsx-runtime' to exist" and "Cannot find name 'Command'"
errors: JSX runtime path missing, Command name undefined
reproduction: Open docs/examples/command.tsx in IDE
started: Unknown - investigating

## Eliminated

## Evidence

- timestamp: 2026-01-21T00:01:00Z
  checked: package.json devDependencies
  found: No @types/react present - only @types/node exists
  implication: JSX types for React are not available to TypeScript

- timestamp: 2026-01-21T00:02:00Z
  checked: node_modules/@types directory
  found: Contains chai, deep-eql, estree, node - NO react types
  implication: Confirms @types/react not installed

- timestamp: 2026-01-21T00:03:00Z
  checked: tsconfig.json jsx setting
  found: "jsx": "preserve" - valid setting, but requires jsx runtime types
  implication: JSX config is correct, but needs @types/react for type definitions

- timestamp: 2026-01-21T00:04:00Z
  checked: src/**/*.d.ts for type definitions
  found: No .d.ts files in src directory
  implication: No type definitions exist for Command or Markdown components

- timestamp: 2026-01-21T00:05:00Z
  checked: src/index.ts exports
  found: Exports IR types and emitter, but no JSX component types
  implication: Package does not export Command/Markdown as typed components

- timestamp: 2026-01-21T00:06:00Z
  checked: tsconfig.json include/exclude
  found: include: ["src/**/*"], exclude: ["node_modules", "dist", "tests"]
  implication: docs/examples/ is NOT in TypeScript's include path - files there won't be type-checked during build

## Resolution

root_cause: |
  TWO DISTINCT ISSUES:

  1. "This JSX tag requires the module path 'react/jsx-runtime' to exist"
     - Cause: @types/react is NOT installed as a devDependency
     - Without @types/react, TypeScript cannot resolve JSX intrinsic types
     - The tsconfig.json has "jsx": "preserve" which is correct, but needs the React types

  2. "Cannot find name 'Command'" (and likely 'Markdown')
     - Cause: No type definitions exist for Command and Markdown JSX components
     - These are "special components" used by the transformer (src/parser/transformer.ts:49)
     - They are recognized at parse-time but have no TypeScript type declarations
     - The package needs to export JSX namespace augmentation with these component types

fix:
verification:
files_changed: []
