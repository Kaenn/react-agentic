# Phase 31: Content Validation - Research

**Researched:** 2026-01-31
**Domain:** TypeScript compile-time validation for JSX children constraints
**Confidence:** HIGH

## Summary

Phase 31 implements compile-time TypeScript errors for invalid content nesting in react-agentic. This phase leverages Phase 28's content types (CommandContent, AgentContent, SubComponentContent) as the enforcement mechanism, ensuring users get immediate feedback when attempting to place components in forbidden contexts (e.g., SpawnAgent inside a SubComponent).

The research reveals that TypeScript's existing discriminated union system, combined with explicit children prop typing, provides robust compile-time validation without any custom tooling. Phase 28 already established the Extract-based SubComponentContent pattern that excludes 10 command-level features. The key insight is that TypeScript's native type checking automatically enforces these constraints when users type their component's children prop - no additional validation logic is needed.

**Primary recommendation:** Use TypeScript's native type system for validation. Enhance error messages through strategic JSDoc documentation, @deprecated annotations for severe violations, and clear type names. IDE autocomplete will naturally filter invalid components through TypeScript's language server integration.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 | Compile-time type checking and validation | Already in use, provides discriminated unions, type narrowing, JSDoc support, and @deprecated annotations |

### Supporting

No additional libraries required - this is pure TypeScript type constraint work building on Phase 28's foundation.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native TypeScript errors | Custom error messages | TypeScript doesn't support custom compiler error messages (feature request declined) |
| @deprecated annotations | Hard type errors for all violations | TypeScript has no true "warning" concept - @deprecated is visual-only in IDE, doesn't prevent compilation |
| Children prop typing | React.FC with children restrictions | React.FC automatically intersects with `{ children?: ReactNode }`, overriding restrictions |

**Installation:**

No new dependencies required - TypeScript 5.9.3 is already in package.json.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── ir/
│   ├── content-types.ts      # Phase 28: Content type definitions (already exists)
│   └── index.ts              # Phase 28: Exports content types (already exists)
├── components/
│   ├── Command.ts            # Update CommandProps children type
│   ├── Agent.ts              # Update AgentProps children type
│   └── *.ts                  # Other components (no changes needed)
└── index.ts                  # Already exports content types from ir/
```

### Pattern 1: Explicit Children Typing in User Components

**What:** Users type their component's children prop with SubComponentContent to get compile-time validation
**When to use:** All custom reusable components that wrap content
**Example:**

```typescript
// Source: Phase 28 implementation + TypeScript JSX handbook
// From: https://www.typescriptlang.org/docs/handbook/jsx

import type { SubComponentContent } from 'react-agentic';
import type { ReactNode } from 'react';

// User's custom component with constrained children
interface CardProps {
  title: string;
  children?: SubComponentContent | SubComponentContent[];
}

export function Card({ title, children }: CardProps): ReactNode {
  return (
    <XmlBlock name="card">
      <h2>{title}</h2>
      {children}
    </XmlBlock>
  );
}

// TypeScript validates this at compile time:

// ✓ VALID - Table is in SubComponentContent
<Card title="Overview">
  <Table headers={["A"]} rows={[["1"]]} />
</Card>

// ✗ COMPILE ERROR - SpawnAgent is excluded from SubComponentContent
<Card title="Invalid">
  <SpawnAgent agent="test" model="sonnet" description="Test" />
  {/* ERROR: Type 'SpawnAgentNode' is not assignable to type 'SubComponentContent' */}
</Card>
```

### Pattern 2: Enhanced Error Messages with JSDoc

**What:** Add JSDoc documentation to content types to provide context in IDE hover tooltips
**When to use:** On all exported content type definitions to guide users
**Example:**

```typescript
// Source: TypeScript JSDoc documentation
// From: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types

/**
 * SubComponentContent - Restricted subset for nested components
 *
 * Only allows document-level primitives (headings, paragraphs, tables, etc.).
 *
 * **Excluded from SubComponentContent:**
 * - SpawnAgent (document-level only)
 * - Control flow (If/Else, Loop/Break, Return - document-level only)
 * - Runtime features (useRuntimeVar, runtimeFn - document-level only)
 * - User interaction (AskUser - document-level only)
 * - OnStatus (document-level only)
 *
 * Type your children prop as SubComponentContent to prevent nesting these features.
 */
export type SubComponentContent = Extract<
  BaseBlockNode,
  | { kind: 'heading' }
  | { kind: 'paragraph' }
  // ... rest of allowed kinds
