# Phase 14: Agent Output Schema - Research

**Researched:** 2026-01-22
**Domain:** TypeScript type extraction for agent output contracts, compile-time code generation
**Confidence:** HIGH

## Summary

Phase 14 extends the existing Agent type system to include output contracts. The codebase already has robust infrastructure for extracting TypeScript types from interfaces (see `extractInterfaceProperties` in parser.ts, `resolveTypeImport` for cross-file resolution). The task is to:

1. Define standard `AgentStatus` and `BaseOutput` types in jsx.ts
2. Extend the Agent generic to `<Agent<TInput, TOutput>>` (currently only TInput)
3. Extract TOutput interface properties using existing ts-morph patterns
4. Auto-generate a `<structured_returns>` XML section in emitted agent markdown

This is primarily an extension of existing patterns, not new architecture. The ts-morph infrastructure for type extraction is already proven through Phase 11-12.

**Primary recommendation:** Use the existing `extractInterfaceProperties` and `resolveTypeImport` functions to extract TOutput, then template the `<structured_returns>` section based on status field values.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-morph | 24.0.0 | TypeScript AST manipulation | Already in use, proven patterns for type extraction |
| TypeScript | 5.x | Type system | Native generic type parameter support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| gray-matter | 4.0.3 | YAML frontmatter | Already used for Agent frontmatter emission |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ts-morph type extraction | Manual AST parsing | ts-morph provides SyntaxKind.TypeReference, getDescendantsOfKind - no reason to hand-roll |
| Hard-coded templates | Schema-driven generation | Schema approach is more maintainable but over-engineered for 5 status codes |

## Architecture Patterns

### Recommended Extension Structure
```
src/
├── jsx.ts              # Add AgentStatus, BaseOutput types + extend Agent<TInput, TOutput>
├── ir/nodes.ts         # Extend AgentFrontmatterNode with outputType?: TypeReference
├── parser/parser.ts    # Reuse extractInterfaceProperties (already handles interface extraction)
├── parser/transformer.ts # Extend transformAgent to extract second type parameter
├── emitter/emitter.ts  # Add emitStructuredReturns method
```

### Pattern 1: Second Type Parameter Extraction
**What:** Extend `extractTypeArguments` to return both TInput and TOutput
**When to use:** When parsing `<Agent<TInput, TOutput>>`
**Example:**
```typescript
// Current: extractTypeArguments returns string[] | undefined
// Returns: ['ResearcherInput'] for <Agent<ResearcherInput>>

// Extended usage in transformAgent:
const typeArgs = extractTypeArguments(node);
let inputType: TypeReference | undefined;
let outputType: TypeReference | undefined;

if (typeArgs && typeArgs.length > 0) {
  inputType = { kind: 'typeReference', name: typeArgs[0], resolved: false };
}
if (typeArgs && typeArgs.length > 1) {
  outputType = { kind: 'typeReference', name: typeArgs[1], resolved: false };
}
```

### Pattern 2: Output Type Interface Structure
**What:** Define standard output types that all agent outputs must extend
**When to use:** All agent output types
**Example:**
```typescript
// src/jsx.ts

/**
 * Standard agent return status codes (HTTP-like semantics)
 */
export type AgentStatus =
  | 'SUCCESS'      // Agent completed successfully
  | 'BLOCKED'      // Agent cannot proceed, needs input
  | 'NOT_FOUND'    // Requested resource/data not found
  | 'ERROR'        // Agent encountered an error
  | 'CHECKPOINT';  // Agent reached milestone, continuing

/**
 * Base interface all agent outputs must extend
 */
export interface BaseOutput {
  /** Required: Agent completion status */
  status: AgentStatus;
  /** Optional: Human-readable status message */
  message?: string;
}

// Example usage in agent file:
export interface ResearcherOutput extends BaseOutput {
  // Status-specific fields for SUCCESS
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  findings?: string[];
  filePath?: string;

  // Status-specific fields for BLOCKED
  blockedBy?: string;
  options?: string[];
}
```

