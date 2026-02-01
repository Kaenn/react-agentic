# Phase 34: Agent Contract Components - Research

**Researched:** 2026-01-31
**Domain:** TypeScript compiler extensions, IR design, markdown emission
**Confidence:** HIGH

## Summary

Phase 34 adds five new contract components for agents: Role, UpstreamInput, DownstreamConsumer, Methodology, and StructuredReturns (with Return children). These components enable agents to self-document their contracts in a structured way that commands can later use for orchestration (Phase 35).

The implementation follows established patterns in the react-agentic codebase: TSX components compile to IR nodes, which emit as XML blocks in markdown. The key technical challenges are:
1. **Compile-time validation** - enforcing ordering, uniqueness, and exhaustiveness rules
2. **Type extraction** - pulling generic type parameters from Agent to validate Return statuses
3. **Nested rendering** - Return components within StructuredReturns render as markdown sections, not XML blocks

**Primary recommendation:** Build on existing XmlBlock infrastructure, add validation in transformAgent(), extract status type using ts-morph's type system, and emit StructuredReturns as a custom XML block with markdown section children.

## Standard Stack

The phase uses react-agentic's existing stack - no external libraries needed.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-morph | 27.0.2 | TypeScript AST parsing | Already used throughout parser/, provides type extraction |
| TypeScript | 5.9.3 | Compile-time validation | Core to react-agentic's value proposition |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.0.17 | Unit testing | Test compile-time validation rules |

### Alternatives Considered

None - this is purely internal compiler work using existing infrastructure.

## Architecture Patterns

### Recommended Component Structure

Contract components nest inside Agent, render as XML blocks:

```tsx
<Agent<StatusType> name="my-agent" description="...">
  <Role>I'm a test runner</Role>
  <UpstreamInput>Expects testPath, coverage flags</UpstreamInput>
  <DownstreamConsumer>Reports to orchestrator via structured status</DownstreamConsumer>
  <Methodology>Run tests, parse output, format results</Methodology>
  <StructuredReturns>
    <Return status="SUCCESS">All tests passed</Return>
    <Return status="FAILED">Some tests failed</Return>
  </StructuredReturns>

  {/* Regular agent content can interleave */}
  <XmlBlock name="process">...</XmlBlock>
</Agent>
```

### Pattern 1: IR Node Structure

Each contract component maps to a distinct IR node type:

```typescript
// src/ir/nodes.ts additions
export interface RoleNode {
  kind: 'role';
  children: BaseBlockNode[];
}

export interface UpstreamInputNode {
  kind: 'upstreamInput';
  children: BaseBlockNode[];
}

export interface DownstreamConsumerNode {
  kind: 'downstreamConsumer';
  children: BaseBlockNode[];
}

export interface MethodologyNode {
  kind: 'methodology';
  children: BaseBlockNode[];
}

export interface ReturnNode {
  kind: 'return';
  status: string;
  children: BaseBlockNode[];
}

export interface StructuredReturnsNode {
  kind: 'structuredReturns';
  returns: ReturnNode[];
}
```

Add to BaseBlockNode union:
```typescript
export type BaseBlockNode =
  | /* existing types */
  | RoleNode
  | UpstreamInputNode
  | DownstreamConsumerNode
  | MethodologyNode
  | StructuredReturnsNode
  | ReturnNode;  // Only valid inside StructuredReturns
```

**Source:** Pattern from existing XmlBlockNode (src/ir/nodes.ts:330-337)

### Pattern 2: Parser Validation Strategy

Validation happens in `transformAgent()` (src/parser/transformers/document.ts):

