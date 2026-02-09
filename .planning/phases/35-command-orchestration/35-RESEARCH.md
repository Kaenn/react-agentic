# Phase 35: Command Orchestration Components - Research

**Researched:** 2026-02-01
**Domain:** TypeScript compiler extensions, IR design, component architecture
**Confidence:** HIGH

## Summary

Phase 35 was originally scoped for six command orchestration components (Uses, Init, ValidateEnvironment, ParseArguments, HandleReturn/Match) but discussion in CONTEXT.md revealed most are unnecessary. The actual requirement is a single component: `<OnStatusDefault>` for catch-all agent return status handling.

OnStatusDefault follows the established sibling component pattern seen in If/Else, providing a fallback when no specific OnStatus matches. The key technical decision is whether to implement this as a primitive or composite component. Research into the v3.0 primitive/composite architecture shows that OnStatusDefault should be a **primitive** because:

1. It requires special transformer logic for sibling detection (must follow OnStatus blocks)
2. It needs IR representation for proper emission sequencing
3. Composites can't implement sibling-pairing semantics reliably

**Primary recommendation:** Implement OnStatusDefault as a primitive component with sibling-aware transformer logic, following the If/Else pattern from src/parser/transformers/runtime-utils.ts processIfElseSiblings().

## Standard Stack

The phase uses react-agentic's existing stack - no external libraries needed.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-morph | 27.0.2 | TypeScript AST parsing | Already used throughout parser/, provides JSX sibling detection |
| TypeScript | 5.9.3 | Compile-time validation | Core to react-agentic's value proposition |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.0.17 | Unit testing | Test OnStatus/OnStatusDefault pairing logic |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Primitive OnStatusDefault | Composite wrapping OnStatus | Composites can't access siblings - requires primitive for pairing detection |
| Special status="*" prop | OnStatusDefault component | Separate component is more explicit and follows Else pattern |

## Architecture Patterns

### Recommended Project Structure

OnStatusDefault follows the same file structure as OnStatus:

```
src/
├── workflow/agents/
│   ├── Agent.ts          # Add OnStatusDefault component stub
│   └── index.ts          # Export OnStatusDefault
├── parser/transformers/
│   ├── control.ts        # Add transformOnStatusDefault()
│   └── dispatch.ts       # Register OnStatusDefault in switch
├── ir/
│   └── nodes.ts          # Add OnStatusDefaultNode interface
├── emitter/
│   └── emitter.ts        # Add emitOnStatusDefault()
└── components/
    └── Agent.ts          # Duplicate OnStatusDefault export for top-level
```

### Pattern 1: Sibling Detection

OnStatusDefault must follow OnStatus blocks. Use processIfElseSiblings pattern:

**What:** Helper function for sibling lookahead during transformation
**When to use:** When component semantics depend on adjacent JSX elements
**Example:**

```typescript
// Source: src/parser/transformers/runtime-utils.ts:705-745
export function processIfElseSiblings(
  jsxChildren: Node[],
  currentIndex: number,
  onElseFound: (elseNode: JsxElement | JsxSelfClosingElement) => void
): IfElseSiblingResult {
  // Look ahead to next non-whitespace sibling
  for (let j = currentIndex + 1; j < jsxChildren.length; j++) {
    const sibling = jsxChildren[j];

    // Skip whitespace/text
    if (Node.isJsxText(sibling)) {
      if (sibling.getText().trim() === '') continue;
      else break; // Non-empty text = no Else
    }

    // Check if sibling is Else
    if (Node.isJsxElement(sibling) || Node.isJsxSelfClosingElement(sibling)) {
      const siblingName = getElementName(sibling);
      if (siblingName === 'Else' || siblingName === 'V3Else') {
        onElseFound(sibling);
        return { foundSibling: true, skipIndex: j };
      } else {
        break; // Different component = no Else
      }
    }
  }

  return { foundSibling: false };
}
```

Adapt this pattern for OnStatus/OnStatusDefault pairing.

### Pattern 2: IR Node Structure

OnStatusDefault needs its own IR node kind to distinguish from regular OnStatus:

```typescript
// src/ir/nodes.ts additions
export interface OnStatusDefaultNode {
  kind: 'onStatusDefault';
  /** Output reference from useOutput (inherited from preceding OnStatus) */
  outputRef: OutputReference;
  /** Block content for default case */
  children: BaseBlockNode[];
}

// Add to BaseBlockNode union
export type BaseBlockNode =
  | /* existing types */
  | OnStatusNode
  | OnStatusDefaultNode;
```

