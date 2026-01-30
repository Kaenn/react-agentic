# Phase 12: Typed SpawnAgent Input - Research

**Researched:** 2026-01-21
**Domain:** TypeScript compile-time transformation, type-driven code generation
**Confidence:** HIGH

## Summary

This phase transforms SpawnAgent from prompt-based to type-driven communication. Instead of manually writing prompts with `{placeholder}` syntax, developers pass typed `input` props that auto-generate structured prompts based on the Agent's interface contract.

The research domain is entirely within the existing codebase - this is internal architecture work, not external library integration. The transformer already extracts interface properties and validates prompt placeholders; this phase inverts the flow: generate prompts FROM interfaces instead of validating prompts AGAINST interfaces.

Key insight: The existing infrastructure (`extractInterfaceProperties`, `resolveTypeImport`, `SpawnAgentNode`) provides 80% of what's needed. The main work is:
1. New prop parsing (`input` accepting VariableRef OR object literal)
2. Prompt generation from interface properties
3. Making `prompt` prop optional (backward compat)
4. Appending children as extra instructions

**Primary recommendation:** Extend SpawnAgentNode with optional `input` field, add prompt generation in emitter, deprecate but preserve `prompt` prop.

## Standard Stack

This phase uses only existing project dependencies - no new libraries needed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-morph | existing | TypeScript AST manipulation | Already used for all parsing |
| TypeScript | existing | Type system | Compile-time type checking |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | existing | Testing | All unit/integration tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Code generation | Runtime type checking | Defeats compile-time safety goal |
| Schema validation libs | Native TS | Overkill - types are static, known at compile time |

**Installation:**
```bash
# No new dependencies needed
```

## Architecture Patterns

### Current SpawnAgent Flow
```
TSX: <SpawnAgent prompt={`...`} />
       ↓ (transformer)
IR:  SpawnAgentNode { prompt: string }
       ↓ (emitter)
MD:  Task(prompt="...", ...)
```

### New Typed Input Flow
```
TSX: <SpawnAgent input={varRef} />           # VariableRef form
     <SpawnAgent input={{ phase, goal }} />   # Object literal form
       ↓ (transformer)
IR:  SpawnAgentNode {
       input: { type: 'variable', ref: VariableRef }
            | { type: 'object', properties: Array<{name, value}> }
       inputType: TypeReference  # For prompt generation
     }
       ↓ (emitter - prompt generation)
MD:  Task(prompt="<phase>\n{phase}\n</phase>\n<goal>\n{goal}\n</goal>", ...)
```

### Recommended IR Extension

```typescript
// Existing SpawnAgentNode
export interface SpawnAgentNode {
  kind: 'spawnAgent';
  agent: string;
  model: string;
  description: string;
  prompt: string;                    // Keep for backward compat
  inputType?: TypeReference;
}

// Extended SpawnAgentNode
export interface SpawnAgentNode {
  kind: 'spawnAgent';
  agent: string;
  model: string;
  description: string;
  prompt?: string;                   // Optional now (deprecated)
  inputType?: TypeReference;
  input?: SpawnAgentInput;           // NEW: typed input
  extraInstructions?: string;        // NEW: children content
}

export type SpawnAgentInput =
  | { type: 'variable'; variableName: string }  // useVariable ref
  | { type: 'object'; properties: InputProperty[] };  // object literal

export interface InputProperty {
  name: string;
  value: InputPropertyValue;
}

export type InputPropertyValue =
  | { type: 'string'; value: string }
  | { type: 'variable'; name: string }
  | { type: 'placeholder'; name: string };  // {varname} syntax
```

### Pattern 1: VariableRef Input
**What:** SpawnAgent receives input from useVariable result
**When to use:** Dynamic input computed at runtime
**Example:**
```typescript
// In TSX:
const researchContext = useVariable("RESEARCH_CTX", {
  bash: `cat ${PHASE_DIR}/context.json`
});

<SpawnAgent<ResearcherInput>
  input={researchContext}
  agent="researcher"
  model="{model}"
  description="Research phase"
>
  Additional instructions here
</SpawnAgent>

// Generated prompt:
// <input>
// {research_ctx}
// </input>
//
// Additional instructions here
```

