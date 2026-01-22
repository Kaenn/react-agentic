# Phase 13: Conditional Logic - Research

**Researched:** 2026-01-22
**Domain:** TSX-to-Markdown conditional emission, prose-based conditionals for Claude Code
**Confidence:** HIGH

## Summary

This phase adds `<If>` and `<Else>` components to react-agentic, enabling conditional execution in commands and agents. The output format must match GSD patterns used in Claude Code command markdown files, which use prose-based conditionals like `**If condition:**` and `**Otherwise:**` rather than code-based `if/else` blocks.

The implementation follows the established react-agentic patterns:
1. JSX components in `jsx.ts` (compile-time stubs with TypeScript types)
2. IR node types in `ir/nodes.ts` (discriminated union with `kind` discriminator)
3. Transformer in `parser/transformer.ts` (JSX AST to IR node conversion)
4. Emitter in `emitter/emitter.ts` (IR to markdown output)

**Primary recommendation:** Implement `<If>` as a block-level component with `test` prop accepting string expressions or VariableRef comparisons. Use sibling-based `<Else>` detection (not nested children) to match React conditional patterns.

## Standard Stack

The phase uses existing react-agentic infrastructure with no new dependencies.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-morph | 24.x | JSX parsing, type extraction | Already used throughout codebase |
| typescript | 5.x | Compiler API, AST traversal | Foundation for ts-morph |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| gray-matter | 4.x | Frontmatter emission | Already used in emitter |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sibling `<Else>` | Children `<Then>`/`<Else>` | Sibling matches React patterns better, children would require non-standard JSX |
| String `test` prop | AST-based condition builder | String preserves shell expressions verbatim, AST would over-complicate |

**Installation:**
No new dependencies required.

## Architecture Patterns

### Recommended Component API

```tsx
// Basic conditional
<If test="[ -f config.json ]">
  <p>Config file exists, loading settings...</p>
</If>

// With else clause (sibling pattern)
<If test="[ -z $PHASE_DIR ]">
  <p>Phase directory not found. Create it first.</p>
</If>
<Else>
  <p>Using existing phase directory: $PHASE_DIR</p>
</Else>

// With VariableRef comparison
const phaseDir = useVariable("PHASE_DIR", { bash: `ls -d .planning/phases/*` });
<If test={`[ -z ${phaseDir.ref} ]`}>
  <p>No phase directory found.</p>
</If>

// Nested conditionals
<If test="[ $MODE = 'interactive' ]">
  <p>Running in interactive mode.</p>
  <If test="[ $VERBOSE = 'true' ]">
    <p>Verbose output enabled.</p>
  </If>
</If>
```

### GSD Output Format

The emitter must produce prose-based conditionals matching GSD patterns found throughout Claude Code commands:

```markdown
**If [ -f config.json ]:**

Config file exists, loading settings...

**Otherwise:**

Config file missing. Using defaults.
```

For nested conditionals, use consistent indentation:

```markdown
**If [ $MODE = 'interactive' ]:**

Running in interactive mode.

  **If [ $VERBOSE = 'true' ]:**

  Verbose output enabled.
```

### IR Node Structure

```typescript
// New node types to add to ir/nodes.ts

/**
 * Conditional If block
 * Emits as **If {test}:** prose pattern
 */
export interface IfNode {
  kind: 'if';
  test: string;           // Shell test expression (e.g., "[ -f file ]")
  children: BlockNode[];  // "then" block content
}

/**
 * Else block (sibling to If)
 * Emits as **Otherwise:** prose pattern
 */
export interface ElseNode {
  kind: 'else';
  children: BlockNode[];  // "otherwise" block content
}
```

### Transformer Pattern

The transformer must:
1. Recognize `<If>` elements and extract `test` prop
2. Transform children as "then" block content
3. Detect sibling `<Else>` elements
4. Handle nested `<If>` within children recursively
5. Preserve variable interpolation in `test` expressions

```typescript
// In transformer.ts, add to transformElement switch:

if (name === 'If') {
  return this.transformIf(node);
}
if (name === 'Else') {
  // Else is handled as sibling to If during parent traversal
  // If encountered standalone, it's an error
  throw this.createError('<Else> must follow <If> as sibling', node);
}
```

### Emitter Pattern

```typescript
// In emitter.ts, add to emitBlock switch:

case 'if':
  return this.emitIf(node);
case 'else':
  return this.emitElse(node);