```typescript
export function transformAgent(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): AgentDocumentNode {
  // ... existing frontmatter extraction ...

  // Extract generic type arguments for status validation
  const typeArgs = extractTypeArguments(node);
  const statusType = typeArgs?.[0]; // First generic is status type

  // Transform children
  const children = transformAgentChildren(node, ctx, statusType);

  // Validate contract component rules
  validateContractComponents(children, statusType, ctx, node);

  return {
    kind: 'agentDocument',
    frontmatter,
    children,
  };
}

function validateContractComponents(
  children: BaseBlockNode[],
  statusType: string | undefined,
  ctx: TransformContext,
  node: Node
): void {
  // Extract contract components
  const contractComponents = {
    role: children.filter(c => c.kind === 'role'),
    upstreamInput: children.filter(c => c.kind === 'upstreamInput'),
    downstreamConsumer: children.filter(c => c.kind === 'downstreamConsumer'),
    methodology: children.filter(c => c.kind === 'methodology'),
    structuredReturns: children.filter(c => c.kind === 'structuredReturns'),
  };

  // Rule 1: At most one of each type
  for (const [name, components] of Object.entries(contractComponents)) {
    if (components.length > 1) {
      throw ctx.createError(
        `Agent can only have one <${pascalCase(name)}> component (found ${components.length})`,
        node
      );
    }
  }

  // Rule 2: Ordering validation
  const order = ['role', 'upstreamInput', 'downstreamConsumer', 'methodology', 'structuredReturns'];
  let lastIndex = -1;
  for (const component of children) {
    const currentIndex = order.indexOf(component.kind);
    if (currentIndex !== -1) {
      if (currentIndex < lastIndex) {
        throw ctx.createError(
          `Contract components must appear in order: Role → UpstreamInput → DownstreamConsumer → Methodology → StructuredReturns`,
          node
        );
      }
      lastIndex = currentIndex;
    }
  }

  // Rule 3: If statusType exists, StructuredReturns required
  if (statusType && contractComponents.structuredReturns.length === 0) {
    throw ctx.createError(
      `Agent<${statusType}> must include <StructuredReturns> documenting all status values`,
      node
    );
  }

  // Rule 4: StructuredReturns exhaustiveness
  if (statusType && contractComponents.structuredReturns.length > 0) {
    const structuredReturns = contractComponents.structuredReturns[0] as StructuredReturnsNode;
    validateExhaustiveReturns(structuredReturns, statusType, ctx, node);
  }
}

function validateExhaustiveReturns(
  structuredReturns: StructuredReturnsNode,
  statusType: string,
  ctx: TransformContext,
  node: Node
): void {
  // Extract literal types from union (e.g., "SUCCESS" | "FAILED" | "BLOCKED")
  const expectedStatuses = extractUnionLiterals(statusType, ctx);
  const documentedStatuses = new Set(
    structuredReturns.returns.map(r => r.status)
  );

  // Check for missing statuses
  const missing = expectedStatuses.filter(s => !documentedStatuses.has(s));
  if (missing.length > 0) {
    throw ctx.createError(
      `StructuredReturns must document all statuses from type ${statusType}. Missing: ${missing.join(', ')}`,
      node
    );
  }

  // Check for extra statuses
  const extra = Array.from(documentedStatuses).filter(s => !expectedStatuses.includes(s));
  if (extra.length > 0) {
    throw ctx.createError(
      `StructuredReturns contains statuses not in type ${statusType}: ${extra.join(', ')}`,
      node
    );
  }
}
```

**Source:** Pattern from existing runtime variable duplicate detection (src/parser/transformers/runtime-var.ts:84-90)

### Pattern 3: Type Extraction from Generics

Use ts-morph to extract union literal types:

```typescript
function extractUnionLiterals(
  typeName: string,
  ctx: TransformContext
): string[] {
  // Find type alias in source file
  const typeAlias = ctx.sourceFile.getTypeAlias(typeName);
  if (!typeAlias) {
    // Type not found in current file - return empty (no validation)
    return [];
  }

  const typeNode = typeAlias.getTypeNode();
  if (!typeNode || !Node.isUnionTypeNode(typeNode)) {
    throw new Error(`Type ${typeName} must be a union of string literals`);
  }

  // Extract literal values from union
  const literals: string[] = [];
  for (const member of typeNode.getTypeNodes()) {
    if (Node.isLiteralTypeNode(member)) {
      const literal = member.getLiteral();
      if (Node.isStringLiteral(literal)) {
        literals.push(literal.getLiteralValue());
      }
    }
  }

  return literals;
}
```

**Source:** Pattern from extractTypeArguments (src/parser/utils/variable-extraction.ts:398-420)

### Pattern 4: Emission Strategy

Contract components emit as snake_case XML blocks:

```typescript
// In MarkdownEmitter class (src/emitter/emitter.ts)

private emitBlock(node: BaseBlockNode): string {
  switch (node.kind) {
    // ... existing cases ...
    case 'role':
      return this.emitContractComponent('role', node);
    case 'upstreamInput':
      return this.emitContractComponent('upstream_input', node);
    case 'downstreamConsumer':
      return this.emitContractComponent('downstream_consumer', node);
    case 'methodology':
      return this.emitContractComponent('methodology', node);
    case 'structuredReturns':
      return this.emitStructuredReturns(node);
    // ...
  }
}

private emitContractComponent(
  tagName: string,
  node: RoleNode | UpstreamInputNode | DownstreamConsumerNode | MethodologyNode
): string {
  const children = node.children.map(c => this.emitBlock(c)).join('\n\n');
  return `<${tagName}>\n${children}\n</${tagName}>`;
}

private emitStructuredReturns(node: StructuredReturnsNode): string {
  const sections = node.returns.map(returnNode => {
    const heading = `## ${returnNode.status}`;
    const content = returnNode.children
      .map(c => this.emitBlock(c))
      .join('\n\n');
    return `${heading}\n\n${content}`;
  }).join('\n\n');

  return `<structured_returns>\n\n${sections}\n\n</structured_returns>`;
}
```

**Source:** Pattern from emitXmlBlock (src/emitter/emitter.ts:975-1003)

### Anti-Patterns to Avoid

- **Don't create separate validation pass** - Validate during transformation to provide accurate error locations
- **Don't validate in emitter** - Compilation should fail before emission
- **Don't use runtime type checking** - Everything must be compile-time

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript type extraction | Custom regex/string parsing | ts-morph type system | Handles complex types, nested unions, type references |
| Component ordering enforcement | Manual index tracking | Defined order array + validation loop | Same pattern used throughout codebase |
| Error reporting | String concatenation | ctx.createError() | Provides file/line context, consistent format |

**Key insight:** ts-morph provides complete TypeScript compiler API - use it rather than reimplementing type analysis.

## Common Pitfalls

### Pitfall 1: Type Extraction Scope

**What goes wrong:** Attempting to extract type definitions from external files fails
**Why it happens:** extractUnionLiterals only searches current source file
**How to avoid:**
- Accept that cross-file type validation is limited
- Document that status types should be defined in same file as Agent
- Fallback to no validation if type not found (graceful degradation)
**Warning signs:** Errors like "Type MyStatus not found" when type exists in import

### Pitfall 2: Return Component Outside StructuredReturns

**What goes wrong:** Users try to use `<Return>` outside `<StructuredReturns>`
**Why it happens:** Return is a BlockNode, so type system allows it anywhere
**How to avoid:**
- Add validation in transformAgent to check Return only appears as child of StructuredReturns
- Emit clear error: "Return component can only be used inside StructuredReturns"
**Warning signs:** IR contains ReturnNode as direct child of AgentDocumentNode

### Pitfall 3: Ordering Validation with Interleaved Content

**What goes wrong:** Regular content (XmlBlock, Markdown) between contract components causes ordering errors
**Why it happens:** Naive ordering check doesn't skip non-contract nodes
**How to avoid:**
- Filter to only contract component kinds before checking order
- Use `const order = ['role', 'upstreamInput', ...]` and `order.indexOf(component.kind)`
- Skip nodes not in order array (indexOf returns -1)
**Warning signs:** Error about ordering when components are actually in correct order

### Pitfall 4: Generic Type Parameter Position

**What goes wrong:** Assuming first generic is always status type
**Why it happens:** Agent currently has two generics: `<TInput, TOutput>`
**How to avoid:**
- **DECISION NEEDED:** Change Agent signature to `<TStatus, TInput, TOutput>` OR use `<TInput, TOutput extends BaseOutput<TStatus>>`
- Document breaking change if signature changes
- Handle backward compatibility with agents that don't specify status type
**Warning signs:** extractTypeArguments returns wrong type for validation

## Code Examples

Verified patterns from codebase analysis:

### TSX Component Definition

```typescript
// src/components/Agent.ts additions
export interface RoleProps {
  children?: ReactNode;
}

export function Role(_props: RoleProps): null {
  return null;
}

export interface ReturnProps {
  status: string;
  children?: ReactNode;
}

export function Return(_props: ReturnProps): null {
  return null;
}

// ... similar for UpstreamInput, DownstreamConsumer, Methodology, StructuredReturns
```

### Transformer Registration

```typescript
// src/parser/transformers/document.ts
function transformAgentChild(
  child: Node,
  ctx: TransformContext
): BaseBlockNode | null {
  if (!Node.isJsxElement(child) && !Node.isJsxSelfClosingElement(child)) {
    return transformNonJsxContent(child, ctx);
  }

  const name = getElementName(child);

  switch (name) {
    case 'Role':
      return transformRole(child, ctx);
    case 'UpstreamInput':
      return transformUpstreamInput(child, ctx);
    case 'DownstreamConsumer':
      return transformDownstreamConsumer(child, ctx);
    case 'Methodology':
      return transformMethodology(child, ctx);
    case 'StructuredReturns':
      return transformStructuredReturns(child, ctx);
    // ... existing cases ...
  }
}

