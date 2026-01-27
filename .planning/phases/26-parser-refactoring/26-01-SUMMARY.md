---
phase: 26-parser-refactoring
plan: 01
subsystem: parser
tags: [refactoring, parser, utilities, organization]

dependencies:
  requires: []
  provides:
    - src/parser/utils/ directory with 8 focused utility modules
    - Barrel export for all parser utilities
  affects:
    - 26-02 (will update parser.ts to import from utils/)
    - 26-03 (transformer modules can use utils/ imports)

tech-stack:
  added: []
  patterns:
    - Utility module extraction pattern for large files
    - Barrel export pattern for module organization
    - NodeNext .js extension compliance

key-files:
  created:
    - src/parser/utils/project.ts
    - src/parser/utils/jsx-traversal.ts
    - src/parser/utils/text-extraction.ts
    - src/parser/utils/spread-resolution.ts
    - src/parser/utils/component-resolution.ts
    - src/parser/utils/type-resolution.ts
    - src/parser/utils/variable-extraction.ts
    - src/parser/utils/index.ts
  modified: []

decisions:
  - decision: Extract utilities without modifying parser.ts
    rationale: Create clean foundation first, update imports in 26-02
    phase: 26-01
  - decision: Forward reference ExtractedVariable in jsx-traversal.ts
    rationale: Avoid circular import, proper import through barrel export
    phase: 26-01
  - decision: Include extractTypeArguments in both component-resolution.ts and variable-extraction.ts
    rationale: Temporary duplication until parser.ts imports are updated
    phase: 26-01

metrics:
  duration: 5m
  completed: 2026-01-27
---

# Phase 26 Plan 01: Split Parser Utilities Summary

Split parser.ts (1255 lines) into 8 focused utility modules in src/parser/utils/ directory

## One-liner

Extracted 1255 lines of parser utilities into 8 focused modules with barrel exports for improved code organization

## What Was Done

### Task 1: Create utils/ directory with project and JSX traversal modules
- Created src/parser/utils/project.ts with createProject, parseFile, parseSource
- Created src/parser/utils/jsx-traversal.ts with JSX traversal functions (getElementName, getJsxChildren, getAttributeValue, getTestAttributeValue, findRootJsxElement, getArrayAttributeValue)
- Created src/parser/utils/text-extraction.ts with text normalization and extraction functions
- All files use .js extensions for NodeNext module compliance
- **Commit:** 849f884

### Task 2: Create spread, component, and type resolution modules
- Created src/parser/utils/spread-resolution.ts for spread attribute resolution
- Created src/parser/utils/component-resolution.ts for component import resolution
- Created src/parser/utils/type-resolution.ts for cross-file type resolution
- All modules include proper TypeScript types and error handling
- **Commit:** 19b1d00

### Task 3: Create variable extraction module and utils barrel export
- Created src/parser/utils/variable-extraction.ts with variable declaration extraction, input/state schema utilities, and render props detection
- Created src/parser/utils/index.ts as barrel export re-exporting all public APIs
- Includes ExtractedVariable, RenderPropsInfo types and all extraction functions
- **Commit:** 5c0b59b

## Technical Details

### Module Organization

**Project utilities (53 lines):**
- createProject: Configure ts-morph Project for JSX parsing
- parseFile: Load and parse file from filesystem
- parseSource: Parse in-memory TSX string

**JSX traversal utilities (321 lines):**
- getElementName: Extract JSX element tag name
- getJsxChildren: Get JSX child nodes
- getAttributeValue: Extract string attribute values
- getArrayAttributeValue: Extract array attribute values
- getTestAttributeValue: Extract test attribute with helper function support
- findRootJsxElement: Find root JSX in default export

**Text extraction utilities (68 lines):**
- extractText: Extract normalized text from JsxText nodes
- extractInlineText: Extract text preserving inline whitespace
- normalizeWhitespace: Collapse multiple spaces/newlines
- isWhitespaceOnlyText: Check for formatting whitespace

**Spread resolution utilities (100 lines):**
- extractObjectLiteralProps: Extract properties from object literals
- resolveSpreadAttribute: Resolve JSX spread attributes

**Component resolution utilities (204 lines):**
- resolveComponentImport: Follow imports to component definition
- extractJsxFromComponent: Extract JSX from component functions
- extractTypeArguments: Extract generic type arguments from JSX

**Type resolution utilities (145 lines):**
- resolveTypeImport: Resolve type imports across files
- extractInterfaceProperties: Extract property info from interfaces
- extractPromptPlaceholders: Extract {placeholder} patterns

**Variable extraction utilities (431 lines):**
- extractVariableDeclarations: Extract useVariable and defineVars calls
- extractInputObjectLiteral: Parse SpawnAgent input props
- extractStateSchema: Flatten interface to SQL schema
- extractSqlArguments: Extract $variables from SQL templates
- analyzeRenderPropsChildren: Detect render props pattern
- isVariableRef: Check if identifier is useVariable result

**Barrel export (68 lines):**
- Re-exports all public APIs with proper type exports
- Single import point: `import { ... } from './utils/index.js'`

### File Size Breakdown

| File | Lines | Purpose |
|------|-------|---------|
| project.ts | 53 | Project creation and parsing |
| jsx-traversal.ts | 321 | JSX tree traversal and attribute extraction |
| text-extraction.ts | 68 | Text normalization and extraction |
| spread-resolution.ts | 100 | Spread attribute resolution |
| component-resolution.ts | 204 | Component import resolution |
| type-resolution.ts | 145 | Type import resolution |
| variable-extraction.ts | 431 | Variable, input, state, and render props extraction |
| index.ts | 68 | Barrel exports |
| **Total** | **1390** | **All utilities extracted** |

## Deviations from Plan

None - plan executed exactly as written. All files created with expected functionality and proper TypeScript compilation.

## Testing Approach

**Compilation verification:**
- Verified TypeScript compilation passes for all utils files
- Confirmed NodeNext .js import conventions work correctly
- Validated no circular import issues

**No runtime changes yet:**
- parser.ts not modified in this plan
- All utilities remain unused until 26-02
- Creates clean foundation for import updates

## Success Metrics

- [x] 8 utils files created with all parser.ts functions extracted
- [x] All files exceed minimum line counts specified in plan
- [x] TypeScript compilation passes without errors
- [x] Barrel export provides convenient import path
- [x] NodeNext .js extensions used throughout
- [x] All commits use proper feat(26-01) format

## Known Issues

**Temporary duplication:**
- extractTypeArguments exists in both component-resolution.ts and variable-extraction.ts
- Will be resolved when parser.ts is updated to import from utils/ in 26-02

**Pre-existing note in plan:**
- Plan mentioned pre-existing TypeScript error in build.ts:86
- This error does not actually exist - project compiles cleanly

## Next Phase Readiness

**Ready for 26-02:**
- All utilities extracted and available via barrel export
- parser.ts can now be updated to import from utils/
- No changes to parser.ts behavior expected

**Blockers:** None

**Dependencies satisfied:**
- No prior dependencies
- Creates foundation for remaining Phase 26 plans

## Lessons Learned

**Extraction strategy:**
- Extracting utilities without modifying original file creates clean, verifiable foundation
- Forward references handle circular dependencies elegantly
- Barrel exports provide single convenient import point

**Module boundaries:**
- Clear separation by responsibility improves maintainability
- Each module has focused purpose (project setup, JSX traversal, text extraction, etc.)
- Line counts validate substantial functionality in each module

**NodeNext compliance:**
- All .js extensions added correctly for ESM module resolution
- No TypeScript compilation issues with cross-module imports
- Type-only imports properly marked with `type` keyword
