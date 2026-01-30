# Phase 20: Module Restructure - Research

**Researched:** 2026-01-26
**Domain:** TypeScript module organization with NodeNext ESM
**Confidence:** HIGH

## Summary

This phase splits jsx.ts (1044 lines, 56 exports) into organized `primitives/` and `workflow/` directories with clean re-exports. The project uses NodeNext module resolution with ESM output, which has specific requirements for file extensions and barrel exports.

**Key architectural decision:** The split follows a conceptual boundary where `primitives/` provides complete markdown building blocks (users can create any markdown output) while `workflow/` provides framework helpers for agentic flows (Command, Agent, State, Skill patterns).

**Primary recommendation:** Use explicit barrel exports with named re-exports (not `export *`) at jsx.ts to maintain API surface control, prevent circular dependencies, and enable tree-shaking. All internal imports must use `.js` extensions (TypeScript files import with `.js` extension, not `.ts`) to comply with NodeNext ESM requirements.

## Standard Stack

The project uses established TypeScript ESM patterns with NodeNext resolution.

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| TypeScript | 5.9.3 | Compilation | Current stable, NodeNext support |
| tsup | 8.5.1 | Build bundler | Fast ESM bundler with .d.ts generation |
| NodeNext | module resolution | ESM compliance | Enforces Node.js spec conformance |
| vitest | 4.0.17 | Testing | Fast ESM-native test runner |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ts-morph | 27.0.2 | AST manipulation | Already used in parser |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| NodeNext | moduleResolution: bundler | Bundler allows non-spec-compliant code, NodeNext ensures Node.js compatibility |
| Named exports | export * from | export * bloats dependency graph and prevents tree-shaking |

**Installation:**
No new dependencies required - this is a reorganization of existing code.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── jsx.ts                    # Main entry point - re-exports all components
├── primitives/               # Flat directory - basic building blocks
│   ├── markdown.ts          # Markdown, XmlBlock components
│   ├── variables.ts         # useVariable, Assign, VariableRef
│   └── control.ts           # If, Else, test builders (fileExists, etc.)
└── workflow/                 # Nested subdirs - framework helpers
    ├── Command.ts           # Command component (flat at top level)
    ├── agents/
    │   ├── Agent.ts         # Agent, SpawnAgent, OnStatus
    │   ├── index.ts         # Re-exports
    │   └── types.ts         # useOutput, OutputRef, AgentStatus, BaseOutput
    ├── state/
    │   ├── State.ts         # State, Operation components
    │   ├── ReadState.ts     # ReadState component
    │   ├── WriteState.ts    # WriteState component
    │   ├── types.ts         # useStateRef, StateRef, SQLiteConfig
    │   └── index.ts         # Re-exports
    ├── skill/
    │   ├── Skill.ts         # Skill, SkillFile, SkillStatic
    │   └── index.ts         # Re-exports
    └── sections/            # Empty directory ready for Phase 22
        └── index.ts         # Empty re-export file
```

### Pattern 1: Barrel Export with Named Re-exports
**What:** Central entry point re-exports all components with explicit names
**When to use:** Maintaining public API surface during refactoring

**Example:**
```typescript
// jsx.ts - Main entry point
// Named re-exports (not export *) for API control
export {
  Markdown,
  XmlBlock,
} from './primitives/markdown.js';

export {
  useVariable,
  Assign,
  type VariableRef,
  type AssignProps,
} from './primitives/variables.js';

export {
  Command,
  type CommandProps,
} from './workflow/Command.js';

export {
  Agent,
  SpawnAgent,
  OnStatus,
  useOutput,
  type AgentProps,
  type OutputRef,
  type AgentStatus,
  type BaseOutput,
} from './workflow/agents/index.js';
```

### Pattern 2: NodeNext File Extensions
**What:** Import TypeScript files using `.js` extension (not `.ts`)
**When to use:** Always with NodeNext module resolution

**Example:**
```typescript
// primitives/variables.ts
import type { ReactNode } from 'react';

export interface VariableRef<T = string> {
  name: string;
  ref: string;
  _type?: T;
}

export function useVariable<T = string>(name: string): VariableRef<T> {
  return { name, ref: name };
}
```

```typescript
// primitives/control.ts
import { VariableRef } from './variables.js';  // ← .js extension, not .ts

