# Pitfalls Research: Agent Framework for TSX-to-Markdown Transpiler (v1.1)

**Domain:** Adding typed Agent inter-component communication to existing TSX transpiler
**Researched:** 2026-01-21
**Overall Confidence:** HIGH for transpiler-specific pitfalls, MEDIUM for GSD-specific patterns

---

## Critical Pitfalls

Mistakes that will cause project failure or require major architectural changes.

### Pitfall 1: Type Information Loss at the Transpilation Boundary

**What goes wrong:** TypeScript types are erased during transpilation. The Agent defines an interface contract (`interface AgentInput { ... }`), but the Markdown output is just text. The Command imports and uses this interface for compile-time checking, but the generated output contains no runtime representation of the type.

**Why it happens:** TypeScript fundamentally erases types at compile time. The transpiler outputs Markdown strings, not JavaScript. There's no mechanism to preserve type information in the output format.

**Consequences:**
- Commands using `<SpawnAgent input={data}>` have TypeScript checking during authoring
- But the emitted Markdown just contains the serialized values with no schema
- If the Agent's expected input format changes, Commands won't fail at build time unless they also import the updated interface
- Type mismatches become runtime failures in Claude Code, not build-time errors

**Prevention:**
1. **Document the limitation clearly:** Type safety exists only within the TSX authoring phase, not across compiled artifacts
2. **Consider generating schema comments:** Emit `<!-- Input schema: { field: string, ... } -->` in the Markdown for debugging
3. **Require interface exports from Agent files:** Agent must `export interface` its contract, Command must import it
4. **Validate at transpile time:** When processing `<SpawnAgent>`, resolve the Agent's interface and compare prop types

**Detection (early warning signs):**
- Tests pass for isolated Command/Agent compilation but fail for cross-file type checking
- Users report "it compiled but Claude Code got confused about the format"
- Interface changes don't trigger Command rebuilds

**Phase to address:** Phase 1 (Interface Design) - establish the contract pattern before implementing components

**Confidence:** HIGH - verified against TypeScript type erasure documentation and the fundamental constraint that Markdown has no type system

---

### Pitfall 2: Circular Dependencies Between Agent and Command Files

**What goes wrong:** Agent defines interface, Command imports interface, but transformer needs to resolve both to validate the connection. If the resolution order isn't careful, circular import chains form.

**Why it happens:** The existing `resolveComponentImport()` in transformer.ts tracks visited paths for circular detection on *component composition*. But Agent/Command have a different relationship - one defines types that the other consumes, plus the orchestration flows the other direction.

**Consequences:**
- `Circular import detected` errors on valid Agent + Command pairs
- Or worse: infinite loops in the transformer if detection isn't updated
- Confusing error messages that don't explain the Agent/Command relationship

**Prevention:**
1. **Separate type resolution from component resolution:** Agent interfaces are *type-only imports* (`import type { AgentInput } from './agent'`), which should be handled differently
2. **Use TypeScript's `import type` detection:** ts-morph can distinguish `import type` from `import`, allowing different circular dependency rules
3. **Allow cross-references for types only:** Command can import Agent's interface without triggering component resolution
4. **Test the diamond dependency pattern:** Agent defines interface, two Commands both import it, both spawn the same Agent

**Detection (early warning signs):**
- Circular import errors when Agent and Command are in same directory
- Need to move interface to third file to make it work (symptom of underlying issue)
- Tests with simple Agent/Command pairs pass but multi-file scenarios fail

**Phase to address:** Phase 1 (Architecture) - update `resolveComponentImport` logic or create parallel `resolveTypeImport` path

**Confidence:** HIGH - the existing codebase already handles circular detection for composition, this is an extension

---

### Pitfall 3: Context Isolation Misunderstanding (@ References Don't Cross Task Boundaries)

**What goes wrong:** GSD's `@` references (like `@.planning/PROJECT.md`) are lazy-loading signals that tell agents what files to read. They're NOT pre-loaded content. Developers assume the transpiler should inline referenced content, but that breaks the context isolation pattern GSD relies on.

**Why it happens:** Intuition from bundlers (Webpack, Rollup) says "resolve and inline." GSD intentionally doesn't work that way - each Task/Agent gets fresh 200K token context, and @ references are instructions to *that* agent, not the orchestrator.

**Consequences:**
- Transpiler inlines @ references, bloating the Markdown with content that should stay lazy
- Context budget consumed in orchestrator instead of distributed across spawned agents
- Breaks GSD's "fresh context per subagent" pattern, degrading quality

