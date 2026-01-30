# Phase 26: Parser Refactoring - Research

**Researched:** 2026-01-27
**Domain:** TypeScript module splitting with NodeNext ESM
**Confidence:** HIGH

## Summary

This phase splits two monolithic parser files into organized submodules for maintainability:
- `parser.ts` (1255 lines) - JSX parsing and AST extraction utilities
- `transformer.ts` (3956 lines) - JSX AST to IR node transformation

The project has successfully completed a similar refactoring in Phase 20, which split `jsx.ts` (1044 lines) into `primitives/` and `workflow/` directories. This phase follows the same proven patterns: flat directory for parser utilities, nested subdirectory for transformer component groups, barrel exports via `index.ts`, and `.js` extensions for NodeNext compliance.

**Key architectural insight:** The transformer file contains a single large `Transformer` class with 50+ methods. The refactoring should group related transform methods into separate modules (e.g., `transformers/document.ts` for Command/Agent/Skill, `transformers/semantic.ts` for Table/List/ExecutionContext, `transformers/control.ts` for If/Else/Loop). The main Transformer class becomes a coordinator that delegates to specialized transformer functions.

**Primary recommendation:** Split parser/ into `utils/` (for parser.ts utilities) and `transformers/` (for transformer.ts component handlers). Keep the Transformer class in `transformer.ts` as the entry point, but extract transform methods into focused modules. Use named re-exports in `parser/index.ts` to maintain backward compatibility.

## Standard Stack

The project uses established TypeScript ESM patterns identical to Phase 20.

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| TypeScript | 5.9.3 | Compilation | Current stable, NodeNext support |
| ts-morph | 27.0.2 | AST manipulation | Core parsing library used throughout |
| tsup | 8.5.1 | Build bundler | Fast ESM bundler with .d.ts generation |
| NodeNext | module resolution | ESM compliance | Enforces Node.js spec conformance |
| vitest | 4.0.17 | Testing | Fast ESM-native test runner |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ts-morph | 27.0.2 | AST types | Type imports for Node, JsxElement, etc. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Keep single class | Split to classes per domain | Single class simpler; splitting methods into functions better for tree-shaking |
| Named exports | export * from | export * bloats dependency graph |
| Flat utils/ | Nested utils/ast/, utils/text/ | Flat simpler for 1255 lines, nesting for 3956 |

**Installation:**
No new dependencies required - this is a reorganization of existing code.

## Architecture Patterns

### Recommended Project Structure
```
src/parser/
├── index.ts                    # Main entry point - re-exports all public APIs
├── parser.ts                   # Slim entry: createProject, parseFile, parseSource (re-export only)
├── transformer.ts              # Slim entry: Transformer class (delegates to transformers/)
├── utils/                      # Flat directory - parser.ts utilities
│   ├── project.ts             # createProject, parseFile, parseSource
│   ├── jsx-traversal.ts       # getElementName, getJsxChildren, getAttributeValue
│   ├── text-extraction.ts     # extractText, extractInlineText, normalizeWhitespace
│   ├── spread-resolution.ts   # resolveSpreadAttribute, extractObjectLiteralProps
│   ├── component-resolution.ts # resolveComponentImport, extractJsxFromComponent
│   ├── type-resolution.ts     # resolveTypeImport, extractInterfaceProperties
│   ├── variable-extraction.ts # extractVariableDeclarations, extractStateSchema
│   └── index.ts               # Barrel exports for utils/
└── transformers/              # Component-grouped transform methods
    ├── document.ts            # transformCommand, transformAgent, transformSkill, transformMCPConfig, transformState
    ├── html.ts                # transformList, transformListItem, transformBlockquote, transformCodeBlock, transformDiv
    ├── inline.ts              # transformInlineChildren, transformToInline, transformInlineElement, transformLink
    ├── semantic.ts            # transformTable, transformPropList, transformExecutionContext, transformSuccessCriteria
    ├── control.ts             # transformIf, transformElse, transformLoop, transformOnStatus
    ├── spawner.ts             # transformSpawnAgent and all helper methods (extractAgentProp, extractInputProp)
    ├── variables.ts           # transformAssign, transformAssignGroup, extractAssignPropValue
    ├── state.ts               # transformReadState, transformWriteState, extractStateKey
    ├── primitives.ts          # transformStep, transformBash, transformReadFiles, transformPromptTemplate
    ├── markdown.ts            # transformMarkdown, transformXmlBlock, transformXmlSection
    ├── types.ts               # Shared types (RenderPropsContext, etc.)
    └── index.ts               # Barrel exports for transformers/
```

### Pattern 1: Transformer Method Extraction
**What:** Extract transform methods from class into standalone functions
**When to use:** When class has 50+ methods and needs modularization

