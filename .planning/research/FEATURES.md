# Feature Landscape: Primitive/Composite Architecture

**Domain:** TSX-to-Markdown compiler with component composition
**Researched:** 2026-01-31
**Focus:** What features are expected from a primitive/composite component architecture
**Supersedes:** Previous v1.0 research (2026-01-20)

## Executive Summary

The primitive/composite architecture separates compiler-required internals (primitives) from user-definable patterns (composites). This enables users to create custom workflow components like `<BannerUi>` that accept full markdown children rather than string templates, while the compiler maintains a minimal, stable primitive set.

The key insight from the current codebase: `transformCustomComponent` in `markdown.ts` throws on components with props (line 206-209), and the runtime transformer (`runtime-component.ts`) handles children but only as blocks, not as a typed content system. The architecture refactor must provide:

1. **Content types** for what children primitives and composites can accept
2. **Reference printing** for variable/function access in composites
3. **Clear boundary** between what the compiler owns vs what users can define

---

## Table Stakes

Features users absolutely expect from a primitive/composite architecture. Missing these = architecture feels incomplete.

### 1. Children Prop Support for Custom Components

**What:** Custom components must accept `children` prop with full markdown content, not just strings.

**Why Expected:**
- Current limitation: `BannerUi` uses `${props.title}` string templates
- React developers expect `children` to work like React
- Every headless component library supports this

**Complexity:** Medium

**Implementation Notes:**
- `runtime-component.ts` already extracts children (line 434-458)
- Must type `children` as `MarkdownContent` not `ReactNode`
- Transform children at call site, not definition site

### 2. Prop Passing to Custom Components

**What:** Props passed to `<MyComponent title="Hello">` are available inside the component.

**Why Expected:**
- Current transformer explicitly forbids props (line 206-209 in `markdown.ts`)
- `runtime-component.ts` handles props but only for runtime path
- This is React 101 functionality

**Complexity:** Medium

**Implementation Notes:**
- Already works in runtime path via `extractPropsFromUsage` (line 341-367)
- Need to unify static and runtime transformer behavior
- Type checking: props interface should validate at compile time

### 3. MarkdownContent Type for Sub-Components

**What:** Typed content that sub-components can render, distinct from document-level content.

**Why Expected:**
- Sub-components shouldn't allow `<SpawnAgent>` or `<Command>` inside
- Need compile-time errors for invalid nesting
- Follows Radix primitives pattern

**Complexity:** High

**Implementation Notes:**
- Define `MarkdownContentNode` (document-level) vs `SubComponentContent` (subset)
- SubComponentContent allows: heading, paragraph, list, code, xmlBlock, raw, table
- SubComponentContent forbids: spawnAgent, onStatus, controlFlow nodes

### 4. Clear Primitive/Composite Boundary

**What:** Documented list of what's a primitive vs what's a composite.

**Why Expected:**
- Users need to know what they can redefine
- Composites can be replaced/extended; primitives cannot
- Affects migration path for existing code

**Complexity:** Low (design), Medium (implementation)

**Proposed Boundary:**

| Primitives (Compiler-owned) | Composites (User-definable) |
|-----------------------------|-----------------------------|
| `<Command>`, `<Agent>` | `<If>`, `<Else>` |
| `<h1>`-`<h6>`, `<p>`, `<ul>`, etc. | `<Loop>`, `<Break>` |
| `<Markdown>`, `<XmlBlock>` | `<SpawnAgent>`, `<OnStatus>` |
| `useRuntimeVar`, `runtimeFn` | `<Step>`, `<Table>`, `<List>` |
| `<Ref>` (new) | `<ExecutionContext>` |

### 5. Variable Reference Printing

**What:** Composites need to print variable references in markdown output.

**Why Expected:**
- `<If condition={ctx.error}>` needs to emit `$CTX` or jq expression
- Custom components need to interpolate runtime values
- Current: `useRuntimeVar` returns proxy, but no way to print reference