// Emitter methods:

private emitIf(node: IfNode): string {
  const parts: string[] = [];
  parts.push(`**If ${node.test}:**`);
  parts.push('');  // Blank line after condition

  for (const child of node.children) {
    parts.push(this.emitBlock(child));
  }

  return parts.join('\n\n');
}

private emitElse(node: ElseNode): string {
  const parts: string[] = [];
  parts.push('**Otherwise:**');
  parts.push('');  // Blank line after Otherwise

  for (const child of node.children) {
    parts.push(this.emitBlock(child));
  }

  return parts.join('\n\n');
}
```

### Anti-Patterns to Avoid

- **AST-based condition building:** Don't try to parse/validate the `test` expression as shell syntax. Preserve verbatim.
- **Children-based Else:** Don't use `<If><Then>...</Then><Else>...</Else></If>`. Use sibling pattern instead.
- **Compile-time evaluation:** Never evaluate conditions at compile time. All evaluation happens at Claude runtime.
- **Code-block conditionals:** Don't emit `if/then/else/fi` bash syntax. Use prose-based `**If:**/**Otherwise:**` format.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shell expression parsing | Custom shell parser | String passthrough | Shell syntax varies, passthrough is safer |
| Condition validation | Syntax checker | Runtime validation | Claude validates at execution time |
| Variable interpolation | Custom interpolation | Preserve `${}` and `{}` | Already works in emitter |

**Key insight:** The test expression is opaque to the compiler. The compiler's job is to emit the prose pattern correctly, not to understand or validate shell syntax.

## Common Pitfalls

### Pitfall 1: Sibling Detection Complexity
**What goes wrong:** Transformer doesn't correctly detect `<Else>` as sibling to preceding `<If>`
**Why it happens:** JSX children include whitespace text nodes between elements
**How to avoid:** When transforming block children, track If/Else pairs. After transforming an If, check if next non-whitespace sibling is Else.
**Warning signs:** Else appears as standalone block instead of paired with If

### Pitfall 2: Nested Indentation
**What goes wrong:** Nested conditionals don't have consistent visual indentation
**Why it happens:** Block emitter doesn't track nesting depth
**How to avoid:** Pass indentation context through emitter, or handle nesting in IfNode structure
**Warning signs:** All conditionals appear at same indentation level regardless of nesting

### Pitfall 3: Variable Interpolation in Test
**What goes wrong:** `${varRef.ref}` in test prop gets interpolated at compile time
**Why it happens:** TypeScript template literal evaluation
**How to avoid:** In JSX, use backtick template: `test={\`[ -z \${phaseDir.ref} ]\`}`. Transformer must preserve the literal string.
**Warning signs:** Test expression has resolved values instead of variable references

### Pitfall 4: ElseIf Chains
**What goes wrong:** Users expect `<ElseIf>` component that doesn't exist
**Why it happens:** Common pattern in other frameworks
**How to avoid:** Document that else-if requires nested structure: `<If>...<Else><If>...</If></Else>`
**Warning signs:** Users request ElseIf component

### Pitfall 5: Whitespace Between If/Else
**What goes wrong:** Whitespace between `</If>` and `<Else>` breaks sibling detection
**Why it happens:** JSX whitespace creates text nodes
**How to avoid:** Skip whitespace-only text nodes when detecting Else sibling
**Warning signs:** Else not detected even when immediately following If

## Code Examples

### JSX Component Definitions (jsx.ts)

```typescript
// Source: Pattern from existing jsx.ts components

/**
 * Props for the If component
 */
export interface IfProps {
  /** Shell test expression (e.g., "[ -f file ]") */
  test: string;
  /** "then" block content */
  children?: ReactNode;
}

/**
 * Props for the Else component
 */
export interface ElseProps {
  /** "otherwise" block content */
  children?: ReactNode;
}

/**
 * If component - conditional block for prose-based conditionals
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 *
 * @example
 * <If test="[ -f config.json ]">
 *   <p>Config found, loading...</p>
 * </If>
 */
export function If(_props: IfProps): null {
  return null;
}

/**
 * Else component - optional sibling to If
 *
 * Must appear immediately after a closing </If> tag.
 * It's never executed at runtime.
 *
 * @example
 * <If test="[ -f config.json ]">
 *   <p>Config found.</p>
 * </If>
 * <Else>
 *   <p>Config missing.</p>
 * </Else>
 */