export function fileExists(varRef: VariableRef): string {
  return `[ -f $${varRef.name} ]`;
}
```

### Pattern 3: Subdirectory Index Files
**What:** Each workflow subdirectory has index.ts for clean internal organization
**When to use:** Multi-file subdirectories

**Example:**
```typescript
// workflow/agents/index.ts
export { Agent, SpawnAgent, OnStatus } from './Agent.js';
export { useOutput, type OutputRef, type AgentStatus, type BaseOutput } from './types.js';
export type { AgentProps, SpawnAgentProps, OnStatusProps } from './Agent.js';
```

### Pattern 4: Component Grouping by Cohesion
**What:** Group components that work together or share types
**When to use:** Splitting large files

**Primitives grouping:**
- `markdown.ts`: Markdown, XmlBlock (basic document building blocks)
- `variables.ts`: useVariable, Assign, VariableRef (variable system)
- `control.ts`: If, Else, test builders (control flow)

**Workflow grouping:**
- `agents/`: Agent, SpawnAgent, OnStatus, useOutput (agent lifecycle)
- `state/`: State, Operation, ReadState, WriteState, useStateRef (state management)
- `skill/`: Skill, SkillFile, SkillStatic (skill system)

### Anti-Patterns to Avoid
- **export * from**: Bloats dependency graph, prevents tree-shaking, obscures API surface
- **Relative paths without extensions**: Breaks with NodeNext - all imports need `.js`
- **Importing .ts extensions**: TypeScript files must import with `.js` extension for ESM output
- **Circular dependencies**: Easy to create with barrels - keep dependencies unidirectional

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Module splitting automation | Custom script | Manual refactor with TypeScript compiler verification | TypeScript compiler catches all import errors at build time - better than custom tooling |
| Import path updates | Find/replace script | TypeScript language service (rename symbol) | Language service understands scope, prevents collisions |
| Re-export validation | Custom test | TypeScript compiler + existing unit tests | Compiler ensures type correctness, tests verify runtime behavior |
| File extension rewriting | Post-processor | Write .js in source | NodeNext requires .js extensions in source - tools like tsc-esm-fix are workarounds for legacy code |

**Key insight:** TypeScript's type system is the validation tool - if it compiles without errors and tests pass, the refactor is correct. Don't build custom validation.

## Common Pitfalls

### Pitfall 1: Using export * from with Barrels
**What goes wrong:** All exports become coupled, dependency graph bloats, tree-shaking breaks
**Why it happens:** export * is convenient and seems DRY
**How to avoid:** Use explicit named re-exports at each barrel

**Warning signs:**
- Build times increase after adding barrel files
- Bundle size increases despite importing single component
- Circular dependency warnings appear

**Example:**
```typescript
// ❌ BAD - export * couples everything
export * from './primitives/markdown.js';
export * from './primitives/variables.js';

// ✅ GOOD - explicit named exports
export {
  Markdown,
  XmlBlock,
  type MarkdownProps,
  type XmlBlockProps,
} from './primitives/markdown.js';
```

### Pitfall 2: Forgetting .js Extensions in Imports
**What goes wrong:** TypeScript compiles but Node.js runtime fails with ERR_MODULE_NOT_FOUND
**Why it happens:** TypeScript files have .ts extension, developers naturally write imports with .ts or no extension
**How to avoid:** Always use .js extension in import statements (even in .ts files)

**Warning signs:**
- "Cannot find module" errors at runtime
- Module resolution errors only in Node.js, not during tsc compilation

**Example:**
```typescript
// ❌ BAD - missing extension
import { useVariable } from './variables';

// ❌ BAD - .ts extension
import { useVariable } from './variables.ts';

// ✅ GOOD - .js extension in .ts source file
import { useVariable } from './variables.js';
```

### Pitfall 3: Breaking Existing Imports
**What goes wrong:** User code that imports from jsx.ts breaks after restructure
**Why it happens:** Forgot to re-export component from jsx.ts
**How to avoid:** Keep jsx.ts as the single public entry point, maintain all existing exports

**Warning signs:**
- Import errors in src/app/ test files after refactor
- TypeScript errors about missing exports

**Verification:**
```bash
# Before refactor - capture current exports
grep "^export" src/jsx.ts > /tmp/jsx-exports-before.txt

# After refactor - verify all exports still available
grep "^export" src/jsx.ts > /tmp/jsx-exports-after.txt
diff /tmp/jsx-exports-before.txt /tmp/jsx-exports-after.txt