**Prevention:**
1. **Treat @ references as opaque strings:** Emit them verbatim in the Markdown, do NOT resolve them
2. **Document the pattern explicitly:** "@ references are passed through unchanged - they're instructions for the agent, not the transpiler"
3. **Consider a `<Reference path="...">` component:** Explicit JSX syntax that makes the "emit as-is" behavior clear
4. **Test that @ references survive round-trip:** Input TSX with `@.planning/foo.md` should produce output with identical text

**Detection (early warning signs):**
- Build output is much larger than expected
- File paths in output have been resolved to absolute paths
- Tests check for content inlining (wrong) instead of reference preservation (right)

**Phase to address:** Phase 2 (Component Implementation) - when building `<Agent>` and `<SpawnAgent>` components

**Confidence:** MEDIUM - derived from GSD documentation, need to verify exact behavior with actual GSD usage

---

### Pitfall 4: Generic Component Type Inference Failures in TSX

**What goes wrong:** TypeScript's generic inference in TSX has known edge cases where type parameters aren't correctly propagated, especially with complex nested generics or conditional types.

**Why it happens:** Parser ambiguity between `<T>` as generic parameter vs JSX tag. TypeScript 2.9+ added `<Component<Type> ...>` syntax but inference still struggles with certain patterns.

**Consequences:**
- `<SpawnAgent<MyInput> input={...}>` may not correctly infer that `input` must match `MyInput`
- Developers get vague "Type '{}' is not assignable" errors instead of helpful messages
- Complex Agent interfaces with generics fail to provide autocomplete

**Prevention:**
1. **Prefer explicit interface props over inline generics:** `interface SpawnAgentProps<T> { agent: Agent<T>; input: T }` with explicit type on the agent reference
2. **Use trailing comma syntax for generic functions in TSX:** `<T,>` not `<T>` to avoid parser ambiguity
3. **Test generic inference explicitly:** Include tests that verify autocomplete/type errors work as expected
4. **Consider non-generic alternative:** `<SpawnAgent agent={MyAgent} input={...}>` where type is inferred from agent reference

**Detection (early warning signs):**
- TypeScript errors mention `{}` or `unknown` where specific type was expected
- IDE autocomplete shows wrong or no suggestions for props
- Works in `.ts` test file but fails in actual `.tsx` usage

**Phase to address:** Phase 1 (Interface Design) - choose component API that avoids inference pitfalls

**Confidence:** HIGH - verified against TypeScript GitHub issues and community documentation

---

### Pitfall 5: Structured Return Format Mismatch

**What goes wrong:** GSD expects agents to return structured data in specific XML formats (`<execution_context>`, `<context>`, `<step>` blocks). The transpiler emits Markdown that doesn't match these conventions, causing GSD orchestration to fail.

**Why it happens:** The existing emitter produces generic Markdown. GSD has specific expectations about XML block naming, attribute patterns (`name` in snake_case, `priority` values), and nesting structure.

**Consequences:**
- Agents compile successfully but GSD can't parse their output
- Orchestrator logs show "unexpected format" or silently drops data
- Users debug their Agent logic when the issue is output format

**Prevention:**
1. **Study GSD output format requirements:** Identify required vs optional XML blocks, naming conventions, attribute schemas
2. **Create dedicated IR nodes for GSD constructs:** `ExecutionContextNode`, `StepNode` with enforced naming patterns
3. **Validate structured return blocks at transpile time:** Error if `<step>` is missing `name` attribute or uses wrong casing
4. **Include format examples in component documentation:** Show exact output that GSD expects

**Detection (early warning signs):**
- Manual comparison of transpiler output vs GSD examples shows differences
- Tests validate IR structure but don't verify final Markdown against GSD expectations
- Users report "Agent works standalone but not when spawned"

**Phase to address:** Phase 2 (Component Implementation) - study GSD format before implementing `<Agent>` component

**Confidence:** MEDIUM - need to verify exact GSD parsing requirements (may vary by version)

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt but are recoverable.

### Pitfall 6: Props vs Children Ambiguity for Agent Content

**What goes wrong:** Unclear API design for Agent content. Should instructions be props (`<Agent instructions="...">`) or children (`<Agent><p>Instructions...</p></Agent>`)? Inconsistent decisions lead to confusing API.

**Why it happens:** The existing Command uses children for body content. But Agent has multiple content sections (system prompt, role, execution context, structured return). Mixing props and children creates awkwardness.

