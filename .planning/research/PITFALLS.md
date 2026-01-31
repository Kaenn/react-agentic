# Pitfalls Research: Primitive/Composite Refactoring

**Domain:** Refactoring TSX-to-Markdown compiler from monolithic to primitive/composite architecture
**Researched:** 2026-01-31
**Overall Confidence:** HIGH for architectural pitfalls, MEDIUM for migration-specific risks

---

## Executive Summary

The react-agentic refactoring from monolithic component handling to primitive/composite split carries distinct risks:

1. **Architectural risks:** Creating a "distributed monolith" where composites remain tightly coupled to compiler internals
2. **Type system risks:** Breaking discriminated union exhaustiveness during IR node migration
3. **Backwards compatibility risks:** Changing behavior for existing components without clear migration path

The codebase has ~37 transformer modules in `src/parser/transformers/` and discriminated union IR nodes in `src/ir/nodes.ts`. The refactoring must preserve behavior for all existing components while enabling user-defined composites.

---

## Critical Pitfalls

Mistakes that will cause project failure or require major rewrites.

### Pitfall 1: Distributed Monolith - Composites That Still Need Compiler Knowledge

**What goes wrong:** Composites are moved to user TSX functions but still require internal compiler behavior to work correctly. The `transformCustomComponent` function in `markdown.ts` resolves and inlines user components, but if composites depend on specific transformation ordering, context propagation, or IR node generation, they become "distributed" but still coupled.

**Why it happens:** The current codebase shows evidence of deep coupling:
- `transformBlockChildren` in `dispatch.ts` handles If/Else sibling pairing specially
- `TransformContext` carries state that affects child transformations
- Some components emit IR nodes that require specific emitter handling

When moving to composites, developers may create functions that look independent but secretly depend on being called in specific transformer contexts.

**Consequences:**
- Composites work when used one way but break when composed differently
- Users create composites that silently produce incorrect Markdown
- Debugging requires understanding compiler internals, defeating the purpose of composites

**Warning signs:**
- Composite behavior changes when parent component changes
- Tests pass for simple usage but fail for nested compositions
- Composites that work in `<Command>` but fail in `<Agent>`
- Need to "wrap" composites in specific primitives to get correct output

**Prevention:**
1. **Define primitive boundary clearly:** Primitives are ONLY components that:
   - Need TransformContext access
   - Emit IR nodes (not just compose other components)
   - Require special transformer logic (like If/Else sibling handling)
2. **Composites must be pure functions:** A composite receives typed props and returns JSX using only other primitives/composites - no context, no side effects
3. **Test composites in isolation:** Composites should produce identical output regardless of where they're used
4. **Create "composite compatibility" lint rule:** Flag composites that import from `src/parser/` or `src/ir/`

**Phase to address:** Phase 1 - Define primitive vs composite boundary before any implementation