# Should be identical (or only additions)
```

### Pitfall 4: Circular Dependencies Between Modules
**What goes wrong:** Module A imports B, B imports A → runtime initialization errors
**Why it happens:** Barrel files make it easy to create accidental cycles
**How to avoid:** Keep dependency flow unidirectional (primitives ← workflow ← jsx.ts)

**Warning signs:**
- Undefined values at runtime despite correct types
- "Cannot access X before initialization" errors

**Prevention rule:**
```
primitives/        → No imports from workflow/
  ↓
workflow/          → Can import from primitives/, not each other's subdirs
  ↓
jsx.ts             → Only imports, never imported by internal modules
```

### Pitfall 5: Type-Only vs Value Exports
**What goes wrong:** Mixing type and value exports without clear distinction
**Why it happens:** TypeScript allows both, but bundlers may treat them differently
**How to avoid:** Use `type` keyword for type-only exports explicitly

**Example:**
```typescript
// ✅ GOOD - explicit type exports
export { useVariable, Assign } from './variables.js';
export type { VariableRef, AssignProps } from './variables.js';

// Also acceptable - inline type keyword
export { useVariable, Assign, type VariableRef, type AssignProps } from './variables.js';
```

## Code Examples

Verified patterns for this refactor:

### Splitting a Large File
```typescript
// BEFORE: jsx.ts (1044 lines)
export function Markdown(_props: MarkdownProps): null { return null; }
export function XmlBlock(_props: XmlBlockProps): null { return null; }
export function useVariable<T = string>(name: string): VariableRef<T> { /* ... */ }
// ... 53 more exports

// AFTER: primitives/markdown.ts (simple, focused)
import type { ReactNode } from 'react';

export interface MarkdownProps {
  children?: ReactNode;
}

export interface XmlBlockProps {
  name: string;
  children?: ReactNode;
}

export function Markdown(_props: MarkdownProps): null {
  return null;
}

export function XmlBlock(_props: XmlBlockProps): null {
  return null;
}
```

### Barrel Re-export Pattern
```typescript
// workflow/agents/index.ts
export { Agent, SpawnAgent, OnStatus } from './Agent.js';
export { useOutput } from './types.js';
export type { AgentProps, SpawnAgentProps, OnStatusProps } from './Agent.js';
export type { OutputRef, AgentStatus, BaseOutput } from './types.js';

// jsx.ts - main entry point
export {
  Agent,
  SpawnAgent,
  OnStatus,
  useOutput,
  type AgentProps,
  type SpawnAgentProps,
  type OnStatusProps,
  type OutputRef,
  type AgentStatus,
  type BaseOutput,
} from './workflow/agents/index.js';
```

### Testing Backward Compatibility
```typescript
// tests/integration/jsx-exports.test.ts
import { describe, it, expect } from 'vitest';