**Why separate node:** Emitter needs to distinguish between specific status match and default case for output format.

**Source:** Pattern from OnStatusNode (src/ir/nodes.ts:267-275)

### Pattern 3: Transformer Logic

Transform OnStatusDefault with validation that it follows OnStatus:

```typescript
// src/parser/transformers/control.ts addition
export function transformOnStatusDefault(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext,
  outputRef?: OutputReference
): OnStatusDefaultNode {
  // OnStatusDefault must provide outputRef OR follow OnStatus
  if (!outputRef) {
    throw ctx.createError(
      'OnStatusDefault must follow OnStatus blocks or provide output prop',
      node
    );
  }

  // Transform children as block content
  const children = Node.isJsxElement(node)
    ? transformBlockChildren(node.getJsxChildren(), ctx)
    : [];

  return {
    kind: 'onStatusDefault',
    outputRef,
    children: children as BaseBlockNode[],
  };
}
```

Dispatcher handles lookahead:

```typescript
// src/parser/transformers/dispatch.ts addition
case 'OnStatus': {
  const onStatusNode = transformOnStatus(child, ctx);
  blockNodes.push(onStatusNode);

  // Check for OnStatusDefault sibling
  const result = processOnStatusDefaultSibling(jsxChildren, i, (defaultNode) => {
    const onStatusDefaultNode = transformOnStatusDefault(
      defaultNode,
      ctx,
      onStatusNode.outputRef  // Pass output ref from OnStatus
    );
    blockNodes.push(onStatusDefaultNode);
  });

  if (result.foundSibling) {
    i = result.skipIndex; // Skip processed sibling
  }
  continue;
}

case 'OnStatusDefault':
  // Standalone OnStatusDefault is error (must follow OnStatus)
  throw ctx.createError('<OnStatusDefault> must follow <OnStatus> as sibling', child);
```

**Source:** Pattern from If/Else handling (src/parser/transformers/dispatch.ts:390-410)

### Pattern 4: Emission Strategy

OnStatusDefault emits with "**On any other status:**" header:

```typescript
// src/emitter/emitter.ts addition
private emitOnStatusDefault(node: OnStatusDefaultNode): string {
  const parts: string[] = [];

  // Emit default status header
  parts.push('**On any other status:**');

  // Emit block content with blank line after header
  for (const child of node.children) {
    parts.push(this.emitBlock(child));
  }

  return parts.join('\n\n');
}
```

**Output example:**

```markdown
**On SUCCESS:**

Build completed. Artifacts at {output.artifactPath}.

**On BLOCKED:**

Build blocked: {output.blockedBy}

**On any other status:**

Unexpected status. Check agent logs for details.
```

**Source:** Pattern from emitOnStatus (src/emitter/emitter.ts:672-684)

### Anti-Patterns to Avoid

- **Don't implement as composite** - Composites can't detect siblings; requires primitive for proper pairing
- **Don't use special status prop** - Separate component is more explicit and matches If/Else pattern
- **Don't validate exhaustiveness** - OnStatusDefault is opt-in; commands should still handle specific statuses explicitly
- **Don't require children** - OnStatusDefault with no children is valid (e.g., "do nothing on other statuses")

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSX sibling detection | Manual index tracking with whitespace handling | processIfElseSiblings() helper | Handles edge cases (whitespace, comments, multiple siblings) |
| Component ordering validation | Custom validation logic | Existing pattern from If/Else transformer | Battle-tested, handles all edge cases |
| Error messages | String concatenation | ctx.createError() with node reference | Provides file/line context automatically |

**Key insight:** Sibling detection has subtle edge cases (JSXText whitespace, fragments, comments) that processIfElseSiblings already handles.

## Common Pitfalls

### Pitfall 1: OnStatusDefault Without Output Context

**What goes wrong:** OnStatusDefault used without preceding OnStatus blocks fails at runtime
**Why it happens:** outputRef is not available - transformer doesn't know which agent this default applies to
**How to avoid:**
- Validate in transformer that OnStatusDefault follows at least one OnStatus
- Alternative: Allow OnStatusDefault with explicit output prop (like OnStatus)
- Error clearly: "OnStatusDefault must follow OnStatus or provide output={...} prop"
**Warning signs:** IR contains OnStatusDefaultNode with undefined/null outputRef

### Pitfall 2: Multiple OnStatusDefault for Same Agent