**Complexity:** Medium

**Implementation Notes:**
- Add `.ref` property to RuntimeVarProxy
- `ctx.ref` returns `"$CTX"` or `"$(echo \"$CTX\" | jq -r '.path')"`
- Composites use `{ctx.ref}` in markdown output

### 6. Function Call Reference Printing

**What:** Composites need to emit function call syntax for runtime functions.

**Why Expected:**
- `<Init.Call>` in a composite needs to generate bash runtime call
- Current: `runtimeFn` generates `.Call` component, but composites can't use it
- Need way to get call syntax without using `<Init.Call>`

**Complexity:** Medium

**Implementation Notes:**
- Add `.ref` property to RuntimeFnComponent
- `Init.ref({ path: "." })` returns call syntax string
- Composites embed in markdown: `Run initialization: {Init.ref({ path })}`

---

## Differentiators

Features that set react-agentic's primitive/composite architecture apart. Not expected, but valuable.

### 1. Type-Safe Content Constraints

**Value Proposition:** TypeScript errors when you put `<SpawnAgent>` inside a sub-component that only accepts markdown content.

**Complexity:** High

**Notes:**
- No other TSX-to-X compiler provides this level of content type safety
- Requires `MarkdownContent` and `DocumentContent` as separate types
- Generic components: `function Card<T extends MarkdownContent>({ children }: { children: T })`

### 2. Slot-Based Component Composition (asChild pattern)

**Value Proposition:** Like Radix's asChild, allows merging component behavior onto child element.

**Complexity:** High

**Notes:**
- `<MyButton asChild><a href="...">Link</a></MyButton>` merges MyButton's output onto anchor
- Enables maximum flexibility for composites
- May be overkill for v3.0 scope

### 3. Explicit Ref Component

**Value Proposition:** `<Ref>` component for printing variable references in markdown context.

**Complexity:** Low

**Example:**
```tsx
const ctx = useRuntimeVar<Context>('CTX');
<p>Current value: <Ref value={ctx.status} /></p>
// Outputs: Current value: $(echo "$CTX" | jq -r '.status')
```

**Notes:**
- Simpler than string interpolation for complex expressions
- Type-safe: `<Ref value={...}>` only accepts RuntimeVar

### 4. Composite Library Export

**Value Proposition:** Ship common workflow patterns (If/Else, Loop, SpawnAgent) as importable composites that users can study and customize.

**Complexity:** Low (if architecture supports it)

**Notes:**
- `import { If, Else, Loop } from 'react-agentic/composites'`
- Users can fork and modify: `const MyIf = ({ ... }) => <XmlBlock name="conditional">...</XmlBlock>`
- Documentation: show composite source as reference implementation

### 5. Fragment Composition

**Value Proposition:** Return multiple elements from a composite without wrapper.

**Complexity:** Medium

**Example:**
```tsx
const HeaderFooter = ({ title }) => (
  <>
    <h1>{title}</h1>
    <hr />
  </>
);
```

**Notes:**
- Already partially supported in `transformComponentJsx` (line 476-490 in runtime-component.ts)
- Need to ensure consistent behavior across static and runtime paths

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

### 1. Runtime Evaluation in Composites

**Why Avoid:** Composites should be pure compile-time transforms, not runtime evaluations.

**What to Do Instead:**
- Composites transform to IR nodes at build time
- Runtime logic stays in `runtimeFn` functions
- Keep the build-time/runtime boundary clear

### 2. Implicit Children Detection

**Why Avoid:** Automatically detecting whether a component uses children leads to fragile behavior.

**What to Do Instead:**
- Explicit `children` prop in component signature
- Type `children: MarkdownContent` or `children: SubComponentContent`
- Compiler validates based on declared type

### 3. Deep Prop Merging

**Why Avoid:** Merging props from multiple levels creates hidden behavior and debugging nightmares.

**What to Do Instead:**
- Props are passed explicitly at each level
- No "prop drilling" solutions in the compiler
- Keep composition visible in the TSX