**Prevention:**
1. **Define clear slots upfront:** Role (prop), System prompt (child of specific component), Execution context (child), Structured return (child)
2. **Consider slot components:** `<Agent.SystemPrompt>`, `<Agent.ExecutionContext>`, `<Agent.Return>` pattern
3. **Follow Command precedent:** If it works for Command, use same pattern for Agent's body
4. **Document slot composition:** Show complete example with all slots filled

**Detection (early warning signs):**
- Debates about "where does X go" during implementation
- Need to nest components 3+ levels deep for basic Agent definition
- Users ask "why is this a prop and that's a child?"

**Phase to address:** Phase 1 (Interface Design) - decide API before implementation

---

### Pitfall 7: Implicit vs Explicit Agent Resolution

**What goes wrong:** `<SpawnAgent>` needs to reference a specific Agent. Should it use string name (`agent="researcher"`), import reference (`agent={Researcher}`), or path reference (`agent="./agents/researcher.tsx"`)? Each has tradeoffs.

**Why it happens:** Multiple valid approaches exist. String names are simple but not type-safe. Import references are type-safe but couple files. Path references work at transpile time but lose IDE support.

**Prevention:**
1. **Require import reference for type safety:** `import { Researcher } from './agents/researcher'` then `<SpawnAgent agent={Researcher}>`
2. **Resolve agent interface from import:** At transpile time, follow the import to extract the Agent's interface
3. **Allow string override for external agents:** `agentPath="~/.claude/commands/external.md"` when Agent isn't in transpiler scope
4. **Test both internal and external agent patterns**

**Detection (early warning signs):**
- Implementation starts before deciding resolution strategy
- Tests use strings but product uses imports (or vice versa)
- IDE shows no autocomplete for agent reference

**Phase to address:** Phase 1 (Interface Design) - choose resolution strategy upfront

---

### Pitfall 8: Frontmatter Schema Extension Conflicts

**What goes wrong:** Command uses frontmatter for `name`, `description`, `allowed-tools`. Agent needs additional fields (model, spawn-strategy, etc.). Mixing these creates confusion about which fields apply where.

**Why it happens:** YAML frontmatter is untyped. Easy to add fields without schema validation. Different component types need different schemas.

**Prevention:**
1. **Define schema per component type:** CommandFrontmatter vs AgentFrontmatter interfaces
2. **Validate at transpile time:** Error on unknown frontmatter fields
3. **Use distinct required fields:** Command requires `name`, Agent requires `name` + something Agent-specific
4. **Document frontmatter schemas clearly:** Table showing field, type, which components use it

**Detection (early warning signs):**
- Users put Command fields on Agent or vice versa
- Silent acceptance of typos in field names
- "Works sometimes" because field was ignored

**Phase to address:** Phase 2 (Component Implementation) - implement validation when building components

---

### Pitfall 9: Whitespace Sensitivity in Structured Blocks

**What goes wrong:** GSD's XML blocks may be whitespace-sensitive for parsing. The existing emitter normalizes whitespace. Normalization might break expected indentation in code blocks or structured returns.

**Why it happens:** The Markdown emitter joins blocks with `\n\n`. XML blocks use `\n` for inner content. Mismatch between "pretty" output and "parseable" output.

**Prevention:**
1. **Test output whitespace exactly:** Snapshot tests that capture exact spacing
2. **Preserve whitespace in structured return blocks:** Don't normalize content inside `<execution_context>` etc.
3. **Add emitter option for strict whitespace:** Some blocks need preservation, others can be pretty-printed
4. **Verify against actual GSD parsing:** Feed transpiler output to GSD and confirm it works

**Detection (early warning signs):**
- Tests pass but visual diff shows unexpected blank lines
- Code blocks inside XML blocks lose indentation
- GSD reports "malformed block" on valid-looking output

**Phase to address:** Phase 3 (Integration Testing) - verify against real GSD

---

## Minor Pitfalls

Mistakes that cause annoyance but are easily fixable.

### Pitfall 10: Naming Convention Mismatch

**What goes wrong:** TSX uses PascalCase for components (`SpawnAgent`), but GSD conventions might expect snake_case for certain identifiers (task names, step names). Output uses wrong case.

**Prevention:**
1. **Document casing rules:** "Component names are PascalCase, output identifiers are snake_case"
2. **Auto-convert where appropriate:** `<Step name="validateInput">` emits `name="validate_input"`
3. **Warn on casing violations:** At transpile time, flag names that don't match expected convention

---

### Pitfall 11: Missing Source Location in Agent Errors