**What goes wrong:** Multiple OnStatusDefault blocks for the same output lead to ambiguous behavior
**Why it happens:** No validation that OnStatusDefault appears only once per agent output
**How to avoid:**
- Track processed OnStatusDefault per outputRef during transformation
- Throw error if multiple OnStatusDefault blocks reference same agent
- Consider: Should OnStatusDefault be global (catches ALL agents) or scoped to preceding OnStatus?
**Warning signs:** Markdown has multiple "On any other status:" sections for same agent

### Pitfall 3: OnStatusDefault Before OnStatus

**What goes wrong:** OnStatusDefault appears before any OnStatus blocks, leading to unclear semantics
**Why it happens:** User expects OnStatusDefault to catch all statuses even without explicit OnStatus
**How to avoid:**
- **Decision required:** Should standalone OnStatusDefault with output prop be valid?
- If yes: OnStatusDefault can appear anywhere, must have output prop
- If no: OnStatusDefault must follow OnStatus, inherits outputRef
- Document clearly in API docs
**Warning signs:** User confusion about where OnStatusDefault can appear

### Pitfall 4: Sibling Detection Across Fragments

**What goes wrong:** OnStatusDefault after fragment boundary is not detected as sibling
**Why it happens:** JSX fragments create nesting that breaks simple sibling detection
**How to avoid:**
- Use existing processIfElseSiblings which handles fragments correctly
- Test edge case: `<OnStatus>...</OnStatus><>{/* comment */}<OnStatusDefault /></>`
- Consider flattening fragments before sibling detection
**Warning signs:** Valid OnStatusDefault pairing throws "must follow OnStatus" error

## Code Examples

Verified patterns from codebase analysis:

### TSX Component Definition

```typescript
// src/workflow/agents/Agent.ts addition
export interface OnStatusDefaultProps {
  /** Optional output reference (inherited from preceding OnStatus if not provided) */
  output?: { agent: string };
  /** Block content for default status handling */
  children?: ReactNode;
}

/**
 * OnStatusDefault component - catch-all for unhandled agent statuses
 *
 * This is a compile-time component transformed by react-agentic.
 * Must follow OnStatus blocks or provide explicit output prop.
 *
 * @example
 * const buildOutput = useOutput<BuildOutput>("build-agent");
 *
 * <OnStatus output={buildOutput} status="SUCCESS">
 *   <p>Build succeeded</p>
 * </OnStatus>
 * <OnStatus output={buildOutput} status="FAILED">
 *   <p>Build failed</p>
 * </OnStatus>
 * <OnStatusDefault>
 *   <p>Unexpected build status</p>
 * </OnStatusDefault>
 */
export function OnStatusDefault(_props: OnStatusDefaultProps): null {
  return null;
}
```

### Complete Usage Example

```tsx
import { Command, SpawnAgent, useOutput, OnStatus, OnStatusDefault } from 'react-agentic';
import type { BuildOutput } from './build-agent.js';

export default function BuildCommand() {
  const buildOutput = useOutput<BuildOutput>("build-agent");

  return (
    <Command name="build" description="Build with status handling">
      <h2>1. Spawn Build Agent</h2>

      <SpawnAgent
        agent="build-agent"
        model="haiku"
        description="Build application"
        input={{ environment: "production" }}
      />

      <h2>2. Handle Result</h2>

      <OnStatus output={buildOutput} status="SUCCESS">
        <p>Build succeeded. Artifacts at {buildOutput.field('artifactPath')}.</p>
      </OnStatus>

      <OnStatus output={buildOutput} status="FAILED">
        <p>Build failed. Check logs at {buildOutput.field('logPath')}</p>
      </OnStatus>

      <OnStatus output={buildOutput} status="BLOCKED">
        <p>Build blocked: {buildOutput.field('blockedBy')}</p>
      </OnStatus>

      <OnStatusDefault>
        <p>Unexpected status from build agent. Please investigate.</p>
      </OnStatusDefault>
    </Command>
  );
}
```

### Test Pattern