export function Else(_props: ElseProps): null {
  return null;
}
```

### IR Node Types (ir/nodes.ts)

```typescript
// Source: Pattern from existing ir/nodes.ts

/**
 * Conditional If block
 * Emits as **If {test}:** prose pattern
 */
export interface IfNode {
  kind: 'if';
  /** Shell test expression (preserved verbatim) */
  test: string;
  /** "then" block content */
  children: BlockNode[];
}

/**
 * Else block (sibling to If)
 * Emits as **Otherwise:** prose pattern
 */
export interface ElseNode {
  kind: 'else';
  /** "otherwise" block content */
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
  | IfNode      // NEW
  | ElseNode;   // NEW
```

### Transformer Logic (parser/transformer.ts)

```typescript
// Source: Pattern from existing transformElement method

// Add to SPECIAL_COMPONENTS set:
const SPECIAL_COMPONENTS = new Set([
  'Command', 'Markdown', 'XmlBlock', 'Agent', 'SpawnAgent', 'Assign',
  'If', 'Else'  // NEW
]);

// Add to transformElement switch:
if (name === 'If') {
  return this.transformIf(node);
}
if (name === 'Else') {
  // Standalone Else is an error - must follow If
  throw this.createError('<Else> must follow <If> as sibling', node);
}

// New transformer method:
private transformIf(node: JsxElement | JsxSelfClosingElement): IfNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract test prop (required)
  const test = getAttributeValue(openingElement, 'test');
  if (!test) {
    throw this.createError('If requires test prop', openingElement);
  }

  // Transform children as "then" block
  const children: BlockNode[] = [];
  if (Node.isJsxElement(node)) {
    for (const child of node.getJsxChildren()) {
      const block = this.transformToBlock(child);
      if (block) children.push(block);
    }
  }

  return {
    kind: 'if',
    test,
    children,
  };
}
```

### Sibling If/Else Detection

```typescript
// Source: Pattern needed for parent context when transforming block children

private transformBlockChildren(jsxChildren: Node[]): BlockNode[] {
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < jsxChildren.length) {
    const child = jsxChildren[i];

    // Skip whitespace-only text nodes
    if (Node.isJsxText(child)) {
      const text = extractText(child);
      if (!text) {
        i++;
        continue;
      }
    }

    if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
      const name = getElementName(child);

      if (name === 'If') {
        const ifNode = this.transformIf(child);
        blocks.push(ifNode);

        // Check for Else sibling
        let nextIndex = i + 1;
        while (nextIndex < jsxChildren.length) {
          const sibling = jsxChildren[nextIndex];
          if (Node.isJsxText(sibling) && !extractText(sibling)) {
            nextIndex++; // Skip whitespace
            continue;
          }
          if ((Node.isJsxElement(sibling) || Node.isJsxSelfClosingElement(sibling))
              && getElementName(sibling) === 'Else') {
            // Found Else sibling
            const elseNode = this.transformElse(sibling);
            blocks.push(elseNode);
            i = nextIndex; // Skip past Else
          }
          break;
        }
      } else if (name === 'Else') {
        throw this.createError('<Else> must follow <If> as sibling', child);
      } else {
        const block = this.transformElement(name, child);
        if (block) blocks.push(block);
      }
    } else {
      const block = this.transformToBlock(child);
      if (block) blocks.push(block);
    }

    i++;
  }

  return blocks;
}
```

### Emitter Methods (emitter/emitter.ts)

```typescript
// Source: Pattern from existing emitBlock method

// Add to emitBlock switch:
case 'if':
  return this.emitIf(node);
case 'else':
  return this.emitElse(node);

// New emitter methods:
private emitIf(node: IfNode): string {
  const parts: string[] = [];

  // Emit condition header
  parts.push(`**If ${node.test}:**`);

  // Emit "then" block content
  for (const child of node.children) {
    parts.push(this.emitBlock(child));
  }

  return parts.join('\n\n');
}

private emitElse(node: ElseNode): string {
  const parts: string[] = [];

  // Emit "otherwise" header
  parts.push('**Otherwise:**');

  // Emit "else" block content
  for (const child of node.children) {
    parts.push(this.emitBlock(child));
  }

  return parts.join('\n\n');
}
```

### Complete Usage Example

```tsx
// Source: Based on GSD command patterns

import { Command, XmlBlock, If, Else, Assign, useVariable } from '../jsx.js';