describe('jsx.ts exports - backward compatibility', () => {
  it('exports all primitive components', async () => {
    const jsx = await import('../../src/jsx.js');

    expect(jsx.Markdown).toBeDefined();
    expect(jsx.XmlBlock).toBeDefined();
    expect(jsx.useVariable).toBeDefined();
    expect(jsx.Assign).toBeDefined();
    expect(jsx.If).toBeDefined();
    expect(jsx.Else).toBeDefined();
  });

  it('exports all workflow components', async () => {
    const jsx = await import('../../src/jsx.js');

    expect(jsx.Command).toBeDefined();
    expect(jsx.Agent).toBeDefined();
    expect(jsx.SpawnAgent).toBeDefined();
    expect(jsx.Skill).toBeDefined();
    expect(jsx.State).toBeDefined();
  });

  it('exports all types', () => {
    // Type-only test - will fail at compile time if types missing
    type _CommandPropsTest = import('../../src/jsx.js').CommandProps;
    type _AgentPropsTest = import('../../src/jsx.js').AgentProps;
    type _VariableRefTest = import('../../src/jsx.js').VariableRef;
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic jsx.ts | Split primitives/ + workflow/ | Phase 20 (v2.0) | Enables semantic components in Phase 22 |
| export * from | Named re-exports | Best practice 2025-2026 | Better tree-shaking, API control |
| moduleResolution: node | moduleResolution: NodeNext | TypeScript 4.7+ (2022) | ESM spec compliance |
| .ts extensions | .js extensions in imports | NodeNext requirement | Runtime compatibility |

**Current best practices (2026):**
- NodeNext for Node.js compatibility over bundler mode
- Explicit named exports over export * for barrel files
- .js extensions in source code imports (not post-processing)
- Flat file structure for primitives, nested for complex domains (workflow)

**Deprecated/outdated:**
- moduleResolution: node (classic resolution)
- export * from for public API barrels
- tsc-esm-fix and similar post-processors (workarounds for legacy code - write .js in source instead)

## Open Questions

### 1. Type Re-export Strategy
**What we know:** Types can be re-exported inline (`type TypeName`) or separately (`export type { }`)
**What's unclear:** Performance/bundle size impact of inline vs separate type exports
**Recommendation:** Use inline `type` keyword for consistency with TypeScript 5.x best practices - modern bundlers handle it correctly

**Example:**
```typescript
// Both work, inline is preferred for clarity
export { Agent, type AgentProps } from './Agent.js';
```

### 2. Empty sections/ Directory
**What we know:** sections/ should be empty, ready for Phase 22 semantic components
**What's unclear:** Should it have index.ts now or add it in Phase 22?
**Recommendation:** Add index.ts now with empty export to establish the pattern:

```typescript
// workflow/sections/index.ts
// Placeholder for Phase 22 semantic components
// This file will re-export semantic wrapper components
export {};
```

### 3. Exact File Names for Primitives
**What we know:** Lowercase, simplified names preferred
**What's unclear:** Exact names for best clarity
**Recommendation:**
- `markdown.ts` (Markdown, XmlBlock)
- `variables.ts` (useVariable, Assign, VariableRef)
- `control.ts` (If, Else, all test builders)

### 4. Hooks Placement Strategy
**What we know:** Hooks should live with their domain
**What's unclear:** Split types.ts or keep with components?
**Recommendation:**
- Keep hooks with components when tightly coupled (useVariable in variables.ts)
- Separate types.ts when shared across multiple components (agents/types.ts for OutputRef, AgentStatus, BaseOutput)

## Sources

### Primary (HIGH confidence)
- [TypeScript Official: Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html) - NodeNext requirements
- [TypeScript Official: Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html) - ES modules guidance
- [Andrew Branch: Is NodeNext right for libraries?](https://blog.andrewbran.ch/is-nodenext-right-for-libraries-that-dont-target-node-js/) - NodeNext vs Bundler analysis
- [Frontend Patterns: Barrel Export](https://frontendpatterns.dev/barrel-export/) - Barrel pattern pros/cons
- [Total TypeScript: Explicit File Extensions](https://www.totaltypescript.com/relative-import-paths-need-explicit-file-extensions-in-ecmascript-imports) - .js extension requirement

### Secondary (MEDIUM confidence)
- [DEV: Barrel files and why you should STOP using them](https://dev.to/tassiofront/barrel-files-and-why-you-should-stop-using-them-now-bc4) - Performance issues with export *
- [Medium: Taming Circular Dependencies](https://medium.com/inkitt-tech/taming-circular-dependencies-in-typescript-d63df1ec8c80) - Circular dependency patterns
- [Medium: TypeScript and ES Modules Best Practices](https://medium.com/@robinviktorsson/typescript-and-es-modules-best-practices-for-imports-and-exports-9ce200e75a88) - Export strategies
- [WebDevTutor: Splitting TypeScript Modules](https://www.webdevtutor.net/blog/typescript-split-module-into-multiple-files) - Module organization patterns
- [GitHub: Breaking Changes Wiki](https://github.com/microsoft/TypeScript/wiki/Breaking-Changes) - TypeScript export behavior changes

### Tertiary (LOW confidence)
- [NamasteDev: Barrel Pattern Overview](https://namastedev.com/blog/understanding-the-barrel-pattern-in-javascript-typescript/) - General barrel pattern explanation
- [Medium: Why Barrel Files Brought Trouble](https://medium.com/@unrealandychan/why-barrel-files-brought-me-too-much-trouble-in-development-a-developers-journey-away-from-f19522d4bd21) - Anecdotal experience

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - tsconfig.json and package.json confirm versions, NodeNext well-documented
- Architecture: HIGH - Official TypeScript documentation + community best practices align
- Pitfalls: HIGH - Multiple authoritative sources confirm barrel export issues and NodeNext requirements

**Research date:** 2026-01-26
**Valid until:** 90 days (stable ecosystem - TypeScript module system mature)
