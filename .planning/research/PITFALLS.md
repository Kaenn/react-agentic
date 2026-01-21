# Pitfalls Research: TSX-to-Markdown Transpiler

**Domain:** TSX/TypeScript transpiler with ts-morph for Claude Code commands
**Researched:** 2026-01-20
**Overall Confidence:** HIGH (verified against ts-morph docs, TypeScript Compiler API, and community issues)

---

## Critical Pitfalls

Mistakes that will cause project failure or require major rewrites.

### Pitfall 1: Generating Output Directly from Source AST

**What goes wrong:** Attempting to transform TSX directly to Markdown strings without an intermediate representation. This creates unmaintainable spaghetti code where parsing, transformation, and output generation are all tangled together.

**Why it happens:** Feels faster for a "simple" transpiler. The source-to-target path seems short enough to skip abstraction.

**Consequences:**
- Cannot easily add new elements without modifying core transform logic
- Error handling becomes scattered and inconsistent
- Testing requires full end-to-end setup for every case
- Edge cases proliferate without clear boundaries

**Prevention:**
1. Design a clear intermediate representation (IR) between TSX AST and Markdown output
2. Structure as: TSX Source -> ts-morph AST -> IR Nodes -> Markdown Strings
3. Each transformation phase has single responsibility
4. IR should be serializable for debugging and testing

**Detection (early warning signs):**
- Functions growing past 50 lines
- Same file handling both AST traversal and string concatenation
- Tests requiring full file fixtures instead of unit inputs

**Phase to address:** Phase 1 (Architecture) - establish IR pattern before any element implementations

