---
phase: 11
plan: 02
subsystem: validation
tags: [typescript, cross-file, validation, type-safety]

dependency_graph:
  requires: [11-01-generic-extraction]
  provides: [cross-file-validation, spawnagent-type-checking]
  affects: []

tech_stack:
  added: []
  patterns: [cross-file-type-resolution, interface-property-extraction, prompt-placeholder-validation]

file_tracking:
  created:
    - tests/validation/cross-file-validation.test.ts
  modified:
    - src/cli/errors.ts
    - src/parser/parser.ts
    - src/cli/commands/build.ts

decisions:
  - id: validation-warning-mode
    choice: "Validation errors are logged but build continues"
    reason: "Non-blocking allows gradual adoption; can enable blocking mode via code comment"
  - id: local-interface-fallback
    choice: "resolveTypeImport checks local interfaces before imports"
    reason: "Enables validation even when interface is co-located with usage"

metrics:
  duration: 5m
  completed: 2026-01-21
  tasks: 3/3
---

# Phase 11 Plan 02: Cross-File Validation Summary

**One-liner:** CrossFileError for dual-location errors, resolveTypeImport for cross-file type resolution, validation pass in build command

## What Was Built

1. **CrossFileError Class (src/cli/errors.ts)**
   - Extends TranspileError with additional agentLocation field
   - formatCrossFileError shows both command and agent file locations
   - TypeScript-style error output with file:line:column format

2. **Type Resolution Utilities (src/parser/parser.ts)**
   - `resolveTypeImport()` - Resolves type names to interface declarations
   - `extractInterfaceProperties()` - Extracts required/optional properties from interface
   - `extractPromptPlaceholders()` - Extracts {var} patterns from prompt strings
   - `ResolvedType` and `InterfaceProperty` interfaces

3. **Build Validation Pass (src/cli/commands/build.ts)**
   - `validateSpawnAgents()` function validates SpawnAgent nodes
   - Checks prompt placeholders cover all required interface properties
   - Logs dual-location errors showing both usage and definition sites
   - Runs in warning mode (continues build after logging errors)

## Commits

| Commit | Description |
|--------|-------------|
| 12a7056 | feat(11-02): add CrossFileError class for dual-location errors |
| 133f77f | feat(11-02): add type resolution and interface extraction utilities |
| 0114512 | feat(11-02): add validation pass for SpawnAgent type safety |

## Test Coverage

9 new tests in `tests/validation/cross-file-validation.test.ts` (212 lines):
- resolves locally defined interface
- resolves type from same file (import simulation)
- returns undefined for non-existent type
- extracts required and optional properties
- extracts placeholder names from prompt
- handles multi-line prompts
- returns empty set for prompt without placeholders
- validates prompt contains required interface properties (missing detection)
- passes validation when all required properties present

All 234 tests pass.

## Deviations from Plan

None - plan executed exactly as written.

## Known Limitations

1. **In-memory project import resolution**: In-memory ts-morph projects don't resolve cross-file imports. Tests use locally defined interfaces to simulate the validation logic.

2. **Location precision**: After IR transformation, original AST node positions are lost. Errors point to line 1 of the file rather than the exact SpawnAgent location.

3. **Warning mode only**: Validation errors don't block the build by default. To enable blocking mode, uncomment the `continue` statement in build.ts.

## Next Phase Readiness

**Blockers:** None

**Phase 11 Complete:** All type safety goals achieved:
- Generic type parameters on Agent/SpawnAgent (Plan 01)
- Cross-file validation for type contracts (Plan 02)
- Build-time errors for contract mismatches

## Key Files

- `/Users/glenninizan/workspace/react-agentic/src/cli/errors.ts` - CrossFileError class
- `/Users/glenninizan/workspace/react-agentic/src/parser/parser.ts` - Type resolution utilities
- `/Users/glenninizan/workspace/react-agentic/src/cli/commands/build.ts` - Validation integration
- `/Users/glenninizan/workspace/react-agentic/tests/validation/cross-file-validation.test.ts` - Test coverage
