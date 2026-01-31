# Project Research Summary

**Project:** react-agentic v3.0 Primitive/Composite Architecture
**Domain:** TSX-to-Markdown compiler refactoring
**Researched:** 2026-01-31
**Confidence:** HIGH

## Executive Summary

The react-agentic v3.0 refactoring separates "primitives" (components requiring compiler knowledge) from "composites" (user-definable components that compose primitives). This pattern is well-established across React, SolidJS, Ink, MDX, and Astro, where a small set of "host" or "intrinsic" elements are handled by the rendering infrastructure while all other components are plain functions that compose those primitives.

The recommended approach is a four-phase restructuring: (1) establish content type foundations and add `.ref` properties for variable/function printing, (2) formalize the primitive registry and separate composites from compiler core, (3) implement content validation and improve error messages, and (4) deliver user-facing documentation and examples. The current codebase already has most infrastructure in place via `transformLocalComponent` in `runtime-component.ts` and the `SPECIAL_COMPONENTS` set in `transformer.ts`, but these implicit patterns need formalization.

The highest-risk pitfall is **silent behavior changes** during migration, where refactored components produce different markdown output without errors, breaking existing Claude Code commands. This requires comprehensive snapshot testing before any refactoring begins. The most likely pitfall is **distributed monolith**, where composites appear independent but secretly depend on compiler context, making them fragile when composed differently than expected.

## Key Findings

### Recommended Stack

The stack research surveyed React Fiber, SolidJS, MDX, Ink, Astro, and MDAST for patterns applicable to primitive/composite separation.

**Core patterns to adopt:**
- **React Fiber host/composite discrimination:** Use string vs function type to identify primitives vs composites. Primitives are "host" components handled by compiler; composites are functions that return primitive trees.
- **MDAST content categories:** Use discriminated unions with content type constraints (`FlowContent`, `PhrasingContent`) to validate what children can appear where at compile time.
- **SolidJS run-once model:** Components execute once at build time (not re-render), matching react-agentic's TSX-to-Markdown compilation model.
- **TypeScript `JSX.IntrinsicElements`:** Standard pattern for typing primitive props; composites use regular function prop interfaces.

**Key version/tooling:**
- TypeScript discriminated unions for IR node types (already using `kind` discriminator)
- ts-morph for import resolution (already in use for component resolution)
- No new dependencies required; architecture refactoring only

### Expected Features

**Must have (table stakes):**
- **Children prop support for custom components** - `<MyComponent>full markdown children</MyComponent>` not just string templates
- **Prop passing to custom components** - Currently forbidden in `markdown.ts:206-209`; must unify static/runtime transformer behavior
- **MarkdownContent type for sub-components** - Typed content that prevents `<SpawnAgent>` inside sub-components
- **Variable reference printing** - `.ref` property on RuntimeVar for printing `$CTX` or jq expressions in markdown
- **Clear primitive/composite boundary** - Documented list so users know what they can customize

**Should have (differentiators):**
- **Explicit `<Ref>` component** - `<Ref value={ctx.status} />` for type-safe reference printing
- **Composite library export** - `import { If, Else } from 'react-agentic/composites'` for customization
- **Type-safe content constraints** - TypeScript errors for invalid nesting (e.g., `<SpawnAgent>` inside sub-component)

**Defer (v2+):**
- **Slot-based composition (asChild pattern)** - Radix-style component merging; adds complexity
- **Function ref printing** - Less common; add when requested
- **Deep prop merging** - Creates hidden behavior; keep composition explicit

### Architecture Approach

The architecture restructures the existing pipeline from `Parse -> Transform -> Emit` to `Parse -> Resolve Composites -> Transform (primitives only) -> Emit`. Composites are expanded before IR transformation, producing a pure primitive tree that the compiler handles. This keeps the compiler focused on ~15-20 primitives while enabling unlimited user composites.