### Pattern 2: Object Literal Input
**What:** SpawnAgent receives inline object with property values
**When to use:** Static or simple dynamic input
**Example:**
```typescript
// In TSX:
<SpawnAgent<ResearcherInput>
  input={{ phase: "{phase}", goal: "Complete research" }}
  agent="researcher"
  model="{model}"
  description="Research phase"
/>

// Generated prompt based on ResearcherInput interface:
// <phase>
// {phase}
// </phase>
//
// <goal>
// Complete research
// </goal>
```

### Pattern 3: Prompt Generation from Interface
**What:** Auto-generate XML-structured prompt from interface properties
**When to use:** Always when `input` prop is used
**Example:**
```typescript
// Interface:
export interface ResearcherInput {
  phase: string;
  description: string;
  requirements?: string;
}

// Object literal input:
<SpawnAgent input={{ phase: "5", description: "Build UI" }} />

// Generated prompt:
// <phase>
// 5
// </phase>
//
// <description>
// Build UI
// </description>
//
// (requirements omitted - not provided in input)
```

### Anti-Patterns to Avoid
- **Mixing prompt and input:** Use one or the other, not both
- **Untyped input prop:** Always specify generic type parameter
- **Mismatch between input and interface:** Compiler should catch this

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type extraction | Manual AST traversal | `extractTypeArguments()` | Already exists, tested |
| Interface parsing | Custom interface parser | `extractInterfaceProperties()` | Already exists, tested |
| Type resolution | Manual import following | `resolveTypeImport()` | Already exists, handles all cases |
| Object literal parsing | Custom parser | `extractObjectLiteralProps()` | Already exists for spread attrs |

**Key insight:** The parser.ts already has all the infrastructure for type extraction and object literal parsing. Reuse these utilities.

## Common Pitfalls

### Pitfall 1: Breaking Backward Compatibility
**What goes wrong:** Existing `prompt` prop stops working
**Why it happens:** Rushing to replace instead of deprecate
**How to avoid:**
- Keep `prompt` prop working
- Log deprecation warning in CLI output (not error)
- Validation: if both `prompt` and `input`, error
**Warning signs:** Existing test files start failing

### Pitfall 2: Losing {placeholder} Support
**What goes wrong:** `{variable}` syntax in object values doesn't pass through
**Why it happens:** Treating all string values as literal text
**How to avoid:**
- Detect `{...}` patterns in object property values
- Preserve them as `InputPropertyValue.type: 'placeholder'`
- Emit unchanged in generated prompt
**Warning signs:** Runtime variables don't resolve

### Pitfall 3: Type Mismatch Validation Gap
**What goes wrong:** Object literal properties don't match interface
**Why it happens:** Only validating at runtime, not compile time
**How to avoid:**
- Compare object literal keys against interface properties
- Error if required properties missing
- Warn if extra properties provided
**Warning signs:** Invalid prompts generated silently

### Pitfall 4: Children Content Placement
**What goes wrong:** Extra instructions overwrite or conflict with generated prompt
**Why it happens:** Unclear boundary between auto-prompt and children
**How to avoid:**
- Clear separation: auto-prompt first, then children
- Document the pattern: children are "extra instructions"
- Never merge children into structured input section
**Warning signs:** Garbled output when children present

## Code Examples

### Extracting Object Literal from JSX (existing pattern)
```typescript
// Source: src/parser/parser.ts - extractObjectLiteralProps()
export function extractObjectLiteralProps(
  objLiteral: ObjectLiteralExpression
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const prop of objLiteral.getProperties()) {
    if (Node.isPropertyAssignment(prop)) {
      const name = prop.getName();
      const initializer = prop.getInitializer();
      if (Node.isStringLiteral(initializer)) {
        result[name] = initializer.getLiteralValue();
      }
      // ... other types
    }
  }
  return result;
}
```

