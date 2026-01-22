# Phase 15: Command Output Handling - Research

**Researched:** 2026-01-22
**Domain:** TSX-to-Markdown command-side agent output handling, typed status-based conditionals
**Confidence:** HIGH

## Summary

Phase 15 builds the command-side infrastructure to consume agent outputs defined in Phase 14. The goal is to provide a type-safe mechanism for commands to handle different agent return statuses (SUCCESS, BLOCKED, NOT_FOUND, ERROR, CHECKPOINT) with conditional blocks that react to those statuses.

The implementation follows established react-agentic patterns:
1. **useOutput hook** - Similar to useVariable, returns a typed accessor bound to a spawned agent's output
2. **OnStatus component** - Similar to If/Else but keyed on agent status values instead of shell tests
3. **Output field interpolation** - Access output fields like `{output.confidence}` within OnStatus children
4. **Emitter support** - Generate status-based conditional prose blocks in markdown output

This is a natural extension of the existing hook/component/IR/emitter architecture. The patterns from useVariable/Assign and If/Else provide clear templates to follow.

**Primary recommendation:** Implement useOutput as a hook returning OutputRef<TOutput> with typed field accessors, and OnStatus as a status-discriminated conditional component that emits prose blocks like `**On {status}:**`.

## Standard Stack

This phase uses only existing project dependencies - no new libraries needed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-morph | 24.0.0 | TypeScript AST manipulation | Already in use for all parsing and type extraction |
| TypeScript | 5.x | Type system | Provides generic type parameters for type safety |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| gray-matter | 4.0.3 | YAML frontmatter | Already used in emitter |
| vitest | existing | Testing | Unit/integration tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OnStatus component | Extend If/Else with status prop | OnStatus is clearer, status semantics differ from shell tests |
| Field interpolation `{output.field}` | Template literal `${output.field}` | Consistent with existing `{variable}` GSD syntax |
| Per-status components | Single OnStatus with status prop | Single component is more flexible, matches If pattern |

**Installation:**
```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended Extension Structure
```
src/
├── jsx.ts              # Add useOutput hook, OutputRef type, OnStatus/OnStatusProps
├── ir/nodes.ts         # Add OnStatusNode with status, outputRef, children
├── parser/transformer.ts # Add transformOnStatus, track output refs
├── emitter/emitter.ts  # Add emitOnStatus method
```

### Pattern 1: useOutput Hook
**What:** Hook that binds to a spawned agent and returns typed accessor for its output
**When to use:** When command needs to react to agent output status or access output fields
**Example:**
```typescript
// Source: Follows useVariable pattern from jsx.ts

/**
 * Reference to an agent's output from useOutput
 * @typeParam T - The agent's TOutput type (compile-time only)
 */
export interface OutputRef<T = unknown> {
  /** Agent name this output is bound to */
  agent: string;
  /** Field accessor - returns placeholder for interpolation */
  field: <K extends keyof T>(key: K) => string;
  /** Phantom type marker (compile-time only) */
  _type?: T;
}

/**
 * Bind to a spawned agent's output for status-based handling
 *
 * @typeParam T - The agent's TOutput type (must extend BaseOutput)
 * @param agentName - Agent name matching SpawnAgent's agent prop
 * @returns OutputRef for use in OnStatus and field interpolation
 *
 * @example
 * import type { ResearcherOutput } from './researcher.agent.js';
 *
 * const output = useOutput<ResearcherOutput>("researcher");
 *
 * // In JSX:
 * <OnStatus output={output} status="SUCCESS">
 *   <p>Research complete with {output.field('confidence')} confidence.</p>
 * </OnStatus>
 */
export function useOutput<T extends BaseOutput = BaseOutput>(
  agentName: string
): OutputRef<T> {
  return {
    agent: agentName,
    field: (key) => `{output.${String(key)}}`,
  };
}
```

### Pattern 2: OnStatus Component
**What:** Conditional block that renders based on agent return status
**When to use:** After SpawnAgent to handle different outcome scenarios
**Example:**
```typescript
// Source: Follows If/Else pattern from jsx.ts

/**
 * Props for the OnStatus component
 */