**Example:**
```typescript
// transformers/document.ts
import type { JsxElement, JsxSelfClosingElement, SourceFile } from 'ts-morph';
import type { DocumentNode, AgentDocumentNode } from '../../ir/index.js';
import type { TransformContext } from './types.js';

export function transformCommand(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): DocumentNode {
  // Implementation extracted from Transformer class
}

export function transformAgent(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): AgentDocumentNode {
  // Implementation extracted from Transformer class
}
```

### Pattern 2: Transform Context Object
**What:** Pass shared state through context object instead of class instance
**When to use:** When splitting class methods into functions

**Example:**
```typescript
// transformers/types.ts
import type { SourceFile } from 'ts-morph';
import type { ExtractedVariable } from '../utils/variable-extraction.js';

export interface TransformContext {
  sourceFile: SourceFile | undefined;
  visitedPaths: Set<string>;
  variables: Map<string, ExtractedVariable>;
  outputs: Map<string, string>;
  stateRefs: Map<string, string>;
  renderPropsContext: RenderPropsContext | undefined;
  createError: (message: string, node: import('ts-morph').Node) => Error;
}

export interface RenderPropsContext {
  paramName: string;
  values: Record<string, string>;
}
```

### Pattern 3: Coordinator Class
**What:** Keep Transformer class as thin coordinator that delegates to modules
**When to use:** When preserving public API while splitting implementation

**Example:**
```typescript
// transformer.ts (slim coordinator)
import { transformCommand, transformAgent } from './transformers/document.js';
import { transformIf, transformElse } from './transformers/control.js';
import type { TransformContext } from './transformers/types.js';

export class Transformer {
  private ctx: TransformContext;

  constructor() {
    this.ctx = this.createContext();
  }

  transform(node: JsxElement | JsxFragment, sourceFile?: SourceFile): DocumentNode {
    this.initContext(sourceFile);
    const name = getElementName(node);
    if (name === 'Command') return transformCommand(node, this.ctx);
    if (name === 'Agent') return transformAgent(node, this.ctx);
    // ... delegate to other transformers
  }
}
```

### Pattern 4: Preserving Backward Compatibility
**What:** Keep parser/index.ts exporting all public APIs unchanged
**When to use:** Always for refactoring phases

**Example:**
```typescript
// parser/index.ts (unchanged public API)
// Parser utilities - re-export all from utils/
export {
  createProject,
  parseFile,
  parseSource,
  type CreateProjectOptions,
} from './utils/index.js';

export {
  getElementName,
  getAttributeValue,
  getArrayAttributeValue,
  // ... all other exports
} from './utils/index.js';

// Transformer - re-export from transformer.ts
export { Transformer, transform } from './transformer.js';
```

### Anti-Patterns to Avoid
- **Circular dependencies between transformers:** Keep dependency flow unidirectional (utils <- transformers <- transformer.ts <- index.ts)
- **Importing from transformer.ts inside transformers/:** Transformers import from utils/ only, not from each other
- **Breaking public API:** All existing exports from parser/index.ts must remain available
- **Missing .js extensions:** NodeNext requires .js extensions in all imports

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Method extraction automation | Custom script | Manual refactor with IDE | TypeScript compiler catches import errors |
| Import path updates | Find/replace | IDE rename symbol | Understands scope, prevents collisions |
| API compatibility check | Custom test | TypeScript compiler + existing tests | Compiler ensures types, tests verify runtime |
| Circular dependency detection | Custom tool | TypeScript build errors | Compiler detects cycles naturally |

**Key insight:** TypeScript's type system is the validation tool. If it compiles without errors and all 5 existing parser tests pass, the refactor is correct.

## Common Pitfalls

### Pitfall 1: Breaking Class Method References
**What goes wrong:** Methods that call `this.transformXxx()` break when extracted to standalone functions
**Why it happens:** Forgetting to replace `this.` calls with explicit function imports
**How to avoid:** Search for all `this.transform` calls in each method being extracted, convert to function calls

**Warning signs:**
- TypeScript errors about `this` being undefined
- Runtime errors about method not found

**Example fix:**
```typescript
// BEFORE (in class):
private transformElement(name: string, node: Node): BlockNode {
  if (name === 'ul') return this.transformList(node, false);
}

// AFTER (in transformers/html.ts):
import { transformList } from './html.js';

export function transformElement(name: string, node: Node, ctx: TransformContext): BlockNode {
  if (name === 'ul') return transformList(node, false, ctx);
}
```

### Pitfall 2: Context State Initialization
**What goes wrong:** Extracted functions don't have access to initialized state (variables, outputs, stateRefs)
**Why it happens:** State was initialized in transform() method and stored on class instance
**How to avoid:** Pass fully initialized TransformContext to all extracted functions