**What goes wrong:** Errors from Agent/SpawnAgent don't include helpful file:line:col information because the error happens during inter-file resolution, not single-file parsing.

**Prevention:**
1. **Propagate source location through resolution:** When resolving Agent import, track the SpawnAgent usage location
2. **Include both locations in errors:** "SpawnAgent at file.tsx:15:5 references Agent at agent.tsx:3:1"
3. **Test error messages explicitly:** Verify errors show correct locations

---

### Pitfall 12: Stale Type Definitions After Agent Changes

**What goes wrong:** Developer changes Agent's interface but doesn't rebuild. Command uses old type definitions from previous transpilation. Type mismatch only discovered at runtime.

**Prevention:**
1. **Document rebuild requirements:** "After changing Agent interfaces, rebuild all dependent Commands"
2. **Consider emitting `.d.ts` files:** Let TypeScript track dependencies normally
3. **Watch mode should rebuild dependents:** When Agent changes, rebuild Commands that import it

---

## Prevention Strategies

### Strategy 1: Type-Only Import Detection

**Applies to:** Pitfalls 1, 2

```typescript
// In transformer.ts or new type-resolver.ts
function isTypeOnlyImport(importDecl: ImportDeclaration): boolean {
  // TypeScript 3.8+ has import type syntax
  return importDecl.isTypeOnly();
}

function resolveAgentInterface(
  componentName: string,
  sourceFile: SourceFile
): InterfaceDeclaration | null {
  const importDecl = sourceFile.getImportDeclaration((decl) => {
    // Find import that includes the interface name
    return decl.getNamedImports().some((ni) => ni.getName() === componentName);
  });

  if (!importDecl) return null;

  // Type-only imports follow different resolution rules
  // They don't trigger circular dependency errors
  const isTypeOnly = isTypeOnlyImport(importDecl);

  // ... resolve to interface declaration
}
```

### Strategy 2: GSD Format Validation

**Applies to:** Pitfall 5

```typescript
// New validation in emitter or post-emit phase
const GSD_STEP_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

function validateStepNode(node: StepNode): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!node.name) {
    errors.push({ message: '<step> requires name attribute' });
  } else if (!GSD_STEP_NAME_PATTERN.test(node.name)) {
    errors.push({
      message: `Step name "${node.name}" must be snake_case`,
      suggestion: toSnakeCase(node.name),
    });
  }

  return errors;
}
```

### Strategy 3: Interface Contract Extraction

**Applies to:** Pitfalls 1, 4, 7

```typescript
// Extract interface schema from Agent definition
interface ExtractedContract {
  inputInterface: string;      // Interface name
  inputSchema: PropertyInfo[]; // Simplified schema for documentation
  outputFormat: string;        // "structured" | "markdown" | "raw"
}

function extractAgentContract(
  agentSourceFile: SourceFile
): ExtractedContract {
  // Find exported interface that matches naming convention
  const inputInterface = agentSourceFile.getInterface((iface) =>
    iface.getName()?.endsWith('Input')
  );

  // Extract property names and types for schema comment
  const properties = inputInterface?.getProperties().map((p) => ({
    name: p.getName(),
    type: p.getType().getText(),
    optional: p.hasQuestionToken(),
  }));

  return {
    inputInterface: inputInterface?.getName() ?? 'unknown',
    inputSchema: properties ?? [],
    outputFormat: detectOutputFormat(agentSourceFile),
  };
}
```

### Strategy 4: @ Reference Preservation Test

**Applies to:** Pitfall 3

```typescript
// Test that verifies @ references are NOT resolved
describe('@ reference handling', () => {
  it('preserves @ references verbatim', () => {
    const input = `
      <Agent name="researcher">
        <Markdown>
          Load context from @.planning/PROJECT.md before proceeding.
        </Markdown>
      </Agent>
    `;

    const output = transpile(input);

    // @ reference should appear unchanged in output
    expect(output).toContain('@.planning/PROJECT.md');

    // Should NOT contain resolved content
    expect(output).not.toContain('# Project Name'); // hypothetical file content
  });
});
```

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|----------------|------------|
| Phase 1 | Interface Design | Generic type inference failures (Pitfall 4) | Test API with complex types before committing to design |
| Phase 1 | Interface Design | Props vs children ambiguity (Pitfall 6) | Define slot pattern upfront with examples |
| Phase 1 | Architecture | Circular dependency handling (Pitfall 2) | Separate type resolution from component resolution |
| Phase 2 | Agent Component | @ reference inlining (Pitfall 3) | Emit references verbatim, test preservation |
| Phase 2 | Agent Component | Structured return format (Pitfall 5) | Study GSD output examples before implementation |
| Phase 2 | SpawnAgent Component | Agent resolution strategy (Pitfall 7) | Require import reference for type safety |
| Phase 2 | Frontmatter | Schema conflicts (Pitfall 8) | Define distinct schemas per component type |
| Phase 3 | Integration | Whitespace sensitivity (Pitfall 9) | Snapshot test exact output format |
| Phase 3 | Integration | Type boundary loss (Pitfall 1) | Document limitation, consider schema comments |
| Post-MVP | DX | Stale types (Pitfall 12) | Watch mode should track cross-file dependencies |