>;
```

### Pattern 3: @deprecated Annotation for Severe Violations

**What:** Mark components with @deprecated JSDoc when used in invalid contexts (optional, for enhanced DX)
**When to use:** Only if we add context-aware component exports (e.g., SpawnAgent has variants)
**Example:**

```typescript
// Source: TypeScript @deprecated support
// From: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0

// NOTE: This pattern is only viable if we create context-specific component exports
// The standard approach is simpler - just type children props and let TypeScript validate

/**
 * SpawnAgent component - spawns an agent from a command
 *
 * @deprecated Use SpawnAgent only at command/agent document level, not inside SubComponents
 */
export function SpawnAgentInSubComponent(_props: SpawnAgentProps): null {
  return null;
}
```

**Note:** This pattern has limited value since we export components unconditionally. The primary validation happens through children prop typing.

### Pattern 4: Command and Agent Document-Level Children Typing

**What:** Type Command and Agent children props to allow full content
**When to use:** Update CommandProps and AgentProps to formalize their content contracts
**Example:**

```typescript
// Source: Existing CommandProps pattern + Phase 28 content types

import type { CommandContent } from '../ir/content-types.js';
import type { ReactNode } from 'react';

export interface CommandProps {
  name: string;
  description: string;
  // ... other props
  /**
   * Command body content - either regular JSX or render props function
   *
   * Commands allow all primitives including SpawnAgent, control flow,
   * runtime features, and user interaction.
   */
  children?: CommandContent | CommandContent[] | ((ctx: CommandContext) => ReactNode);
}
```

### Anti-Patterns to Avoid

- **Runtime validation during compilation:** Don't add checks in the transformer - TypeScript handles this at the source level
- **Custom error message generation:** TypeScript doesn't support this - focus on clear type names and JSDoc instead
- **React.FC for content constraints:** React.FC intersects with ReactNode, overriding restrictions - use regular functions
- **Overly complex type guards:** Keep validation simple - discriminated unions with Extract is sufficient
- **@ts-expect-error in production code:** Only use in test files to validate that type errors occur as expected

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type validation | Custom AST walker checking node.kind | TypeScript type system with Extract pattern | Compile-time validation is free, catches errors before build |
| Error messages | Custom error formatter | JSDoc annotations + clear type names | TypeScript displays JSDoc in IDE tooltips automatically |
| IDE autocomplete filtering | Custom language server plugin | Native TypeScript language server | TypeScript LSP already filters based on type constraints |
| Warning system | Custom diagnostic emitter | @deprecated annotations (visual only) | TypeScript has no true warning concept that allows compilation |

**Key insight:** Phase 28 did the heavy lifting by establishing the Extract-based content type pattern. Phase 31 is primarily about documentation, type annotations, and test coverage - not new validation logic.

## Common Pitfalls

### Pitfall 1: Expecting Custom Error Messages

**What goes wrong:** Planning to generate custom error text like "SpawnAgent cannot be used inside SubComponents because..."
**Why it happens:** Misunderstanding TypeScript's capabilities - custom compiler error messages are not supported
**How to avoid:** Accept that error messages will be generic ("Type X is not assignable to type Y") and compensate with excellent JSDoc documentation
**Warning signs:** Tasks involving error message formatting, custom diagnostic output, or error message templates

### Pitfall 2: Treating @deprecated as Compile-Time Errors

**What goes wrong:** Expecting @deprecated annotations to block compilation
**Why it happens:** Confusing IDE visual warnings (strikethrough) with compiler errors
**How to avoid:** Understand that @deprecated is purely informational - code still compiles, IDE just shows strikethrough
**Warning signs:** Plans requiring "hard errors for SpawnAgent, warnings for others" - TypeScript only has errors or nothing

### Pitfall 3: Implementing "Tiered Severity"

**What goes wrong:** Attempting to create SpawnAgent as hard error, control flow as warnings
**Why it happens:** Context mentions "tiered severity" but TypeScript doesn't support this
**How to avoid:** All type violations are errors. Use clear JSDoc to indicate severity through documentation, not enforcement levels
**Warning signs:** Mention of warning/error tiers, severity levels, or different enforcement mechanisms

### Pitfall 4: Over-Engineering IDE Autocomplete

**What goes wrong:** Planning custom language server extensions or autocomplete filters
**Why it happens:** Assumption that special tooling is needed for context-aware suggestions
**How to avoid:** Trust TypeScript's language server - it automatically filters suggestions based on type constraints
**Warning signs:** Tasks involving "autocomplete filter implementation" or "custom LSP integration"

### Pitfall 5: Adding Runtime Validation

**What goes wrong:** Adding checks during TSX transformation to validate content types
**Why it happens:** Distrust of TypeScript's compile-time enforcement
**How to avoid:** If TypeScript compilation succeeds, the code is valid - no runtime checks needed
**Warning signs:** Transformer tasks that check `node.kind` against allowed lists

## Code Examples

Verified patterns from official sources:

### TypeScript Type Error for Invalid Assignment

```typescript
// Source: TypeScript JSX handbook + Phase 28 content types
// From: https://www.typescriptlang.org/docs/handbook/jsx