**Confidence:** HIGH - derived from [monolith modularization research](https://microservices.io/refactoring/) and analysis of current `dispatch.ts` coupling

---

### Pitfall 2: Breaking Discriminated Union Exhaustiveness

**What goes wrong:** The IR uses discriminated unions (`BaseBlockNode`, `BlockNode`) with `kind` property as discriminator. Refactoring that adds, removes, or renames node types breaks exhaustive switch statements throughout the codebase.

**Why it happens:** The current codebase in `src/ir/nodes.ts` shows:
```typescript
export type BaseBlockNode =
  | HeadingNode
  | ParagraphNode
  | ListNode
  // ... 20+ node types
  | StepNode;
```

The emitter in `emitter.ts` likely has exhaustive switches on `node.kind`. Adding new primitive node types or renaming existing ones causes TypeScript errors in all switches, but more dangerously, removing node types for "composite-only" components may leave dead switch cases.

**Consequences:**
- TypeScript errors in 10+ files for a single IR change
- Silent bugs where old node types are handled but never produced
- `assertNever(x: never)` throws at runtime for unhandled new types
- Incomplete refactoring leaves ghost code paths

**Warning signs:**
- TypeScript errors cascade across multiple files for IR changes
- `default` cases added to "suppress" errors instead of handling properly
- Tests pass but new node types aren't actually emitted
- `assertNever` calls throw in production

**Prevention:**
1. **Never add `default` to exhaustive switches:** Let TypeScript catch missing cases
2. **Batch related IR changes:** Add new node, update all handlers, then remove old node in single PR
3. **Use `assertNever` pattern consistently:** Already in `nodes.ts`, enforce in all switch statements
4. **Create IR change checklist:** Every node add/remove requires updating: transformer, emitter, runtime-emitter, tests
5. **Automate exhaustiveness verification:** CI check that all `kind` values appear in emitter switches

**Phase to address:** Phase 1 - Document all exhaustive switch locations before any IR changes

**Confidence:** HIGH - verified against [TypeScript discriminated union documentation](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html) and current `assertNever` usage in codebase

---

### Pitfall 3: Silent Behavior Changes in Backwards Compatibility

**What goes wrong:** Refactoring a component from compiler-handled to composite-based changes its output in subtle ways. Existing TSX files that worked before produce different Markdown after the refactoring.

**Why it happens:** The current compiler handles whitespace, child ordering, and IR generation in complex ways:
- `extractRawMarkdownText` in `dispatch.ts` preserves newlines specially
- `transformBlockChildren` handles If/Else pairing and whitespace filtering
- Emitter adds `\n\n` between blocks

Moving logic to composites may not preserve these exact behaviors.

**Consequences:**
- Users upgrade react-agentic and their commands/agents produce different output
- No error messages - just silently different Markdown
- Users must diff old vs new output to find changes
- Breaks Claude Code commands that rely on specific formatting

**Warning signs:**
- "Refactored" components produce subtly different whitespace
- Tests using `.toContain()` pass but `.toEqual()` fails
- Users report "my command stopped working after upgrade"
- Snapshot tests fail with "1 newline removed" type differences

**Prevention:**
1. **Snapshot test EVERY existing component before refactoring:**
   ```typescript
   // Create snapshots for all components in current behavior
   describe('backwards compatibility snapshots', () => {
     it('Table produces exact output', () => {
       const output = transpile('<Table headers={["A","B"]} rows={[["1","2"]]} />');
       expect(output).toMatchSnapshot();
     });
   });
   ```
2. **Define "behavior boundary":** Which behaviors are guaranteed vs implementation details?
3. **Version component behavior:** `<Table v="2" />` opt-in to new behavior
4. **Migration guide per component:** Document any unavoidable changes
5. **Semver correctly:** Behavior changes = major version bump

**Phase to address:** Phase 0 (before refactoring begins) - Create comprehensive snapshot suite

**Confidence:** HIGH - derived from [React compiler migration risks](https://stevekinney.com/courses/react-performance/react-compiler-migration-guide) and analysis of current transformer complexity

---

### Pitfall 4: Circular Dependencies During Incremental Migration

**What goes wrong:** Refactoring primitives and composites incrementally creates circular import chains. Composite A uses Primitive B, which is still in the old monolithic transformer, which imports the new composite module to check for custom components.

**Why it happens:** The current `dispatch.ts` imports from all transformer modules:
```typescript
import { transformList, transformBlockquote, ... } from './html.js';
import { transformTable, ... } from './semantic.js';
import { transformMarkdown, transformCustomComponent } from './markdown.js';
```

If composites are in a separate location that primitives need to reference, and primitives are still imported by dispatch, circular chains form.

**Consequences:**
- `ReferenceError: Cannot access 'X' before initialization`
- Module load order becomes fragile
- "Works on my machine" but fails in CI
- Refactoring one component breaks unrelated imports

**Warning signs:**
- Import errors that reference modules not directly imported
- Tests pass individually but fail when run together
- Build order sensitivity
- Need to restructure imports to "break cycles" during development

**Prevention:**
1. **Define clear module boundaries:**
   - `src/primitives/` - compiler-only, no composite imports
   - `src/composites/` - user-facing, only imports primitive types
   - `src/compiler/` - orchestration, imports both
2. **Use `import type` for type-only dependencies:** Already used in codebase
3. **Create dependency graph before refactoring:**
   ```bash
   # Visualize current dependencies
   npx madge --circular src/parser/
   ```
4. **Refactor in dependency order:** Extract leaf modules first, work toward dispatch.ts
5. **CI check for circular imports:** Fail build if cycles detected

**Phase to address:** Phase 1 - Map current dependencies, define target architecture

**Confidence:** HIGH - verified against [circular dependency patterns](https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de) and current transformer structure

---

### Pitfall 5: Loss of Compile-Time Type Safety for Composite Props

**What goes wrong:** Moving components from compiler-handled to user TSX functions changes how prop types are validated. Compiler can do deep analysis; user functions rely only on TypeScript checking.

**Why it happens:** Current compiler validates props at transform time:
- `getAttributeValue` extracts and validates attribute types
- `transformTable` checks for required `rows` prop
- Custom validation logic like `isValidXmlName` in `shared.ts`

User composites can only do TypeScript-level validation, which happens before transpilation.

**Consequences:**
- Runtime errors for prop issues that were compile-time errors before
- Less helpful error messages (TypeScript vs custom transformer errors)
- Complex prop relationships (e.g., `headers` length must match column count) can't be validated
- Malformed Markdown output instead of helpful error

**Warning signs:**
- "Type 'string' is not assignable to type 'never'" instead of "Table requires rows prop"
- Errors point to component definition instead of usage site
- Valid TypeScript produces invalid Markdown

**Prevention:**
1. **Keep validation-heavy components as primitives:**
   - `Table` (complex row/header/align validation)
   - `XmlBlock` (XML name validation)
   - `SpawnAgent` (type contract validation)
2. **Create prop validation utilities for composites:**
   ```typescript
   // In composites, use runtime checks with helpful errors
   export function MyComposite(props: MyCompositeProps) {
     if (!props.required) {
       throw new Error('MyComposite requires "required" prop');
     }
     return <XmlBlock name="my-thing">{props.children}</XmlBlock>;
   }
   ```
3. **Document validation differences:** Which props are TypeScript-only vs compiler-validated
4. **Consider branded types:** `type NonEmptyArray<T> = T[] & { _nonEmpty: true }` for compile-time hints

**Phase to address:** Phase 2 - When classifying which components become composites

**Confidence:** MEDIUM - depends on which components are selected for composite migration

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt but are recoverable.

### Pitfall 6: Over-Modularization - Too Many Primitives

**What goes wrong:** Fear of "distributed monolith" leads to making too many things primitives. The primitive set becomes as large as the original monolith, just with different boundaries.

**Why it happens:** Every edge case seems to need "special compiler handling":
- "This component needs context access" -> primitive
- "This component has complex children" -> primitive
- "This component validation can't be TypeScript-only" -> primitive

**Warning signs:**
- 80%+ of components remain primitives
- Composite set is trivially small (only wrappers)
- New features always require compiler changes

**Prevention:**
1. **Set target ratio:** 10-15 primitives, rest are composites
2. **Challenge every "needs to be primitive" decision:** Can the behavior be achieved by composing existing primitives?
3. **Primitives are closed set:** After initial migration, adding new primitive requires RFC

---

### Pitfall 7: Incomplete TransformContext Migration

**What goes wrong:** `TransformContext` in `types.ts` carries multiple responsibilities. Refactoring splits some but not all, leaving composites with access to things they shouldn't need.

**Why it happens:** Current context includes:
- `sourceFile` - for component resolution
- `visitedPaths` - for circular detection
- `createError` - for source-located errors

Composites need error creation but not file resolution.

**Prevention:**
1. **Split context into layers:**
   - `PrimitiveContext` - full context for compiler
   - `CompositeContext` - subset safe for user code
2. **Composites receive minimal context:** Only what's needed for error messages
3. **Type system enforces separation:** Composite functions take `CompositeContext`, can't access `sourceFile`

---

### Pitfall 8: Emitter Changes Required for IR Simplification

**What goes wrong:** Simplifying IR nodes for composites requires corresponding emitter changes. The emitter in `emitter.ts` and `runtime-emitter.ts` has parallel switch statements that must stay synchronized.

**Warning signs:**
- IR changes compile but runtime output is wrong
- Tests using transpile() pass but tests using emit() fail
- Markdown emitter and runtime emitter diverge

**Prevention:**
1. **Single source of truth for IR changes:** Update both emitters in same PR
2. **Test at emission level, not just IR level:** Verify actual Markdown output
3. **Consider shared emit logic:** `emitNode(node)` dispatches to correct emitter

---

### Pitfall 9: Component Registry Confusion

**What goes wrong:** The current `SPECIAL_COMPONENTS` set in `shared.ts` tracks compiler-handled components. With primitives/composites, there are now three categories: primitives (compiler), composites (library), and custom (user). Misclassification causes wrong transformation.

**Warning signs:**
- User component treated as primitive (error)
- Primitive treated as custom component (infinite loop)
- Composite not found in any registry

**Prevention:**
1. **Three explicit registries:**
   ```typescript
   const PRIMITIVES = new Set(['Command', 'Agent', 'If', 'Loop', ...]);
   const COMPOSITES = new Set(['Section', 'Warning', 'Note', ...]);
   // Custom = neither primitive nor composite, user-defined
   ```
2. **Clear resolution order:** Primitive -> Composite -> Custom -> Error
3. **Test each classification explicitly**

---

## Minor Pitfalls

Annoyances that are easily fixable.

### Pitfall 10: Documentation Lag

**What goes wrong:** Docs in `docs/` describe old component behavior. After refactoring, docs are stale.

**Prevention:**
1. **Update docs in same PR as component change**
2. **Doc tests that verify examples still work**
3. **Changelog for behavior changes**

---

### Pitfall 11: Test Fixture Maintenance

**What goes wrong:** Test fixtures for transformer tests become invalid after IR changes. Tests using snapshot matching break.

**Prevention:**
1. **Regenerate snapshots intentionally:** `npm test -- --update-snapshots` with review
2. **Comment fixtures with expected output:** Easier to understand what changed
3. **Separate unit tests (IR structure) from integration tests (Markdown output)**

---

### Pitfall 12: Performance Regression from Indirection

**What goes wrong:** Composites add function call overhead. Deep composition chains become slow.

**Prevention:**
1. **Benchmark before/after:** Compare transpile time for realistic command set
2. **Limit composition depth:** Warn on >5 nested composites
3. **Consider memoization:** Cache resolved composites by path

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|----------------|------------|
| Phase 0 | Preparation | Missing baseline snapshots (3) | Create comprehensive snapshot suite before ANY changes |
| Phase 1 | Architecture | Distributed monolith (1) | Define primitive boundary with explicit criteria |
| Phase 1 | Architecture | Circular dependencies (4) | Map dependencies, define module boundaries |
| Phase 1 | IR Design | Breaking exhaustiveness (2) | Document all switch locations, batch changes |
| Phase 2 | Component Classification | Over-modularization (6) | Target 10-15 primitives max |
| Phase 2 | Component Migration | Type safety loss (5) | Keep validation-heavy components as primitives |
| Phase 2 | Context | Incomplete context split (7) | Define PrimitiveContext vs CompositeContext |
| Phase 3 | Emitter | Emitter synchronization (8) | Update both emitters in same PR |
| Phase 3 | Registry | Classification confusion (9) | Three explicit registries with clear resolution |
| Phase 4 | Polish | Documentation lag (10) | Update docs with component changes |
| All | Testing | Backwards compatibility (3) | Snapshot test everything, semver correctly |

---

## Prevention Strategies Summary

### Strategy 1: Primitive Boundary Contract

Define explicit criteria for what qualifies as a primitive:

```typescript
/**
 * PRIMITIVE CRITERIA
 * A component MUST be a primitive if ANY of these apply:
 *
 * 1. Needs TransformContext.sourceFile for resolution
 * 2. Emits IR nodes that require special emitter logic
 * 3. Has transformer-only validation (beyond TypeScript)
 * 4. Requires sibling coordination (If/Else pattern)
 * 5. Produces runtime code (runtimeFn, useRuntimeVar)
 *
 * A component SHOULD be a composite if:
 * - It only composes other primitives/composites
 * - Its props can be validated by TypeScript alone
 * - It produces predictable output regardless of context
 */
```

### Strategy 2: Exhaustive Switch Enforcement

```typescript
// Add to all emitter switches
switch (node.kind) {
  case 'heading': return emitHeading(node);
  case 'paragraph': return emitParagraph(node);
  // ... all cases ...
  default:
    // TypeScript enforces this is unreachable
    return assertNever(node);
}
```

### Strategy 3: Backwards Compatibility Gate

```bash
# CI job that runs on every PR
npm run test:snapshots
if [ $? -ne 0 ]; then
  echo "SNAPSHOT MISMATCH - Review backwards compatibility"
  echo "If changes are intentional, update snapshots and bump major version"
  exit 1
fi
```

### Strategy 4: Dependency Visualization

```bash
# Add to package.json scripts
"deps:check": "madge --circular src/parser/",
"deps:graph": "madge --image deps.svg src/parser/"
```

---

## Sources

### Monolith to Modular Refactoring
- [Monolith Modularization Trade-offs - IEEE](https://ieeexplore.ieee.org/document/9425828/)
- [Refactoring a monolith to microservices](https://microservices.io/refactoring/)
- [From Monolithic to Modular - Eficode](https://www.eficode.com/blog/from-monolithic-to-modular)

### TypeScript Type System
- [TypeScript Discriminated Unions](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html)
- [Discriminated Union Narrowing Issues - GitHub](https://github.com/microsoft/TypeScript/issues/55425)
- [Advanced TypeScript for React - Discriminated Unions](https://www.developerway.com/posts/advanced-typescript-for-react-developers-discriminated-unions)

### Backwards Compatibility
- [API Backwards Compatibility Best Practices - Zuplo](https://zuplo.com/learning-center/api-versioning-backward-compatibility-best-practices)
- [Breaking Changes Beyond API Compatibility - InfoQ](https://www.infoq.com/articles/breaking-changes-are-broken-semver/)
- [AIP-180: Backwards compatibility - Google](https://google.aip.dev/180)

### React/Compiler Migration
- [React Compiler Migration Guide](https://stevekinney.com/courses/react-performance/react-compiler-migration-guide)
- [Compile-Time vs Runtime Component Composition - Smashing Magazine](https://www.smashingmagazine.com/2025/03/web-components-vs-framework-components/)

### Circular Dependencies
- [How to Fix Circular Dependencies - Medium](https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de)

---

## Summary

The primitive/composite refactoring has five critical risks:

1. **Distributed Monolith (Pitfall 1):** Composites that still depend on compiler internals. Prevent by defining clear primitive boundary criteria.

2. **Discriminated Union Breakage (Pitfall 2):** IR changes breaking exhaustive switches across codebase. Prevent by documenting switch locations and batching changes.

3. **Silent Behavior Changes (Pitfall 3):** Backwards compatibility violations without errors. Prevent by comprehensive snapshot testing before refactoring.

4. **Circular Dependencies (Pitfall 4):** Import cycles during incremental migration. Prevent by mapping dependencies and defining clean module boundaries.

5. **Type Safety Loss (Pitfall 5):** Moving validation-heavy components to composites loses custom error messages. Prevent by keeping such components as primitives.

**Highest-risk pitfall:** Silent behavior changes (Pitfall 3) because users won't see errors - just different output that may break their Claude Code commands.

**Most likely pitfall:** Distributed monolith (Pitfall 1) because the current architecture has many hidden dependencies between transformer modules, making it hard to cleanly separate primitives from composites.

**First action before any refactoring:** Create comprehensive snapshot tests for every component's output (addresses Pitfall 3).