### Pattern 3: Structured Returns Generation
**What:** Auto-generate `<structured_returns>` section from output interface
**When to use:** When emitting Agent markdown with TOutput
**Example:**
```typescript
// emitter.ts extension

private emitStructuredReturns(outputType: TypeReference, sourceFile: SourceFile): string {
  // Resolve interface using existing resolveTypeImport
  const resolved = resolveTypeImport(outputType.name, sourceFile);
  if (!resolved?.interface) return '';

  // Extract properties using existing extractInterfaceProperties
  const props = extractInterfaceProperties(resolved.interface);

  // Group by status-relevance (heuristic: SUCCESS fields vs BLOCKED fields)
  return this.generateStatusTemplates(props);
}

private generateStatusTemplates(props: InterfaceProperty[]): string {
  // Generate markdown showing what each status returns
  // Based on field names and types
}
```

### Anti-Patterns to Avoid
- **Hardcoding output schemas:** Don't embed specific field names in the emitter. Extract from interface dynamically.
- **Runtime type checking:** This is compile-time only. Don't add runtime type guards.
- **Over-engineering status routing:** Phase 14 just generates the section. Phase 15 handles consumption.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type parameter extraction | Custom regex parsing | `extractTypeArguments()` | Already extracts TypeReference from JSX |
| Interface property extraction | AST walking | `extractInterfaceProperties()` | Handles optional, required, type text |
| Type import resolution | Manual import tracking | `resolveTypeImport()` | Handles local + cross-file types |
| Type extends checking | Runtime validation | TypeScript `extends` constraint | Compiler enforces at build time |

**Key insight:** The type extraction infrastructure is already built and tested. Phase 14 is composition, not construction.

## Common Pitfalls

### Pitfall 1: Forgetting Backward Compatibility
**What goes wrong:** Breaking existing `<Agent<TInput>>` single-param usage
**Why it happens:** Requiring TOutput on all agents
**How to avoid:** Default TOutput to `unknown` when not provided (same pattern as TInput today)
**Warning signs:** Tests fail for existing agent files