**Warning signs:**
- undefined errors when accessing variables map
- Empty output from transformSpawnAgent

**Prevention:**
```typescript
// transformer.ts
transform(node: JsxElement, sourceFile?: SourceFile): DocumentNode {
  // Initialize context FIRST
  this.ctx.sourceFile = sourceFile;
  this.ctx.variables = extractVariableDeclarations(sourceFile);
  this.ctx.outputs = this.extractOutputDeclarations(sourceFile);
  // THEN call transformers
  return transformDocument(node, this.ctx);
}
```

### Pitfall 3: Recursive Transform Calls
**What goes wrong:** Methods like transformBlockChildren call transformToBlock, which calls transformElement, which calls other transforms
**Why it happens:** Deep call chains where each method needs full context
**How to avoid:** Create a transform dispatcher function that all modules import

**Warning signs:**
- Circular import errors between transformer modules
- Stack overflows from incorrect recursion

**Solution:**
```typescript
// transformers/dispatch.ts
import type { Node } from 'ts-morph';
import type { BlockNode } from '../../ir/index.js';
import type { TransformContext } from './types.js';

// Import all transform functions
import { transformCommand, transformAgent } from './document.js';
import { transformIf, transformElse } from './control.js';
// ...

export function dispatchTransform(node: Node, ctx: TransformContext): BlockNode | null {
  // Central dispatch logic - prevents circular imports
}
```

### Pitfall 4: Forgetting Private Helper Methods
**What goes wrong:** Helper methods like `extractAgentProp`, `getBooleanAttribute`, `createError` get lost
**Why it happens:** Focus on public transform methods, forget private helpers they depend on
**How to avoid:** For each transform method, trace all `this.` calls and extract those too

**Warning signs:**
- Missing method errors after initial split
- Undefined helper functions

**Checklist for each transformer file:**
- [ ] List all transform methods going into this file
- [ ] For each method, list all `this.xxx` calls
- [ ] Include helper methods in same file OR import from utils/
- [ ] Verify no remaining `this.` references

### Pitfall 5: Test File Updates
**What goes wrong:** Existing tests import from parser/transformer.ts directly and break
**Why it happens:** Tests may import internal methods not exposed in index.ts
**How to avoid:** Run all tests after each major change, fix import paths

**Warning signs:**
- "Module not found" errors in tests
- Type errors in test files

**Verification:**
```bash
npm run test -- tests/parser/
```

## Code Examples

Verified patterns from Phase 20 research and codebase analysis:

### Parser Utilities Split (from parser.ts)
```typescript
// utils/project.ts - 50 lines
import { Project, SourceFile, ScriptTarget, ModuleKind, ts } from 'ts-morph';

export interface CreateProjectOptions {
  inMemory?: boolean;
}

export function createProject(options: CreateProjectOptions = {}): Project {
  return new Project({
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
    },
    useInMemoryFileSystem: options.inMemory ?? false,
  });
}

export function parseFile(project: Project, filePath: string): SourceFile {
  return project.addSourceFileAtPath(filePath);
}

export function parseSource(
  project: Project,
  source: string,
  fileName = 'source.tsx'
): SourceFile {
  return project.createSourceFile(fileName, source, { overwrite: true });
}
```

```typescript
// utils/jsx-traversal.ts - ~200 lines
import {
  Node,
  JsxElement,
  JsxSelfClosingElement,
  JsxOpeningElement,
  JsxText,
  JsxExpression,
} from 'ts-morph';

export function getElementName(
  node: JsxElement | JsxSelfClosingElement
): string {
  if (Node.isJsxElement(node)) {
    return node.getOpeningElement().getTagNameNode().getText();
  }
  return node.getTagNameNode().getText();
}

export type JsxChild = JsxElement | JsxSelfClosingElement | JsxText | JsxExpression;

export function getJsxChildren(node: JsxElement): JsxChild[] {
  return node.getJsxChildren() as JsxChild[];
}

// ... other traversal utilities
```

### Transformer Method Extraction
```typescript
// transformers/document.ts - ~300 lines
import { Node, JsxElement, JsxSelfClosingElement } from 'ts-morph';
import type { DocumentNode, AgentDocumentNode, AgentFrontmatterNode } from '../../ir/index.js';
import type { TransformContext } from './types.js';
import { getElementName, getAttributeValue } from '../utils/jsx-traversal.js';
import { analyzeRenderPropsChildren, extractTypeArguments } from '../utils/index.js';
import { transformBlockChildren, transformArrowFunctionBody } from './shared.js';

export function transformCommand(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): DocumentNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  const props = mergeCommandProps(openingElement);
  const name = props.name as string | undefined;
  const description = props.description as string | undefined;

  if (!name) {
    throw ctx.createError('Command requires name prop', openingElement);
  }
  if (!description) {
    throw ctx.createError('Command requires description prop', openingElement);
  }

  // Build frontmatter...
  // Transform children...

  return { kind: 'document', frontmatter, children };
}
```