function transformRole(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): RoleNode {
  const children = transformBlockChildren(node, ctx);
  return { kind: 'role', children };
}

function transformStructuredReturns(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): StructuredReturnsNode {
  if (Node.isJsxSelfClosingElement(node)) {
    throw ctx.createError('StructuredReturns must have Return children', node);
  }

  const returns: ReturnNode[] = [];

  for (const child of node.getJsxChildren()) {
    if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
      const childName = getElementName(child);
      if (childName === 'Return') {
        returns.push(transformReturn(child, ctx));
      } else {
        throw ctx.createError(
          `StructuredReturns can only contain Return components, not ${childName}`,
          child
        );
      }
    }
  }

  if (returns.length === 0) {
    throw ctx.createError('StructuredReturns must have at least one Return child', node);
  }

  return { kind: 'structuredReturns', returns };
}

function transformReturn(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): ReturnNode {
  const status = getAttributeValue(node, 'status');
  if (!status) {
    throw ctx.createError('Return requires status prop', node);
  }

  const children = transformBlockChildren(node, ctx);
  return { kind: 'return', status, children };
}
```

### Test Pattern

```typescript
// tests/parser/agent-contract.test.ts
import { describe, it, expect } from 'vitest';
import { transformAgent } from '../../src/parser/transformers/document.js';

describe('Agent contract components', () => {
  it('validates component ordering', () => {
    const source = `
      <Agent name="test" description="test">
        <Methodology>Do stuff</Methodology>
        <Role>I'm a tester</Role>
      </Agent>
    `;

    expect(() => transform(source)).toThrow(
      'Contract components must appear in order: Role → UpstreamInput → DownstreamConsumer → Methodology → StructuredReturns'
    );
  });

  it('validates StructuredReturns exhaustiveness', () => {
    const source = `
      type TestStatus = "SUCCESS" | "FAILED";

      <Agent<TestStatus> name="test" description="test">
        <StructuredReturns>
          <Return status="SUCCESS">All good</Return>
        </StructuredReturns>
      </Agent>
    `;

    expect(() => transform(source)).toThrow(
      'StructuredReturns must document all statuses from type TestStatus. Missing: FAILED'
    );
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Agents as unstructured markdown | Agent contracts via typed components | Phase 34 (v3.1) | Commands can introspect agent capabilities at compile-time |
| Manual agent documentation | Self-documenting agent contracts | Phase 34 (v3.1) | Agent contract is source of truth, not separate docs |

**Deprecated/outdated:**
- None - this is a new feature

## Open Questions

Things that couldn't be fully resolved:

1. **Agent Generic Signature**
   - What we know: Current signature is `Agent<TInput, TOutput>`
   - What's unclear: Should status type be separate generic or part of TOutput?
   - Recommendation: Add as first generic `Agent<TStatus, TInput, TOutput>` for clarity, but make all generics optional for backward compatibility

2. **Cross-File Type Validation**
   - What we know: ts-morph can resolve imports but it's complex
   - What's unclear: Should we validate status types defined in external files?
   - Recommendation: Start with same-file validation only, add cross-file in Phase 35 if needed

3. **Return Children Validation**
   - What we know: Return children should be markdown content
   - What's unclear: Should we restrict to specific node types or allow any BaseBlockNode?
   - Recommendation: Allow any BaseBlockNode initially - users may want tables, code blocks, etc.

## Sources

### Primary (HIGH confidence)

- react-agentic codebase analysis - existing patterns in src/parser/, src/emitter/, src/ir/
- experiments/meta-prompting/scenario-4-generated-agent.md - target output format
- experiments/meta-prompting/scenario-4-structured-input-only.tsx - TSX API pattern
- ts-morph documentation (current version 27.0.2 in package.json)

### Secondary (MEDIUM confidence)

- TypeScript 5.9.3 type system documentation (for union literal extraction)

### Tertiary (LOW confidence)

- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using only existing dependencies
- Architecture: HIGH - Following established codebase patterns
- Pitfalls: MEDIUM - Some are inferred from similar validation code, not tested

**Research date:** 2026-01-31
**Valid until:** 2026-03-02 (30 days - stable domain, unlikely to change)