### Pitfall 2: Over-specifying Status Fields
**What goes wrong:** Trying to validate that SUCCESS has confidence field, BLOCKED has blockedBy, etc.
**Why it happens:** Wanting strict contracts
**How to avoid:** Let TypeScript handle field presence through discriminated unions (user's responsibility)
**Warning signs:** Complex conditional logic in emitter

### Pitfall 3: Generating Non-Useful Templates
**What goes wrong:** `<structured_returns>` section is too generic to be useful
**Why it happens:** Not understanding what fields mean
**How to avoid:** Use heuristics based on common field names (confidence, findings, filePath for SUCCESS; blockedBy, options for BLOCKED)
**Warning signs:** Templates look like raw interface dumps

### Pitfall 4: Breaking Emitter Exhaustiveness
**What goes wrong:** TypeScript no longer catches unhandled cases
**Why it happens:** Adding optional outputType to frontmatter without updating switch
**How to avoid:** Keep discriminated union pattern, test with assertNever
**Warning signs:** Compile errors in emitter switch statements

## Code Examples

Verified patterns from existing codebase:

### Type Parameter Extraction (existing)
```typescript
// Source: src/parser/parser.ts lines 488-506
export function extractTypeArguments(
  element: JsxElement | JsxSelfClosingElement
): string[] | undefined {
  const openingElement = Node.isJsxElement(element)
    ? element.getOpeningElement()
    : element;

  const typeRefNodes = openingElement.getDescendantsOfKind(SyntaxKind.TypeReference);

  if (typeRefNodes.length === 0) {
    return undefined;
  }

  return typeRefNodes.map(node => node.getText());
}
```

### Interface Property Extraction (existing)
```typescript
// Source: src/parser/parser.ts lines 688-702
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

### Current Agent Transformation (to extend)
```typescript
// Source: src/parser/transformer.ts lines 240-290
private transformAgent(node: JsxElement | JsxSelfClosingElement): AgentDocumentNode {
  // ... extract props ...

  // Extract generic type argument if present
  const typeArgs = extractTypeArguments(node);
  let inputType: TypeReference | undefined;
  if (typeArgs && typeArgs.length > 0) {
    inputType = {
      kind: 'typeReference',
      name: typeArgs[0],
      resolved: false,
    };
  }

  // Build frontmatter
  const frontmatter: AgentFrontmatterNode = {
    kind: 'agentFrontmatter',
    name,
    description,
    ...(inputType && { inputType }),
    // TODO Phase 14: add outputType
  };
}
```

### Expected Output Format (GSD pattern)
```markdown
<!-- From gsd-phase-researcher.md -->
<structured_returns>
## Research Complete

When research finishes successfully:

```markdown
## RESEARCH COMPLETE

**Phase:** {phase_number} - {phase_name}
**Confidence:** [HIGH/MEDIUM/LOW]

### Key Findings
[3-5 bullet points of most important discoveries]
```

## Research Blocked

When research cannot proceed:

```markdown
## RESEARCH BLOCKED

**Phase:** {phase_number} - {phase_name}
**Blocked by:** [what's preventing progress]
```
</structured_returns>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual structured_returns | TOutput interface | Phase 14 | Auto-generation from types |
| Single TInput generic | TInput + TOutput generics | Phase 14 | Complete type contracts |
| No output validation | BaseOutput constraint | Phase 14 | Standard status codes |

**Deprecated/outdated:**
- Manual `<structured_returns>` authoring when TOutput is provided (still supported for legacy)

## Open Questions

1. **Status-specific field heuristics**
   - What we know: Common field names correlate with statuses (confidence → SUCCESS, blockedBy → BLOCKED)
   - What's unclear: How to reliably map arbitrary field names to statuses
   - Recommendation: Use explicit JSDoc annotations OR require discriminated union on status field

2. **Handling union types in output fields**
   - What we know: `prop.getType().getText()` returns full type text including unions
   - What's unclear: Whether to expand or preserve union types in templates
   - Recommendation: Preserve as-is, let user handle complexity

3. **Nested object types in output**
   - What we know: `extractInterfaceProperties` handles top-level properties only
   - What's unclear: Whether to recursively extract nested interface properties
   - Recommendation: Phase 14 handles top-level only. Nested extraction deferred.

## Sources

### Primary (HIGH confidence)
- `/Users/glenninizan/workspace/react-agentic/src/parser/parser.ts` - extractInterfaceProperties, resolveTypeImport functions
- `/Users/glenninizan/workspace/react-agentic/src/parser/transformer.ts` - transformAgent, extractTypeArguments usage
- `/Users/glenninizan/workspace/react-agentic/src/ir/nodes.ts` - AgentFrontmatterNode, TypeReference
- `/Users/glenninizan/workspace/react-agentic/src/jsx.ts` - Agent component, AgentProps interface
- `/Users/glenninizan/workspace/react-agentic/src/emitter/emitter.ts` - emitAgentFrontmatter, emitAgent patterns

### Secondary (MEDIUM confidence)
- `/Users/glenninizan/workspace/react-agentic/.claude/agents/gsd/gsd-phase-researcher.md` - Real-world structured_returns format
- `/Users/glenninizan/workspace/react-agentic/docs/agent.md` - Current agent documentation patterns

### Tertiary (LOW confidence)
- None - this research is based entirely on codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing ts-morph patterns already proven in Phase 11-12
- Architecture: HIGH - Extension of existing transformer/emitter patterns
- Pitfalls: HIGH - Based on prior phase implementation experience

**Research date:** 2026-01-22
**Valid until:** Indefinite (internal codebase patterns, not external libraries)