const configExists = useVariable("CONFIG_EXISTS", {
  bash: `[ -f .planning/config.json ] && echo "true" || echo "false"`
});

const phaseDir = useVariable("PHASE_DIR", {
  bash: `ls -d .planning/phases/${PHASE}-* 2>/dev/null | head -1`
});

export default function ExampleCommand() {
  return (
    <Command name="example" description="Demonstrates conditional logic">
      <XmlBlock name="process">
        <h2>Step 1: Check Configuration</h2>
        <Assign var={configExists} />

        <If test="[ $CONFIG_EXISTS = 'true' ]">
          <p>Configuration found. Loading settings...</p>
          <pre><code className="language-bash">cat .planning/config.json</code></pre>
        </If>
        <Else>
          <p>No configuration found. Using defaults.</p>
        </Else>

        <h2>Step 2: Find Phase Directory</h2>
        <Assign var={phaseDir} />

        <If test={`[ -z ${phaseDir.ref} ]`}>
          <p>Phase directory not found. Creating...</p>
          <pre><code className="language-bash">mkdir -p .planning/phases/$PHASE-unknown</code></pre>
        </If>
        <Else>
          <p>Using existing phase directory.</p>

          <If test="[ -f $PHASE_DIR/*-CONTEXT.md ]">
            <p>Found context file. Reading decisions...</p>
          </If>
        </Else>
      </XmlBlock>
    </Command>
  );
}
```

### Expected Output

```markdown
---
name: example
description: Demonstrates conditional logic
---

<process>
## Step 1: Check Configuration

```bash
CONFIG_EXISTS=$([ -f .planning/config.json ] && echo "true" || echo "false")
```

**If [ $CONFIG_EXISTS = 'true' ]:**

Configuration found. Loading settings...

```bash
cat .planning/config.json
```

**Otherwise:**

No configuration found. Using defaults.

## Step 2: Find Phase Directory

```bash
PHASE_DIR=$(ls -d .planning/phases/${PHASE}-* 2>/dev/null | head -1)
```

**If [ -z $PHASE_DIR ]:**

Phase directory not found. Creating...

```bash
mkdir -p .planning/phases/$PHASE-unknown
```

**Otherwise:**

Using existing phase directory.

  **If [ -f $PHASE_DIR/*-CONTEXT.md ]:**

  Found context file. Reading decisions...

</process>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual markdown conditionals | TSX `<If>` component | This phase | Type-safe conditional authoring |
| Inline prose conditionals | Block-level If/Else | This phase | Consistent structure |

**Deprecated/outdated:**
- None - this is a new feature

## Open Questions

1. **ElseIf convenience component?**
   - What we know: GSD patterns use nested If for else-if chains
   - What's unclear: Would `<ElseIf>` convenience wrapper add value?
   - Recommendation: Start without ElseIf, add in future phase if users request

2. **Indentation for nested conditionals?**
   - What we know: GSD examples show some indentation for nested conditions
   - What's unclear: Exact indentation rules (spaces, markdown quote, etc.)
   - Recommendation: Use 2-space indentation prefix for visual clarity, test with Claude

3. **Complex test expressions?**
   - What we know: Shell test syntax is complex (`[[ ]]` vs `[ ]`, `&&`, `||`)
   - What's unclear: Should we validate syntax at compile time?
   - Recommendation: No validation - passthrough preserves flexibility

## Sources

### Primary (HIGH confidence)
- `/Users/glenninizan/workspace/react-agentic/src/jsx.ts` - Component patterns
- `/Users/glenninizan/workspace/react-agentic/src/ir/nodes.ts` - IR node patterns
- `/Users/glenninizan/workspace/react-agentic/src/parser/transformer.ts` - Transformation patterns
- `/Users/glenninizan/workspace/react-agentic/src/emitter/emitter.ts` - Emission patterns
- `/Users/glenninizan/.claude/get-shit-done/workflows/execute-plan.md` - GSD conditional patterns

### Secondary (MEDIUM confidence)
- GSD templates and workflows showing `**If condition:**` patterns
- Existing react-agentic documentation in `/docs/`

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing codebase patterns
- Architecture: HIGH - Follows established component/IR/emitter flow
- Pitfalls: HIGH - Based on analysis of existing transformer complexity
- GSD output format: HIGH - Verified from actual GSD files

**Research date:** 2026-01-22
**Valid until:** 60 days (stable internal codebase)