import type { SubComponentContent } from 'react-agentic';
import { SpawnAgent } from 'react-agentic';

interface SectionProps {
  children?: SubComponentContent | SubComponentContent[];
}

function Section({ children }: SectionProps) {
  return <div>{children}</div>;
}

// TypeScript automatically rejects this at compile time:
const invalid = (
  <Section>
    <SpawnAgent agent="test" model="sonnet" description="Test" />
    {/*
      Type error:
      Type '{ kind: "spawnAgent"; agent: string; ... }' is not assignable to type 'SubComponentContent'.
      Type '{ kind: "spawnAgent"; ... }' is not assignable to type '{ kind: "heading"; ... }'.
    */}
  </Section>
);
```

### JSDoc-Enhanced Content Type

```typescript
// Source: TypeScript JSDoc documentation
// From: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types

/**
 * SubComponentContent - Content allowed in nested components
 *
 * Restricts to document-level primitives only. Prevents accidental nesting
 * of command-level features like SpawnAgent or control flow inside
 * presentation components.
 *
 * @example
 * ```tsx
 * interface CardProps {
 *   children?: SubComponentContent | SubComponentContent[];
 * }
 *
 * // TypeScript will error if SpawnAgent is used as a child
 * ```
 */
export type SubComponentContent =
  | Extract<BaseBlockNode, { kind: 'heading' }>
  | Extract<BaseBlockNode, { kind: 'paragraph' }>
  | Extract<BaseBlockNode, { kind: 'table' }>
  // ... other allowed kinds
```

### Test Case for Type Validation

```typescript
// Source: Phase 28 test suite pattern
// From: /Users/glenninizan/workspace/react-agentic/react-agentic/tests/ir/content-types.test.ts

import type { SubComponentContent } from '../src/ir/content-types.js';
import type { SpawnAgentNode } from '../src/ir/runtime-nodes.js';

describe('SubComponentContent validation', () => {
  it('should reject SpawnAgent assignment', () => {
    const spawnAgent: SpawnAgentNode = {
      kind: 'spawnAgent',
      agent: 'test',
      model: 'sonnet',
      description: 'Test',
    };

    // @ts-expect-error - SpawnAgentNode should not be assignable to SubComponentContent
    const invalid: SubComponentContent = spawnAgent;

    // If TypeScript doesn't error above, the test fails
    expect(invalid).toBeDefined(); // Runtime assertion (won't catch type errors)
  });
});
```

### Exhaustiveness Check for Content Types

```typescript
// Source: TypeScript narrowing documentation
// From: https://www.typescriptlang.org/docs/handbook/2/narrowing

import type { SubComponentContent } from 'react-agentic';