**Major components:**
1. **Primitive Registry** (`src/primitives/registry.ts`) - Explicit list replacing implicit `SPECIAL_COMPONENTS`: Document roots (`Command`, `Agent`), Content primitives (`XmlBlock`, `Table`, `Markdown`), Runtime primitives (`If`, `Else`, `Loop`, `SpawnAgent`)
2. **Composite Resolver** (`src/parser/composite-resolver.ts`) - Extracts/generalizes `transformLocalComponent` logic; handles imported composites via ts-morph resolution
3. **Content Type System** (`src/ir/content-types.ts`) - `StaticContent` (no runtime nodes, for Agents), `RuntimeContent` (full, for Commands), `PrimitiveContent` (subset for composite expansion)
4. **RuntimeVar/RuntimeFn `.ref` property** - Enable composites to print variable references in markdown output

### Critical Pitfalls

1. **Distributed Monolith** - Composites that still depend on `TransformContext` or transformation ordering. Prevent by defining explicit primitive criteria: only components needing context access, IR node emission, or sibling coordination are primitives.

2. **Silent Behavior Changes** - Refactored components produce different whitespace or formatting without errors. Prevent by creating comprehensive snapshot tests for ALL components BEFORE any refactoring begins.

3. **Breaking Discriminated Union Exhaustiveness** - IR node changes break exhaustive switches across emitter files. Prevent by documenting all switch locations and batching IR changes (add node + update handlers + remove old node in single PR).

4. **Circular Dependencies During Migration** - Incremental refactoring creates import cycles between primitive/composite modules. Prevent by mapping dependencies first (`madge --circular src/parser/`) and extracting in dependency order.

5. **Loss of Compile-Time Validation** - Moving validation-heavy components to composites loses custom error messages. Prevent by keeping `Table`, `XmlBlock`, `SpawnAgent` as primitives due to complex validation needs.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 0: Baseline Snapshots (Pre-Refactoring)

**Rationale:** Pitfall research emphasizes silent behavior changes as highest-risk. Must capture current behavior before any changes.
**Delivers:** Snapshot test suite for every existing component's markdown output
**Addresses:** Backwards compatibility gate; enables safe refactoring
**Avoids:** Silent behavior changes (Pitfall 3)

### Phase 1: Type Foundation

**Rationale:** Content types and `.ref` properties are prerequisites for all subsequent work. Low risk, additive changes.
**Delivers:**
- `src/ir/content-types.ts` with `StaticContent`, `RuntimeContent`, `PrimitiveContent` type aliases
- `.ref` property on RuntimeVarProxy (returns `"ctx.error"` or jq expression string)
- `.ref` property on RuntimeFn (returns function name string for call syntax)
**Implements:** FEATURES table stakes #5 (Variable ref printing), #6 (Function ref printing)
**Avoids:** Breaking exhaustiveness (existing tests pass; new tests for `.ref`)

### Phase 2: Primitive Classification

**Rationale:** Formalizes implicit `SPECIAL_COMPONENTS` into explicit registry with clear criteria. Medium risk.
**Delivers:**
- `src/primitives/registry.ts` with `DOCUMENT_PRIMITIVES`, `CONTENT_PRIMITIVES`, `RUNTIME_PRIMITIVES`
- `isPrimitive()` function replacing ad-hoc checks
- Updated `isCustomComponent()` to use registry
**Implements:** FEATURES table stakes #4 (Clear boundary), ARCHITECTURE primitive registry
**Avoids:** Over-modularization (target 15-20 primitives max); Component registry confusion (Pitfall 9)

### Phase 3: Composite Resolution Pipeline

**Rationale:** Enables user-defined composites by running resolution as separate pass before transformation. Highest risk phase.
**Delivers:**
- `src/parser/composite-resolver.ts` extracted from `transformLocalComponent`
- Support for imported composites (not just same-file)
- Pipeline becomes: Parse -> Resolve Composites -> Transform -> Emit
**Implements:** FEATURES table stakes #1 (Children prop support), #2 (Prop passing)
**Avoids:** Distributed monolith (composites pure functions, no context access)
**Needs:** Careful dependency management to avoid circular imports

### Phase 4: Content Type Validation