**Sources:** [Strumenta - How to Write a Transpiler](https://tomassetti.me/how-to-write-a-transpiler/)

---

### Pitfall 2: Ignoring ts-morph Node Invalidation After Manipulation

**What goes wrong:** After modifying AST nodes, previously-obtained node references become invalid. Accessing properties on invalidated nodes throws errors.

**Why it happens:** ts-morph re-parses and rebuilds the AST after manipulations for correctness. Old node references point to stale data.

**Consequences:**
- Runtime crashes during transformation
- Unpredictable behavior in complex transforms
- Silent data corruption if errors are swallowed

**Prevention:**
1. For read-only operations (our case: parsing TSX), work in analysis-first mode
2. Complete all AST reads before any manipulations
3. If manipulation needed, use ts-morph's `forget()` method deliberately
4. Consider using ts-morph Structures (simplified AST) for generation

**Detection (early warning signs):**
- Random "node has been removed" errors
- Inconsistent test failures
- Errors that disappear when adding console.log statements

**Phase to address:** Phase 1 (Core Pipeline) - establish read-only traversal pattern

**Sources:** [ts-morph Performance Documentation](https://ts-morph.com/manipulation/performance)

---

### Pitfall 3: Conflating getType() with getTypeNode()

**What goes wrong:** Using `getType()` when `getTypeNode()` is needed (or vice versa) leads to incorrect type information extraction.

**Why it happens:** Naming is confusing. `getType()` returns the TypeChecker's computed type; `getTypeNode()` returns the actual AST node containing the type annotation.

**Consequences:**
- Props validation fails to catch actual type errors
- Generic type parameters resolve incorrectly
- Type inference behavior differs from expectations

**Prevention:**
1. Use [ts-ast-viewer.com](https://ts-ast-viewer.com/) to understand node structure
2. `getType()` (purple in viewer) = computed type from TypeChecker
3. `getTypeNode()` (blue in viewer) = AST syntax node
4. For props extraction, typically want `getType()` for resolved types

**Detection (early warning signs):**
- Type information coming back as `string` when expecting object
- Generic types not resolving to concrete types
- Differences between expected and actual prop types

**Phase to address:** Phase 2 (Element Handling) - when implementing props extraction

**Sources:** [ts-morph Navigation Documentation](https://ts-morph.com/navigation/)

---

### Pitfall 4: Generics vs JSX Opening Tags Parser Ambiguity

**What goes wrong:** TypeScript parser cannot distinguish `<T>` as a generic type parameter from `<T>` as a JSX opening tag.

**Why it happens:** JSX syntax conflicts with TypeScript generic syntax. This is a fundamental parser limitation.

**Consequences:**
- Arrow functions with generics fail to parse in TSX files
- Cryptic parser errors that confuse users
- Workarounds required for component type parameters

**Prevention:**
1. Document the constraint for users: use `<T,>` or `<T extends unknown>` syntax
2. Provide clear error messages when this pattern is detected
3. Consider supporting `.ts` files with JSX pragma for advanced cases
4. Add validation to catch common misformations early

**Detection (early warning signs):**
- Parser errors mentioning "JSX element" when user wrote generics
- Users reporting "works in VS Code, fails in transpiler"

**Phase to address:** Phase 3 (CLI/Error Handling) - clear error messages for this case

**Sources:** [TypeScript JSX Documentation](https://www.typescriptlang.org/docs/handbook/jsx.html), [TypeScript Parser Deep Dive](https://poteboy.dev/posts/20240802-ts-parser-eng)

---

### Pitfall 5: Not Handling JSX Children Manipulation Limitation

**What goes wrong:** ts-morph has incomplete JSX children manipulation support. `setChildren()` throws `NotImplementedError`.

**Why it happens:** JSX support in ts-morph is less mature than standard TypeScript. The source code literally says "not implemented."

**Consequences:**
- Cannot programmatically modify JSX children
- Workarounds required for any child manipulation
- May block certain transformation patterns

**Prevention:**
1. Use read-only traversal for our use case (we parse, not modify)
2. For any generation needs, use string templates via `setBodyText()`
3. Avoid patterns that require programmatic JSX construction
4. Work with raw text when structure manipulation hits limitations

**Detection (early warning signs):**
- `NotImplementedError` exceptions
- Features requiring "modify then emit" patterns

**Phase to address:** Phase 1 (Architecture) - design around read-only traversal

**Sources:** [ts-morph JSX Source](https://github.com/dsherret/ts-morph/blob/latest/packages/ts-morph/src/compiler/ast/jsx/JsxElement.ts), [Issue #240](https://github.com/dsherret/ts-morph/issues/240)

---

## Common Mistakes

Frequent errors that cause delays or technical debt.

### Mistake 1: Props Spreading Without Runtime Evaluation Awareness

**What goes wrong:** AST analysis cannot see runtime values of spread props. `{...props}` creates an opaque spread that can't be statically analyzed for content.

**Why it happens:** AST is static analysis. Spread values are only known at runtime.

**Prevention:**
1. Extract what CAN be known: spread expression name, source location
2. Document limitation clearly: spread props must be typed for compile-time checks
3. Consider requiring explicit type annotations on spread sources
4. For build-time transforms, evaluate only literal spreads

**Which phase:** Phase 2 (Props Handling) - design props extraction with this in mind

**Sources:** [JSX Spread Attributes](https://gist.github.com/sebmarkbage/07bbe37bc42b6d4aef81)

---

### Mistake 2: Watch Mode Without Proper Debouncing

**What goes wrong:** File system events fire multiple times per save. Without debouncing, the transpiler runs repeatedly for single saves.

**Why it happens:** Editors save files in multiple steps (write temp, rename, etc.). File watchers see each step.

**Prevention:**
1. Use `awaitWriteFinish` option in chokidar
2. Add debounce wrapper (250-500ms typical)
3. Track file content hashes to skip no-op rebuilds
4. Consider `atomic: true` for atomic write detection

**Which phase:** Phase 3 (CLI/Watch Mode) - implement debouncing from start

**Sources:** [chokidar debounce patterns](https://github.com/eklingen/watch-debounced), [chokidar awaitWriteFinish](https://github.com/paulmillr/chokidar)

---

### Mistake 3: JSX Whitespace Handling Inconsistencies

**What goes wrong:** JSX collapses whitespace differently than HTML. Unexpected whitespace in Markdown output.

**Why it happens:** JSX whitespace rules are subtle. Newlines between elements collapse, but text content whitespace is preserved.

**Prevention:**
1. Normalize whitespace in IR layer, not output layer
2. Test explicitly for whitespace edge cases
3. Use `<br/>` elements for intentional line breaks
4. Document whitespace behavior for users

**Which phase:** Phase 2 (Element Handling) - address early in element implementation

---

### Mistake 4: File Extension Detection Failures

**What goes wrong:** Parsing `.ts` files as TSX (or vice versa) causes parser errors or silent failures.

**Why it happens:** TypeScript compiler needs explicit file extension hints for JSX parsing mode.

**Prevention:**
1. Use file extension to set compiler options dynamically
2. For `.tsx`: `jsx: "preserve"` or `jsx: "react"`
3. For `.ts`: no JSX support, fail fast with clear error
4. Consider supporting JSX pragma comments in `.ts` files

**Which phase:** Phase 1 (Core Pipeline) - set up correct parsing modes

**Sources:** [TypeScript JSX Modes](https://www.typescriptlang.org/docs/handbook/jsx.html)

---

### Mistake 5: Error Messages Without Source Location

**What goes wrong:** User sees "Invalid element" without knowing where in their file the error occurred.

**Why it happens:** Error handling added as afterthought. Source positions not captured during traversal.

**Prevention:**
1. Every AST node has position info - always capture it
2. Wrap errors in custom error class with `{ line, column, file }` metadata
3. Format errors like TypeScript: `file.tsx(10,5): error TS0000: message`
4. Include source snippet in error when possible

**Which phase:** Phase 3 (CLI/Error Handling) - design error format before building

---

### Mistake 6: Catching All Errors as `any`

**What goes wrong:** TypeScript catches are `unknown` by default (strict mode). Using `any` loses type safety.

**Why it happens:** Quick fix for "error is unknown" compile errors.

**Prevention:**
1. Enable `useUnknownInCatchVariables` in tsconfig
2. Use `instanceof Error` narrowing in catch blocks
3. Create Result pattern for expected failures
4. Never throw strings, always throw Error instances

**Which phase:** Phase 1 (Foundation) - configure strict error handling from start

**Sources:** [TypeScript Error Handling Best Practices](https://medium.com/@arreyetta/error-handling-in-typescript-best-practices-80cdfe6d06db)

---

### Mistake 7: Performance Degradation with Large Files

**What goes wrong:** ts-morph re-parses after each manipulation, causing O(n^2) behavior on large files.

**Why it happens:** ts-morph optimizes for correctness over performance by default.

**Prevention:**
1. Batch all reads before any writes
2. Use Structures API for generation (simpler, faster)
3. Profile early with realistic file sizes
4. Consider per-file parallelization for multi-file builds

**Which phase:** Phase 4 (Optimization) - measure and optimize after core works

**Sources:** [ts-morph Performance](https://ts-morph.com/manipulation/performance)

---

### Mistake 8: Ignoring Component Composition Edge Cases

**What goes wrong:** Nested components, fragments, conditional rendering patterns fail to transform correctly.

**Why it happens:** Initial implementation handles simple cases. Complex patterns added as afterthought.

**Prevention:**
1. Define supported patterns upfront:
   - Simple elements: `<h1>text</h1>`
   - Nested elements: `<ul><li>item</li></ul>`
   - Component references: `<SharedSection />`
   - Conditional: `{condition && <Element />}`
   - Fragments: `<>...</>` or `<Fragment>...</Fragment>`
2. Decide unsupported patterns early with clear errors
3. Test composition patterns from Phase 2

**Which phase:** Phase 2 (Element Handling) - establish composition model early

---

## Prevention Strategies

### Strategy 1: Read-Only AST Traversal Pattern

**Applies to:** Pitfalls 2, 5

```typescript
// Good: Collect all data in single traversal pass
function collectElements(sourceFile: SourceFile): IRNode[] {
  const nodes: IRNode[] = [];

  sourceFile.forEachDescendant((node) => {
    if (Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)) {
      nodes.push(toIRNode(node)); // Extract all needed data here
    }
  });

  return nodes; // No further AST access after this
}

// Bad: Interleaved reading and manipulation
function transformBad(sourceFile: SourceFile) {
  sourceFile.forEachDescendant((node) => {
    // This may invalidate other nodes!
    node.replaceWithText(transform(node));
  });
}
```

### Strategy 2: Intermediate Representation Design

**Applies to:** Pitfall 1

```typescript
// Define clear IR types separate from AST and output
interface IRNode {
  type: 'element' | 'text' | 'component';
  tagName?: string;
  props?: Record<string, IRPropValue>;
  children?: IRNode[];
  sourceLocation: SourceLocation;
}

// Pipeline becomes testable at each stage
const pipeline = {
  parse: (tsx: string) => SourceFile,           // ts-morph
  extract: (ast: SourceFile) => IRNode,         // our logic
  transform: (ir: IRNode) => IRNode,            // optional transforms
  emit: (ir: IRNode) => string,                 // markdown output
};
```

### Strategy 3: Structured Error Handling

**Applies to:** Mistakes 5, 6

```typescript
// Custom error with source location
class TranspileError extends Error {
  constructor(
    message: string,
    public location: { file: string; line: number; column: number },
    public sourceSnippet?: string
  ) {
    super(message);
    this.name = 'TranspileError';
  }

  format(): string {
    return `${this.location.file}(${this.location.line},${this.location.column}): ${this.message}`;
  }
}

// Capture location from AST node
function createError(message: string, node: Node): TranspileError {
  const { line, column } = node.getStartLinePos();
  return new TranspileError(message, {
    file: node.getSourceFile().getFilePath(),
    line,
    column,
  });
}
```

### Strategy 4: Watch Mode Debouncing

**Applies to:** Mistake 2

```typescript
import chokidar from 'chokidar';
import { debounce } from 'lodash-es';

const rebuild = debounce((paths: string[]) => {
  console.log(`Rebuilding: ${paths.length} files changed`);
  // actual build logic
}, 300); // 300ms debounce

const watcher = chokidar.watch('src/**/*.tsx', {
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 50,
  },
});

const changedFiles = new Set<string>();

watcher.on('change', (path) => {
  changedFiles.add(path);
  rebuild([...changedFiles]);
  changedFiles.clear();
});
```

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|----------------|------------|
| Phase 1 | Core Pipeline | Direct AST-to-output (Pitfall 1) | Design IR first, implement elements second |
| Phase 1 | ts-morph Setup | Node invalidation (Pitfall 2) | Read-only traversal pattern |
| Phase 2 | JSX Elements | getType vs getTypeNode (Pitfall 3) | Use ts-ast-viewer to verify |
| Phase 2 | Props Handling | Spread props limitation (Mistake 1) | Document, require typed spreads |
| Phase 2 | Composition | Complex patterns (Mistake 8) | Define supported patterns upfront |
| Phase 3 | Parser Errors | Generics ambiguity (Pitfall 4) | Clear error messages |
| Phase 3 | Watch Mode | No debounce (Mistake 2) | awaitWriteFinish + debounce |
| Phase 3 | Error Handling | No source location (Mistake 5) | Capture location at parse time |
| Phase 4 | Performance | Large file slowdown (Mistake 7) | Structures API, batch reads |

---

## Sources

### Official Documentation
- [TypeScript JSX Documentation](https://www.typescriptlang.org/docs/handbook/jsx.html)
- [ts-morph Documentation](https://ts-morph.com/)
- [ts-morph Performance Guide](https://ts-morph.com/manipulation/performance)
- [TypeScript Compiler API Wiki](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)

### Community Resources
- [How to Write a Transpiler - Strumenta](https://tomassetti.me/how-to-write-a-transpiler/)
- [TypeScript Transformer Handbook](https://github.com/itsdouges/typescript-transformer-handbook)
- [TypeScript AST Viewer](https://ts-ast-viewer.com/)

### GitHub Issues
- [ts-morph Issue #240 - TSX Generation](https://github.com/dsherret/ts-morph/issues/240)
- [ts-morph Issue #897 - JSX Formatting](https://github.com/dsherret/ts-morph/issues/897)
- [TypeScript Issue #57054 - JSX Transform](https://github.com/microsoft/TypeScript/issues/57054)

### Best Practices
- [TypeScript Error Handling](https://medium.com/@arreyetta/error-handling-in-typescript-best-practices-80cdfe6d06db)
- [chokidar File Watching](https://github.com/paulmillr/chokidar)