```typescript
// tests/grammar/SemanticComponents/on-status-default.test.ts
import { describe, it, expect } from 'vitest';
import { transformCommandContent } from '../_helpers/test-utils.js';

describe('<OnStatusDefault>', () => {
  describe('sibling pairing', () => {
    it('accepts OnStatusDefault after OnStatus', () => {
      const tsx = `
        const out = useOutput("agent");
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <OnStatus output={out} status="SUCCESS">
                <p>Success</p>
              </OnStatus>
              <OnStatusDefault>
                <p>Other status</p>
              </OnStatusDefault>
            </Command>
          );
        }
      `;
      expect(() => transformCommandContent(tsx, true)).not.toThrow();
    });

    it('rejects standalone OnStatusDefault without output', () => {
      const tsx = `
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <OnStatusDefault>
                <p>Default</p>
              </OnStatusDefault>
            </Command>
          );
        }
      `;
      expect(() => transformCommandContent(tsx, true)).toThrow(
        'OnStatusDefault must follow OnStatus'
      );
    });

    it('accepts standalone OnStatusDefault with explicit output prop', () => {
      const tsx = `
        const out = useOutput("agent");
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <OnStatusDefault output={out}>
                <p>Default</p>
              </OnStatusDefault>
            </Command>
          );
        }
      `;
      expect(() => transformCommandContent(tsx, true)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits "On any other status:" header', () => {
      const tsx = `
        const out = useOutput("agent");
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <OnStatus output={out} status="SUCCESS">
                <p>Success</p>
              </OnStatus>
              <OnStatusDefault>
                <p>Fallback</p>
              </OnStatusDefault>
            </Command>
          );
        }
      `;
      const output = transformCommandContent(tsx, true);
      expect(output).toContain('On any other status:');
      expect(output).toContain('Fallback');
    });

    it('handles empty OnStatusDefault', () => {
      const tsx = `
        const out = useOutput("agent");
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <OnStatus output={out} status="SUCCESS">
                <p>Success</p>
              </OnStatus>
              <OnStatusDefault />
            </Command>
          );
        }
      `;
      const output = transformCommandContent(tsx, true);
      expect(output).toContain('On any other status:');
    });
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual status handling prose | OnStatus component with typed output | v1.4 (2026-01-22) | Type-safe agent output handling |
| Handle all statuses manually | OnStatusDefault catch-all | Phase 35 (v3.1) | Simplified error handling for unexpected statuses |

**Deprecated/outdated:**
- None - this is an enhancement to existing OnStatus feature

## Open Questions

Things that couldn't be fully resolved:

1. **Output Prop Optionality**
   - What we know: OnStatusDefault can inherit outputRef from preceding OnStatus
   - What's unclear: Should standalone OnStatusDefault with explicit output prop be supported?
   - Recommendation: Support both patterns - inherit from sibling OR explicit prop. Validate at least one is provided.

2. **Multiple OnStatusDefault Scope**
   - What we know: Commands may spawn multiple agents
   - What's unclear: Should OnStatusDefault apply to all agents or only the one from preceding OnStatus?
   - Recommendation: OnStatusDefault applies ONLY to agent from preceding OnStatus or explicit output prop. Multiple OnStatusDefault blocks allowed for different agents.

3. **Children Optionality**
   - What we know: OnStatus requires children for meaningful content
   - What's unclear: Should OnStatusDefault allow empty children (no-op on other statuses)?
   - Recommendation: Allow empty children - valid use case for "ignore other statuses"

4. **Validation Timing**
   - What we know: Sibling detection happens during transformation
   - What's unclear: Should we warn if OnStatusDefault appears but all statuses are already handled?
   - Recommendation: No validation - OnStatusDefault is defensive programming, not required

## Sources

### Primary (HIGH confidence)

- react-agentic codebase analysis - existing OnStatus implementation (src/parser/transformers/control.ts:102-167)
- processIfElseSiblings pattern (src/parser/transformers/runtime-utils.ts:705-745)
- If/Else transformer logic (src/parser/transformers/dispatch.ts:390-410)
- OnStatus emission pattern (src/emitter/emitter.ts:672-684)
- Phase 35 CONTEXT.md - user decisions and scope reduction
- v3.0 primitive/composite architecture decisions (PROJECT.md)

### Secondary (MEDIUM confidence)

- docs/control-flow.md - If/Else documentation pattern to apply to OnStatus/OnStatusDefault
- docs/communication.md - OnStatus usage examples and best practices

### Tertiary (LOW confidence)

- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using only existing dependencies
- Architecture: HIGH - Following established If/Else sibling pattern
- Pitfalls: MEDIUM - Some are inferred from similar sibling logic, need validation during implementation

**Research date:** 2026-02-01
**Valid until:** 2026-03-03 (30 days - stable domain, react-agentic architecture unlikely to change)