export interface OnStatusProps {
  /** Output reference from useOutput */
  output: OutputRef;
  /** Status value to match (SUCCESS, BLOCKED, etc.) */
  status: AgentStatus;
  /** Block content for this status */
  children?: ReactNode;
}

/**
 * OnStatus component - conditional block for agent status handling
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime. Emits as **On {status}:** pattern.
 *
 * @example
 * const output = useOutput<ResearcherOutput>("researcher");
 *
 * <OnStatus output={output} status="SUCCESS">
 *   <p>Research complete.</p>
 *   <p>Confidence: {output.field('confidence')}</p>
 * </OnStatus>
 * <OnStatus output={output} status="BLOCKED">
 *   <p>Research blocked by: {output.field('blockedBy')}</p>
 * </OnStatus>
 */
export function OnStatus(_props: OnStatusProps): null {
  return null;
}
```

### Pattern 3: IR Node Structure
**What:** OnStatusNode in the IR discriminated union
**When to use:** Transformer produces OnStatusNode, emitter consumes it
**Example:**
```typescript
// Source: Follows IfNode/ElseNode pattern from ir/nodes.ts

/**
 * Reference to an output in the IR
 */
export interface OutputReference {
  kind: 'outputReference';
  agent: string;  // Agent name this output refers to
}

/**
 * OnStatus block - conditional based on agent return status
 * Emits as **On {status}:** prose pattern
 */
export interface OnStatusNode {
  kind: 'onStatus';
  /** Output reference from useOutput */
  outputRef: OutputReference;
  /** Status to match (SUCCESS, BLOCKED, etc.) */
  status: 'SUCCESS' | 'BLOCKED' | 'NOT_FOUND' | 'ERROR' | 'CHECKPOINT';
  /** Block content for this status */
  children: BlockNode[];
}

// Update BlockNode union:
export type BlockNode =
  | HeadingNode
  | ParagraphNode
  | ListNode
  | CodeBlockNode
  | BlockquoteNode
  | ThematicBreakNode
  | XmlBlockNode
  | RawMarkdownNode
  | SpawnAgentNode
  | AssignNode
  | IfNode
  | ElseNode
  | OnStatusNode;  // NEW
```

### Pattern 4: Emitter Output Format
**What:** Prose-based status conditional matching GSD patterns
**When to use:** OnStatusNode emission
**Example:**
```markdown
**On SUCCESS:**

Research complete with HIGH confidence.

Findings:
- Finding 1
- Finding 2

**On BLOCKED:**

Research blocked by: Missing access to internal docs

Options:
1. Request access
2. Use alternative sources

**On ERROR:**

An error occurred during research. Check the error details above.
```

### Pattern 5: Field Interpolation in Children
**What:** `{output.field}` syntax for accessing output properties
**When to use:** Within OnStatus children to display output data
**Example:**
```tsx
// In TSX:
<OnStatus output={researchOutput} status="SUCCESS">
  <p>Confidence: {researchOutput.field('confidence')}</p>
  <p>File created: {researchOutput.field('filePath')}</p>
</OnStatus>

// Emitted markdown:
**On SUCCESS:**

Confidence: {output.confidence}