**Rationale:** Enforces content type restrictions to catch invalid nesting at compile time. Medium risk.
**Delivers:**
- Context-dependent validation in transformers
- Better error messages for invalid nesting (e.g., `<SpawnAgent>` inside Agent)
- Updated component interfaces to use specific content types
**Implements:** FEATURES table stakes #3 (MarkdownContent type), differentiator #3 (Type-safe constraints)
**Avoids:** Loss of type safety (Pitfall 5)

### Phase 5: User-Facing Polish

**Rationale:** Documentation and examples for users to create their own composites.
**Delivers:**
- Documentation for writing composites
- Example composites showing patterns
- Migration guide for any breaking changes
- Composite library export (`react-agentic/composites`)
**Implements:** FEATURES differentiator #4 (Composite library export)

### Phase Ordering Rationale

- **Phase 0 before all:** Snapshot tests prevent silent regressions; research emphasizes this as non-negotiable
- **Phase 1 before 2:** Content types needed for registry classification decisions
- **Phase 2 before 3:** Registry must exist before composite resolution can distinguish primitives
- **Phase 3 before 4:** Composite resolution must work before content validation can be applied
- **Phase 5 last:** Polish after core architecture stabilizes

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Composite Resolution):** Complex because current `transformLocalComponent` is embedded in transformer; extracting requires understanding all context dependencies
- **Phase 4 (Content Validation):** Context-dependent rules (e.g., runtime nodes allowed in Command but not Agent) need careful design

Phases with standard patterns (skip research-phase):
- **Phase 1 (Type Foundation):** Well-documented TypeScript patterns; MDAST content categories provide clear model
- **Phase 2 (Primitive Classification):** Straightforward registry extraction from existing `SPECIAL_COMPONENTS`
- **Phase 5 (User-Facing):** Documentation work; patterns established by earlier phases

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Patterns verified from React Fiber, MDAST, Ink official sources |
| Features | HIGH | Features derived from codebase analysis with specific line references |
| Architecture | HIGH | Based on detailed transformer/emitter codebase analysis |
| Pitfalls | HIGH | Architectural risks well-documented; migration risks from codebase complexity |

**Overall confidence:** HIGH

### Gaps to Address

- **Imported composite resolution:** Current `transformLocalComponent` only handles same-file components; ts-morph import following needs implementation verification during Phase 3
- **Context-dependent content rules:** The rule "runtime nodes in Command, not in Agent" is implicit; needs explicit specification during Phase 4
- **Whitespace preservation:** Current transformer has complex whitespace handling (`extractRawMarkdownText`, If/Else sibling pairing); must verify composites preserve this behavior

## Sources

### Primary (HIGH confidence)
- [React Fiber Architecture](https://github.com/acdlite/react-fiber-architecture) - Host vs composite discrimination
- [React Implementation Notes](https://legacy.reactjs.org/docs/implementation-notes.html) - Reconciler patterns
- [MDAST Specification](https://github.com/syntax-tree/mdast) - Content category types
- [TypeScript JSX Documentation](https://www.typescriptlang.org/docs/handbook/jsx.html) - IntrinsicElements typing
- [Codebase: src/ir/nodes.ts, src/parser/transformer.ts, src/parser/transformers/*] - Current architecture

### Secondary (MEDIUM confidence)
- [Ink GitHub](https://github.com/vadimdemedes/ink) - Custom renderer primitive vocabulary
- [SolidJS Docs](https://docs.solidjs.com/concepts/components/basics) - Run-once component model
- [MDX Using MDX](https://mdxjs.com/docs/using-mdx/) - Composite component mapping
- [Radix Primitives](https://www.radix-ui.com/primitives/docs/guides/composition) - asChild and Slot patterns

### Tertiary (LOW confidence)
- [Monolith Modularization IEEE](https://ieeexplore.ieee.org/document/9425828/) - Distributed monolith risks
- [Total TypeScript on Children Types](https://www.totaltypescript.com/type-safe-children-in-react-and-typescript) - Children type limitations

---
*Research completed: 2026-01-31*
*Ready for roadmap: yes*