function processContent(node: SubComponentContent): string {
  switch (node.kind) {
    case 'heading':
      return `# ${node.text}`;
    case 'paragraph':
      return node.text;
    case 'table':
      return renderTable(node);
    // ... handle all SubComponentContent kinds
    default:
      // Exhaustiveness check - if a new kind is added to SubComponentContent,
      // TypeScript will error here because node isn't assignable to never
      const _exhaustive: never = node;
      return _exhaustive;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No content constraints | Phase 28 content types (2026) | Phase 28 | Users can type children props for compile-time safety |
| Runtime content checks | TypeScript discriminated unions (Phase 31) | Phase 31 | Errors caught at compile time, not during build |
| Generic error messages | JSDoc-enhanced types (Phase 31) | Phase 31 | IDE tooltips provide context about restrictions |
| React.FC with children | Regular function components with typed children | Ongoing | Avoids React.FC's automatic ReactNode intersection |

**Deprecated/outdated:**
- **Runtime validation in transformers:** TypeScript catches type errors at compile time
- **PropTypes for children:** TypeScript types completely replace runtime PropTypes checks
- **React.FC for type safety:** React.FC intersects children with ReactNode, breaking restrictions

## Open Questions

### 1. Warning Implementation Approach

**What we know:** TypeScript has no true "warning" concept that allows compilation to succeed. @deprecated annotations show visual strikethrough in IDE but don't prevent compilation.

**What's unclear:** How to satisfy the requirement "All 9 non-SpawnAgent exclusions (control flow, Return, AskUser, etc.) surface as warnings"

**Recommendation:** Document clearly in RESEARCH.md that TypeScript only supports errors, not warnings. Suggest updating phase context to either:
- Accept that all violations are errors (consistent TypeScript behavior)
- Use @deprecated as visual-only indicator (doesn't prevent compilation)
- Acknowledge this as a TypeScript limitation and proceed with error-only enforcement

### 2. Autocomplete Filtering Verification

**What we know:** TypeScript's language server should automatically filter suggestions based on type constraints

**What's unclear:** Whether this works reliably in practice for union types with Extract patterns

**Recommendation:** Plan includes test task to verify autocomplete behavior in VS Code. If filtering doesn't work naturally, this is a TypeScript LSP limitation we document, not something we implement custom tooling for.

### 3. Error Message Clarity

**What we know:** TypeScript will generate generic "Type X is not assignable to type Y" messages

**What's unclear:** Whether the error messages are clear enough to guide users, or if we need extensive JSDoc documentation

**Recommendation:** Phase 31 should include comprehensive JSDoc on all content types. Test actual error messages during implementation and adjust JSDoc to compensate for any confusion.

## Sources

### Primary (HIGH confidence)

- [TypeScript JSX Handbook](https://www.typescriptlang.org/docs/handbook/jsx) - Official TypeScript JSX documentation, children type checking
- [TypeScript Narrowing Documentation](https://www.typescriptlang.org/docs/handbook/2/narrowing) - Discriminated unions, exhaustiveness checking with never type
- [TypeScript JSDoc Support](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types) - @deprecated annotation, JSDoc for enhanced error messages
- [TypeScript Release Notes 4.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0) - @deprecated editor support and strikethrough behavior
- Project codebase at `/Users/glenninizan/workspace/react-agentic/react-agentic/` - Phase 28 content types implementation
- Phase 28 verification at `.planning/phases/28-content-types/28-VERIFICATION.md` - Confirmed Extract pattern with 10 exclusions

### Secondary (MEDIUM confidence)

- [GitHub Issue #42498](https://github.com/microsoft/TypeScript/issues/42498) - TypeScript limitation: cannot restrict JSX children with React.FC
- [GitHub Issue #13713](https://github.com/microsoft/TypeScript/issues/13713) - Feature request for custom error messages (declined by TypeScript team)
- [GitHub Issue #49433](https://github.com/microsoft/TypeScript/issues/49433) - Request for deprecation warnings compiler option (no native support)
- [GitHub Issue #62579](https://github.com/microsoft/TypeScript/issues/62579) - Discussion of @ts-expect-error vs @ts-ignore, lack of warning-only mode
- [TypeScript children prop type constraints compile-time errors JSX 2026](https://typescriptworld.com/ts2322-property-children-does-not-exist-on-type-intrinsic-attributes-and-props) - TS2322 error patterns for children props
- [React children composition patterns with TypeScript](https://medium.com/@martin_hotell/react-children-composition-patterns-with-typescript-56dfc8923c64) - Children typing patterns in React components
- [How to type React children correctly in TypeScript](https://blog.logrocket.com/react-children-prop-typescript/) - Best practices for typing children prop

### Tertiary (LOW confidence)

- [TypeScript discriminated union error messages DX](https://dev.to/tigawanna/understanding-discriminated-unions-in-typescript-1n0h) - General discriminated union patterns
- [TypeScript IDE autocomplete filter types](https://dev.to/krofdrakula/leveraging-generic-types-in-jsx-components-5eee) - Generic types for JSX autocomplete (2023 article)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, pure TypeScript type annotation work on Phase 28 foundation
- Architecture: HIGH - Discriminated unions with Extract pattern already implemented in Phase 28, clear patterns from TypeScript docs
- Pitfalls: HIGH - Clear understanding of TypeScript limitations (no custom errors, no true warnings, React.FC issues)

**Research date:** 2026-01-31
**Valid until:** 2026-03-02 (30 days - stable TypeScript features, no ecosystem changes expected)