### Resolving VariableRef (existing pattern)
```typescript
// Source: src/parser/transformer.ts - transformAssign()
// Pattern for looking up useVariable by identifier name
const expr = init.getExpression();
if (!expr || !Node.isIdentifier(expr)) {
  throw error('Assign var must reference a useVariable result');
}
const localName = expr.getText();
const variable = this.variables.get(localName);
```

### Interface Property Extraction (existing)
```typescript
// Source: src/parser/parser.ts - extractInterfaceProperties()
export function extractInterfaceProperties(
  iface: InterfaceDeclaration
): InterfaceProperty[] {
  const properties: InterfaceProperty[] = [];
  for (const prop of iface.getProperties()) {
    properties.push({
      name: prop.getName(),
      required: !prop.hasQuestionToken(),
      type: prop.getType().getText(),
    });
  }
  return properties;
}
```

### Prompt Generation (new - emitter pattern)
```typescript
// Pattern for emitter - generateInputPrompt()
function generateInputPrompt(
  input: SpawnAgentInput,
  interfaceProps: InterfaceProperty[]
): string {
  const sections: string[] = [];

  if (input.type === 'variable') {
    // Single variable reference - wrap in <input> block
    return `<input>\n{${input.variableName.toLowerCase()}}\n</input>`;
  }

  // Object literal - create section per property
  for (const prop of input.properties) {
    const value = prop.value.type === 'placeholder'
      ? `{${prop.value.name}}`
      : prop.value.value;
    sections.push(`<${prop.name}>\n${value}\n</${prop.name}>`);
  }

  return sections.join('\n\n');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual prompts | Type-driven input | Phase 12 | Compile-time validation of agent communication |
| {placeholder} validation | Placeholder generation | Phase 12 | Prompts can't miss required fields |
| Unstructured prompts | XML-structured prompts | Phase 12 | Consistent agent input format |

**Deprecated/outdated:**
- `prompt` prop: Still functional but deprecated. Use `input` prop instead.

## Open Questions

1. **Children raw vs processed?**
   - What we know: Children become "extra instructions" appended to auto-prompt
   - What's unclear: Should children go through full Markdown transformation or raw pass?
   - Recommendation: Use raw content (like Markdown component) - keep it simple

2. **Validation strictness level?**
   - What we know: Current validation is warning-mode (continues on error)
   - What's unclear: Should type mismatch in `input` be error or warning?
   - Recommendation: Error for type mismatch (breaking = intentional for type safety)

3. **VariableRef type compatibility?**
   - What we know: VariableRef has phantom type `T`, Agent has `TInput`
   - What's unclear: How to validate `VariableRef<T>` against `TInput` at compile time
   - Recommendation: Trust developer (can't fully validate runtime variable content)

## Sources

### Primary (HIGH confidence)
- `/Users/glenninizan/workspace/react-agentic/src/ir/nodes.ts` - IR node definitions
- `/Users/glenninizan/workspace/react-agentic/src/parser/transformer.ts` - Transform patterns
- `/Users/glenninizan/workspace/react-agentic/src/parser/parser.ts` - Type resolution utilities
- `/Users/glenninizan/workspace/react-agentic/src/emitter/emitter.ts` - Emit patterns
- `/Users/glenninizan/workspace/react-agentic/src/jsx.ts` - Component interfaces

### Secondary (MEDIUM confidence)
- Existing test files for patterns and edge cases
- docs/communication.md, docs/variables.md for existing behavior

### Tertiary (LOW confidence)
- None - this is internal architecture work with full codebase access

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all internal
- Architecture: HIGH - clear extension of existing patterns
- Pitfalls: HIGH - based on direct codebase analysis

**Research date:** 2026-01-21
**Valid until:** N/A - internal architecture, validity tied to codebase changes