File created: {output.filePath}
```

The `{output.field}` placeholders are preserved in markdown for Claude to interpolate at runtime based on the actual agent return value.

### Anti-Patterns to Avoid
- **Runtime type checking:** This is compile-time only. Don't add runtime guards.
- **Validating field existence:** TypeScript generics handle this at compile time.
- **Mixing If/Else with OnStatus:** Use If/Else for shell conditions, OnStatus for agent status.
- **Nested OnStatus:** Don't nest OnStatus blocks - they're sequential for same agent.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Output ref tracking | Custom registry | Follow useVariable pattern | Transformer already tracks variables |
| Status validation | Runtime checks | AgentStatus type union | TypeScript validates at compile time |
| Field accessor | String concatenation | Typed field() method | Type-safe access to output properties |
| Children with placeholders | Custom interpolation | Preserve `{output.x}` syntax | Claude handles at runtime |

**Key insight:** The useVariable and If/Else patterns provide complete templates. Phase 15 is adaptation, not invention.

## Common Pitfalls

### Pitfall 1: Output Ref Not Bound to SpawnAgent
**What goes wrong:** useOutput created but no matching SpawnAgent in the command
**Why it happens:** No validation that agent name matches a SpawnAgent
**How to avoid:** Transformer should warn (not error) if output ref doesn't match a SpawnAgent
**Warning signs:** OnStatus blocks have no effect because agent was never spawned

### Pitfall 2: Field Access on Unknown Fields
**What goes wrong:** `output.field('foo')` where 'foo' isn't in the interface
**Why it happens:** TypeScript can't validate string key at compile time if using `as const`
**How to avoid:** Use generic constraint `K extends keyof T` on field method
**Warning signs:** Runtime errors when Claude tries to access non-existent field

### Pitfall 3: Multiple Agents with Same Name
**What goes wrong:** Two SpawnAgents with same agent prop confuse output binding
**Why it happens:** Commands can spawn multiple agents
**How to avoid:** useOutput binds to first SpawnAgent with matching name; document this behavior
**Warning signs:** Wrong output data displayed in OnStatus blocks

### Pitfall 4: OnStatus Without Prior SpawnAgent
**What goes wrong:** OnStatus appears before any SpawnAgent in document order
**Why it happens:** Developer places OnStatus incorrectly
**How to avoid:** Transformer should validate OnStatus appears after SpawnAgent with matching agent
**Warning signs:** OnStatus blocks emitted but no agent to provide output

### Pitfall 5: Status Typos
**What goes wrong:** status="SUCESS" (typo) doesn't match any status
**Why it happens:** String literal typos
**How to avoid:** AgentStatus type union catches this at compile time
**Warning signs:** TypeScript error on invalid status value

## Code Examples

Verified patterns from existing codebase:

### useVariable Pattern (to follow)
```typescript
// Source: src/jsx.ts lines 252-258
export function useVariable<T = string>(
  name: string,
  _assignment: Assignment<T>
): VariableRef<T> {
  return { name, ref: name };
}
```

### If/Else Transformer Pattern (to follow)
```typescript
// Source: src/parser/transformer.ts lines 1195-1216
private transformIf(node: JsxElement | JsxSelfClosingElement): IfNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract test prop (required)
  const test = getAttributeValue(openingElement, 'test');
  if (!test) {
    throw this.createError('If requires test prop', openingElement);
  }

  // Transform children as "then" block using helper
  const children = Node.isJsxElement(node)
    ? this.transformBlockChildren(node.getJsxChildren())
    : [];

  return {
    kind: 'if',
    test,
    children,
  };
}
```

### If Emitter Pattern (to follow)
```typescript
// Source: src/emitter/emitter.ts lines 461-473
private emitIf(node: IfNode): string {
  const parts: string[] = [];

  // Emit condition header
  parts.push(`**If ${node.test}:**`);

  // Emit "then" block content with blank line after header
  for (const child of node.children) {
    parts.push(this.emitBlock(child));
  }

  return parts.join('\n\n');
}
```

### Complete Usage Example
```tsx
// Source: Pattern for Phase 15 implementation

import { Command, XmlBlock, SpawnAgent, Assign, useVariable, useOutput, OnStatus } from '../jsx.js';
import type { ResearcherInput, ResearcherOutput } from './researcher.agent.js';

const phaseNumber = useVariable("PHASE", { bash: `echo "$1"` });
const researchOutput = useOutput<ResearcherOutput>("gsd-researcher");

export default function PlanPhaseCommand() {
  return (
    <Command name="plan-phase" description="Plan a phase with research">
      <XmlBlock name="process">
        <h2>Step 1: Gather Context</h2>
        <Assign var={phaseNumber} />

        <h2>Step 2: Research Phase</h2>
        <SpawnAgent<ResearcherInput>
          agent="gsd-researcher"
          model="opus"
          description="Research phase {phase}"
          input={{ phase: phaseNumber, description: "Research the phase" }}
        />

        <h2>Step 3: Handle Research Result</h2>

        <OnStatus output={researchOutput} status="SUCCESS">
          <p>Research complete with {researchOutput.field('confidence')} confidence.</p>
          <p>Key findings documented in RESEARCH.md.</p>
          <p>Proceeding to planning phase.</p>
        </OnStatus>

        <OnStatus output={researchOutput} status="BLOCKED">
          <p>Research blocked by: {researchOutput.field('blockedBy')}</p>
          <p>Cannot proceed until blocker is resolved.</p>
        </OnStatus>

        <OnStatus output={researchOutput} status="ERROR">
          <p>Research failed. Check error details above.</p>
        </OnStatus>
      </XmlBlock>
    </Command>
  );
}
```

### Expected Output Format
```markdown
---
name: plan-phase
description: Plan a phase with research
---