### Utils Barrel Export
```typescript
// utils/index.ts
// Project creation and parsing
export {
  createProject,
  parseFile,
  parseSource,
  type CreateProjectOptions,
} from './project.js';

// JSX traversal
export {
  getElementName,
  getJsxChildren,
  getAttributeValue,
  getArrayAttributeValue,
  getTestAttributeValue,
  type JsxChild,
} from './jsx-traversal.js';

// Text extraction
export {
  extractText,
  extractInlineText,
  normalizeWhitespace,
  isWhitespaceOnlyText,
} from './text-extraction.js';

// Spread resolution
export {
  resolveSpreadAttribute,
  extractObjectLiteralProps,
} from './spread-resolution.js';

// Component resolution
export {
  resolveComponentImport,
  extractJsxFromComponent,
  type ResolvedComponent,
} from './component-resolution.js';

// Type resolution
export {
  resolveTypeImport,
  extractInterfaceProperties,
  extractPromptPlaceholders,
  type ResolvedType,
  type InterfaceProperty,
} from './type-resolution.js';

// Variable extraction
export {
  extractVariableDeclarations,
  extractStateSchema,
  extractSqlArguments,
  extractInputObjectLiteral,
  extractTypeArguments,
  analyzeRenderPropsChildren,
  isVariableRef,
  type ExtractedVariable,
  type RenderPropsInfo,
} from './variable-extraction.js';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic parser.ts | Split utils/ modules | Phase 26 (v2.1) | Easier navigation, focused files |
| 3956-line Transformer class | Coordinator + transformers/ | Phase 26 (v2.1) | Maintainability, testability |
| All methods in one file | Domain-grouped transformer files | Phase 26 (v2.1) | Faster editing, better code review |

**Current best practices (2026):**
- Domain-grouped modules over single large files
- Functions over class methods for better tree-shaking
- Context objects for state passing
- Barrel exports for clean public API
- NodeNext .js extensions throughout

**Deprecated/outdated:**
- export * from for barrels
- Classes with 50+ methods
- moduleResolution: node (use NodeNext)

## Open Questions

### 1. Transformer Class vs Pure Functions
**What we know:** Transformer class has state (sourceFile, variables, outputs, stateRefs, renderPropsContext)
**What's unclear:** Should we keep class or convert to pure functions with context?
**Recommendation:** Keep thin Transformer class as public API coordinator, extract methods to pure functions. This maintains backward compatibility while enabling better testing and tree-shaking.

### 2. Test File Location
**What we know:** Tests exist in tests/parser/ with imports like `../../src/parser/transformer.js`
**What's unclear:** Should internal modules have dedicated test files?
**Recommendation:** Keep existing test files as integration tests. If individual transformer modules need unit tests, add them to tests/parser/transformers/ mirroring the source structure.

### 3. Dispatcher vs Direct Imports
**What we know:** transformBlockChildren calls transformToBlock which calls many transform functions
**What's unclear:** Central dispatcher function vs direct cross-imports between transformers?
**Recommendation:** Create `transformers/dispatch.ts` with central `dispatchBlockTransform` and `dispatchInlineTransform` functions to prevent circular imports between domain modules.

### 4. Error Handling
**What we know:** Transformer class has `createError` method using source location
**What's unclear:** How to handle errors in extracted functions?
**Recommendation:** Include `createError` in TransformContext, passed to all transformer functions.

## Sources

### Primary (HIGH confidence)
- Phase 20 Research (`.planning/phases/20-module-restructure/20-RESEARCH.md`) - Verified patterns
- Phase 20 Plans (`.planning/phases/20-module-restructure/20-01-PLAN.md`) - Implementation approach
- Current codebase (src/parser/parser.ts, src/parser/transformer.ts) - Actual structure
- Current tests (tests/parser/*.test.ts) - Existing test patterns

### Secondary (MEDIUM confidence)
- TypeScript NodeNext documentation - Module resolution requirements
- jsx.ts structure - Verified barrel export patterns

### Tertiary (LOW confidence)
- General module splitting patterns - Adapted from various TypeScript projects

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Same as Phase 20, verified in tsconfig.json
- Architecture: HIGH - Based on successful Phase 20 patterns
- Pitfalls: HIGH - Derived from actual codebase analysis

**Research date:** 2026-01-27
**Valid until:** 90 days (stable patterns - internal refactoring)