---

## GSD-Specific Gotchas Explained

### "Context doesn't cross Task boundaries"

**What it means:**
- Each Task runs in a fresh subagent with its own 200K token context
- The orchestrator doesn't share its context with spawned Tasks
- Tasks communicate through files (.planning/STATE.md, agent-history.json) not memory

**Transpiler implications:**
1. @ references are instructions for the Task, not content for the orchestrator
2. Don't inline file contents - that bloats orchestrator context
3. Each Agent output should be self-contained (include all needed references)
4. Structured returns write to files, not return to orchestrator memory

### "Subagents have 200k tokens purely for implementation"

**What it means:**
- Main context accumulates garbage (conversation history, failed attempts)
- Subagents start fresh with only explicit context injections
- Quality degrades beyond 50% context utilization

**Transpiler implications:**
1. Agent definitions should be concise (the Markdown is loaded into subagent)
2. Large inline content hurts the subagent's working context
3. Reference external files via @ rather than embedding content

### Structured Return Pattern

**What GSD expects:**
```xml
<execution_context>
  @~/.claude/get-shit-done/workflows/execute-phase.md
</execution_context>

<step name="validate_inputs" priority="high">
  1. Check that all required fields are present
  2. Verify types match expected schema
</step>
```

**Key conventions:**
- `name` attribute uses snake_case
- `priority` is optional, values: high | medium | low
- Steps are ordered execution instructions
- References use @ prefix

---

## Sources

### TypeScript Type System
- [TypeScript Type Erasure - FreeCodeCamp](https://www.freecodecamp.org/news/what-is-type-erasure-in-typescript/)
- [TypeScript 3.8 - Type-Only Imports](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html)
- [TypeScript JSX Documentation](https://www.typescriptlang.org/docs/handbook/jsx.html)

### Generic Type Inference in TSX
- [Passing Generics to JSX Elements - Marius Schulz](https://mariusschulz.com/blog/passing-generics-to-jsx-elements-in-typescript)
- [TypeScript Issue #16499 - Generic Inference Failures](https://github.com/Microsoft/TypeScript/issues/16499)
- [TypeScript Issue #3960 - Generics in JSX](https://github.com/Microsoft/TypeScript/issues/3960)

### Circular Dependencies
- [Taming Circular Dependencies in TypeScript - Medium](https://medium.com/inkitt-tech/taming-circular-dependencies-in-typescript-d63df1ec8c80)
- [Fix Circular Dependencies Once and For All - Michel Weststrate](https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de)

### GSD Framework
- [GSD GitHub Repository](https://github.com/glittercowboy/get-shit-done)
- [GSD Style Guide](https://github.com/glittercowboy/get-shit-done/blob/main/GSD-STYLE.md)

### Context Engineering for Agentic Systems
- [MCP Security Analysis - arxiv](https://arxiv.org/html/2512.08290v1)
- [Prompt Injection in AI Coding Editors - arxiv](https://arxiv.org/html/2509.22040v1)

---

## Summary

The v1.1 Agent framework addition faces three categories of challenges:

1. **Type boundary challenges:** TypeScript types exist at compile time but Markdown has no type system. Accept this limitation and focus on compile-time validation.

2. **Resolution complexity:** Agents and Commands have different dependency relationships than component composition. Type-only imports need separate handling.

3. **GSD format compliance:** The output must match GSD's specific XML block conventions, whitespace expectations, and @ reference patterns. Study actual GSD usage before implementation.

**Highest-risk pitfall:** Type information loss (Pitfall 1) because it's fundamental to the problem space and cannot be fully solved, only mitigated through documentation and compile-time validation.

**Most likely pitfall:** Circular dependency errors (Pitfall 2) because the existing codebase already handles this for composition, making it easy to assume the same logic applies to Agent/Command relationships.