<process>
## Step 1: Gather Context

```bash
PHASE=$(echo "$1")
```

## Step 2: Research Phase

Task(
  prompt="<phase>\n{phase}\n</phase>\n\n<description>\nResearch the phase\n</description>",
  subagent_type="gsd-researcher",
  model="opus",
  description="Research phase {phase}"
)

## Step 3: Handle Research Result

**On SUCCESS:**

Research complete with {output.confidence} confidence.

Key findings documented in RESEARCH.md.

Proceeding to planning phase.

**On BLOCKED:**

Research blocked by: {output.blockedBy}

Cannot proceed until blocker is resolved.

**On ERROR:**

Research failed. Check error details above.

</process>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual status checking | OnStatus components | Phase 15 | Type-safe, declarative status handling |
| Prose conditionals | If/Else + OnStatus | Phase 13/15 | Separation: shell vs agent status |
| Unstructured output handling | Typed output refs | Phase 15 | Compile-time field validation |

**Deprecated/outdated:**
- Manual prose-based status blocks (still functional, but OnStatus preferred)

## Open Questions

1. **Multiple agents with same name?**
   - What we know: useOutput binds by agent name string
   - What's unclear: Behavior when same agent spawned twice
   - Recommendation: Bind to first matching SpawnAgent; document limitation

2. **OnStatus ordering?**
   - What we know: Multiple OnStatus blocks for same agent are sequential
   - What's unclear: Whether order matters or Claude handles all statuses
   - Recommendation: Order doesn't matter for emit; Claude checks status at runtime

3. **Default/fallback status?**
   - What we know: Can have OnStatus for each known status
   - What's unclear: Whether to add OnStatusDefault or rely on explicit handling
   - Recommendation: Defer OnStatusDefault to future phase; explicit statuses sufficient for v1

4. **Field interpolation in nested blocks?**
   - What we know: `{output.field}` works in paragraph text
   - What's unclear: Behavior in code blocks, list items, etc.
   - Recommendation: Allow anywhere text content is emitted; Claude handles interpolation

## Sources

### Primary (HIGH confidence)
- `/Users/glenninizan/workspace/react-agentic/src/jsx.ts` - useVariable, VariableRef, If/Else patterns
- `/Users/glenninizan/workspace/react-agentic/src/ir/nodes.ts` - IfNode, ElseNode, discriminated union pattern
- `/Users/glenninizan/workspace/react-agentic/src/parser/transformer.ts` - transformIf, transformElse, variable tracking
- `/Users/glenninizan/workspace/react-agentic/src/emitter/emitter.ts` - emitIf, emitElse patterns
- `/Users/glenninizan/workspace/react-agentic/.planning/phases/14-agent-output-schema/14-RESEARCH.md` - AgentStatus, BaseOutput, TOutput
- `/Users/glenninizan/workspace/react-agentic/.planning/phases/13-conditional-logic/13-RESEARCH.md` - If/Else implementation details

### Secondary (MEDIUM confidence)
- `/Users/glenninizan/workspace/react-agentic/docs/communication.md` - SpawnAgent patterns
- `/Users/glenninizan/workspace/react-agentic/docs/variables.md` - useVariable/Assign documentation
- `/Users/glenninizan/workspace/react-agentic/.claude/agents/gsd/gsd-phase-researcher.md` - Real GSD structured_returns format

### Tertiary (LOW confidence)
- None - this research is based entirely on codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, uses existing patterns
- Architecture: HIGH - Direct extension of useVariable/If patterns
- Pitfalls: HIGH - Based on analysis of similar feature implementations
- Output format: HIGH - Follows established GSD prose patterns

**Research date:** 2026-01-22
**Valid until:** Indefinite (internal codebase patterns, not external libraries)