### 4. Component State Across Builds

**Why Avoid:** Trying to track state between component uses leads to non-deterministic output.

**What to Do Instead:**
- Each component invocation is independent
- State lives in StateNode/SQLite, not component instances
- Build output is deterministic from source

### 5. String Template Fallback

**Why Avoid:** Allowing `${props.title}` alongside `{children}` creates two ways to do the same thing.

**What to Do Instead:**
- Remove string template support from composites
- All content flows through typed children
- Migration guide for existing `${props.x}` patterns

### 6. Nested Component Definition

**Why Avoid:** Defining components inside other components breaks extraction and caching.

**What to Do Instead:**
- Components must be defined at module level
- Error if component defined inside function body
- Clear error message with fix suggestion

---

## Feature Dependencies

```
                    MarkdownContent Types
  (Must define before anything else can be typed correctly)
                            |
                            v
                  Children Prop Support
  (Depends on content types for validation)
                            |
        +-------------------+-------------------+
        v                   v                   v
  Variable Ref        Function Ref         <Ref> Component
  Printing (.ref)     Printing (.ref)
        |                   |                   |
        +-------------------+-------------------+
                            |
                            v
           Move Composites Out of Compiler Core
  (If, Else, Loop, SpawnAgent become user-definable)
```

---

## MVP Recommendation

For MVP primitive/composite architecture, prioritize:

1. **MarkdownContent types** - Foundation for everything else
2. **Children prop support** - Unblocks user-defined composites
3. **Variable ref printing** - Composites need to interpolate runtime values
4. **Prop passing** - Unify static/runtime transformer behavior
5. **Clear boundary documentation** - Users need to know what's customizable

Defer to post-MVP:

- **Slot-based composition (asChild)** - Adds complexity, can layer on later
- **Function ref printing** - Less common need, can add when requested
- **Composite library export** - Nice to have, not blocking

---

## Type Safety Features

### Compile-Time Validation

| Validation | What It Catches | Implementation |
|------------|-----------------|----------------|
| Content type mismatch | `<SpawnAgent>` inside sub-component | Check node kind against allowed set |
| Missing required props | `<Table>` without `rows` | Props interface validation |
| Invalid children | String where content expected | Children type checking |
| Circular references | Component A uses B uses A | Stack tracking in expansion |

### Runtime Variable Type Safety

| Feature | Compile-Time | Runtime |
|---------|--------------|---------|
| Variable name validation | Check prop types | N/A (build-time) |
| Property path validation | Proxy tracks access | jq expression generated |
| Type narrowing in If/Else | Via discriminated unions | Branches produce different output |

---

## Sources

**Architecture Patterns:**
- [Radix Primitives Composition](https://www.radix-ui.com/primitives/docs/guides/composition) - asChild and Slot patterns
- [Radix Slot Component](https://www.radix-ui.com/primitives/docs/utilities/slot) - Low-level composition primitive
- [Martin Fowler: Headless Component](https://martinfowler.com/articles/headless-component.html) - Behavior/view separation
- [patterns.dev Compound Pattern](https://www.patterns.dev/react/compound-pattern/) - Shared state components

**React Composition:**
- [React Composition vs Inheritance](https://legacy.reactjs.org/docs/composition-vs-inheritance.html) - Official React guidance
- [Frontend Mastery: Advanced Composition](https://frontendmastery.com/posts/advanced-react-component-composition-guide/) - Deep dive on patterns
- [TypeScript JSX Handbook](https://www.typescriptlang.org/docs/handbook/jsx.html) - Children type checking

**Codebase Evidence:**
- `src/parser/transformers/markdown.ts:206-209` - Props explicitly forbidden
- `src/parser/transformers/runtime-component.ts:434-458` - Children extraction exists
- `src/parser/transformers/runtime-component.ts:341-367` - Props extraction exists
- `src/ir/nodes.ts` - Current IR types, BaseBlockNode union
