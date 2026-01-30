# Phase 10: SpawnAgent Component - Research

**Researched:** 2026-01-21
**Domain:** TSX SpawnAgent parsing, Task() syntax emission, placeholder preservation
**Confidence:** HIGH

## Summary

Phase 10 implements the SpawnAgent component, which appears inside Command elements and emits GSD Task() syntax. Unlike Agent (which is a document-level component producing its own output file), SpawnAgent is a block-level element that emits inline Task() calls within Command markdown.

The key challenges are:
1. SpawnAgent is parsed as a BLOCK element inside Command (not a new document type)
2. Emission outputs Task() function-call syntax (not markdown)
3. `{variable}` placeholders in model and prompt props must pass through UNCHANGED

**Primary recommendation:** Implement SpawnAgentNode parsing in transformer.ts with the same pattern as other block elements. Add `emitSpawnAgent()` method to MarkdownEmitter that outputs Task() syntax with proper string escaping and placeholder preservation.

## Standard Stack

No new dependencies needed. Existing stack fully supports this phase.

### Core
| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| ts-morph | ^27.0.2 | JSX parsing | Already used for Command/Agent parsing |
| gray-matter | ^4.0.3 | YAML frontmatter | Not used by SpawnAgent (Task() is not YAML) |
| TypeScript | ^5.9.3 | Type checking | Existing discriminated union patterns |

### Key APIs Used
| API | Location | Usage |
|-----|----------|-------|
| `getElementName()` | parser.ts | Detect `<SpawnAgent>` element |
| `getAttributeValue()` | parser.ts | Extract agent, model, description, prompt props |
| `emitBlock()` | emitter.ts | Dispatch to emitSpawnAgent() via switch |

## Architecture Patterns

### SpawnAgent as Block Element

SpawnAgent fits into existing BlockNode union (already added in Phase 8):

```typescript
// From nodes.ts (Phase 8)
export interface SpawnAgentNode {
  kind: 'spawnAgent';
  agent: string;           // Agent name/reference (e.g., 'gsd-researcher')
  model: string;           // Model to use (supports {variable} syntax)
  description: string;     // Human-readable task description
  prompt: string;          // Task prompt (supports {variable} and template literals)
}

export type BlockNode =
  | HeadingNode
  | ...
  | SpawnAgentNode;  // Already in union
```

### Pattern 1: SpawnAgent Parsing in transformElement()

**What:** Add SpawnAgent case to transformElement() method
**When to use:** When parser encounters `<SpawnAgent>` element inside Command
**Example:**
```typescript
// In transformer.ts transformElement() method
if (name === 'SpawnAgent') {
  return this.transformSpawnAgent(node);
}

private transformSpawnAgent(node: JsxElement | JsxSelfClosingElement): SpawnAgentNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract required props
  const agent = getAttributeValue(openingElement, 'agent');
  const model = getAttributeValue(openingElement, 'model');
  const description = getAttributeValue(openingElement, 'description');
  const prompt = this.extractPromptProp(openingElement);

  if (!agent) {
    throw this.createError('SpawnAgent requires agent prop', openingElement);
  }
  if (!model) {
    throw this.createError('SpawnAgent requires model prop', openingElement);
  }
  if (!description) {
    throw this.createError('SpawnAgent requires description prop', openingElement);
  }
  if (!prompt) {
    throw this.createError('SpawnAgent requires prompt prop', openingElement);
  }

  return { kind: 'spawnAgent', agent, model, description, prompt };
}
```

### Pattern 2: Prompt Prop Extraction (Multi-line Template Literals)

**What:** Extract prompt prop value, preserving multi-line content and `{variable}` placeholders
**When to use:** SpawnAgent prompt prop parsing
**Critical:** Prompt can be template literal with newlines and placeholders

```typescript
private extractPromptProp(element: JsxOpeningElement | JsxSelfClosingElement): string | undefined {
  const attr = element.getAttribute('prompt');
  if (!attr || !Node.isJsxAttribute(attr)) {
    return undefined;
  }

  const init = attr.getInitializer();
  if (!init) {
    return undefined;
  }

  // String literal: prompt="simple string"
  if (Node.isStringLiteral(init)) {
    return init.getLiteralValue();
  }

  // JSX expression: prompt={`template literal`} or prompt={"string"}
  if (Node.isJsxExpression(init)) {
    const expr = init.getExpression();

    // Template literal: prompt={`multi-line content`}
    if (expr && Node.isTemplateExpression(expr)) {
      // Get raw template text preserving placeholders like {variable}
      return this.extractTemplateText(expr);
    }

    // No-substitution template literal: prompt={`simple template`}
    if (expr && Node.isNoSubstitutionTemplateLiteral(expr)) {
      return expr.getLiteralValue();
    }

    // String literal in JSX expression: prompt={"string"}
    if (expr && Node.isStringLiteral(expr)) {
      return expr.getLiteralValue();
    }
  }

  return undefined;
}

private extractTemplateText(expr: TemplateExpression): string {
  // Template expression has head, spans
  // For `<planning_context>\n{phase}\n</planning_context>`
  // We need to preserve the literal text, NOT evaluate expressions

  const parts: string[] = [];

  // Head: text before first ${...}
  parts.push(expr.getHead().getLiteralText());

  // Spans: each has expression + literal text after
  for (const span of expr.getTemplateSpans()) {
    const spanExpr = span.getExpression();
    // Expression like ${phase} - we DON'T evaluate, we preserve as {phase}
    // TypeScript template expressions use ${...}, but GSD uses {...}
    // So ${phase} -> {phase} in output
    if (Node.isIdentifier(spanExpr)) {
      parts.push(`{${spanExpr.getText()}}`);
    } else {
      // Complex expression - get text representation
      parts.push(`{${spanExpr.getText()}}`);
    }
    parts.push(span.getLiteral().getLiteralText());
  }

  return parts.join('');
}
```

### Pattern 3: Task() Syntax Emission

**What:** Emit GSD Task() function-call syntax from SpawnAgentNode
**When to use:** emitBlock() encounters 'spawnAgent' kind
**Example:**
```typescript
// In emitter.ts emitBlock() switch
case 'spawnAgent':
  return this.emitSpawnAgent(node);

private emitSpawnAgent(node: SpawnAgentNode): string {
  // GSD Task() format:
  // Task(
  //   prompt="...",
  //   subagent_type="...",
  //   model="...",
  //   description="..."
  // )

  // Escape double quotes in prompt string
  const escapedPrompt = node.prompt.replace(/"/g, '\\"');

  return `Task(
  prompt="${escapedPrompt}",
  subagent_type="${node.agent}",
  model="${node.model}",
  description="${node.description}"
)`;
}
```

### Pattern 4: Placeholder Preservation (`{variable}` NOT interpolated)

**What:** GSD uses `{variable}` syntax that looks like template literals but must NOT be evaluated
**Critical insight:** `{phase}` in TSX must emit as `{phase}` in markdown, not be interpolated

```typescript
// INPUT TSX:
<SpawnAgent
  agent="gsd-researcher"
  model="{researcher_model}"  // NOT a JS variable!
  prompt={`<context>
Phase: {phase_number}
</context>`}
/>

// OUTPUT MARKDOWN:
Task(
  prompt="<context>
Phase: {phase_number}
</context>",
  subagent_type="gsd-researcher",
  model="{researcher_model}",
  description="..."
)
```

The `{variable}` syntax is GSD's runtime placeholder, not TypeScript interpolation. Our transpiler must:
1. Detect `{variable}` patterns in prop values
2. Pass them through UNCHANGED to output
3. NOT attempt to resolve or interpolate them

### Anti-Patterns to Avoid

- **Evaluating `{variable}`:** These are GSD runtime placeholders, not TypeScript expressions
- **Using children for prompt:** Prompt is a prop, not children (unlike XmlBlock)
- **Creating new document type:** SpawnAgent emits inline, not new file
- **Treating as inline element:** SpawnAgent is block-level (appears between paragraphs)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Prop extraction | Custom attribute parsing | `getAttributeValue()` | Handles string literals and JSX expressions |
| Template literal parsing | Manual string manipulation | ts-morph `getTemplateSpans()` | Handles all template literal edge cases |
| Multi-line string handling | Regex-based parsing | Template literal API | Preserves newlines correctly |
| Error messages | Simple strings | `TranspileError` with location | Includes file/line info for debugging |

**Key insight:** ts-morph provides complete APIs for template literal introspection. Use them rather than regex-based parsing.

## Common Pitfalls

### Pitfall 1: Interpolating `{variable}` Placeholders

**What goes wrong:** `{researcher_model}` gets evaluated as undefined or throws
**Why it happens:** Template literal expressions like `${variable}` are evaluated by TypeScript
**How to avoid:**
1. For template literals with `${var}`, extract as text (don't evaluate)
2. For string props like `model="{var}"`, just get literal value
**Warning signs:** Undefined or empty values where placeholders should be

### Pitfall 2: Losing Multi-line Prompt Content

**What goes wrong:** Prompt appears on single line with `\n` escapes
**Why it happens:** Incorrect string escaping or template literal handling
**How to avoid:** Preserve actual newlines in output; only escape quotes
**Warning signs:** `prompt="...\n..."` instead of actual line breaks

### Pitfall 3: Wrong Quote Escaping

**What goes wrong:** Task() output has unescaped quotes, breaking syntax
**Why it happens:** Prompt content contains `"` characters
**How to avoid:** Escape double quotes in prompt: `"` -> `\"`
**Warning signs:** Parser errors when Claude Code reads output

### Pitfall 4: SpawnAgent Outside Command

**What goes wrong:** SpawnAgent appears at document root (no Command wrapper)
**Why it happens:** User writes standalone SpawnAgent
**How to avoid:** SpawnAgent is only valid inside Command; throw error if at root
**Warning signs:** Task() syntax at document root without frontmatter

### Pitfall 5: Missing Required Props

**What goes wrong:** Transpilation succeeds but output has empty Task() fields
**Why it happens:** No validation of required props
**How to avoid:** Validate all four props (agent, model, description, prompt) with clear errors
**Warning signs:** `subagent_type=""` or similar empty fields

## Code Examples

### Example 1: SpawnAgentProps Interface

```typescript
// In jsx.ts
/**
 * Props for the SpawnAgent component
 */
export interface SpawnAgentProps {
  /** Agent name to spawn (e.g., 'gsd-researcher') */
  agent: string;
  /** Model to use - supports {variable} placeholders */
  model: string;
  /** Human-readable description of the task */
  description: string;
  /** Prompt content - supports multi-line and {variable} placeholders */
  prompt: string;
}

/**
 * SpawnAgent component - emits GSD Task() syntax inside a Command
 *
 * This is a compile-time component transformed by react-agentic.
 * It emits Task() function-call syntax, not markdown.
 *
 * @example
 * <SpawnAgent
 *   agent="gsd-researcher"
 *   model="{researcher_model}"
 *   description="Research phase requirements"
 *   prompt={`<context>Phase: {phase}</context>`}
 * />
 */
export function SpawnAgent(_props: SpawnAgentProps): null {
  return null;
}
```

### Example 2: transformSpawnAgent() Method

```typescript
// In transformer.ts
private transformSpawnAgent(node: JsxElement | JsxSelfClosingElement): SpawnAgentNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract required props
  const agent = getAttributeValue(openingElement, 'agent');
  const model = getAttributeValue(openingElement, 'model');
  const description = getAttributeValue(openingElement, 'description');
  const prompt = this.extractPromptProp(openingElement);

  // Validate all required
  if (!agent) {
    throw this.createError('SpawnAgent requires agent prop', openingElement);
  }
  if (!model) {
    throw this.createError('SpawnAgent requires model prop', openingElement);
  }
  if (!description) {
    throw this.createError('SpawnAgent requires description prop', openingElement);
  }
  if (!prompt) {
    throw this.createError('SpawnAgent requires prompt prop', openingElement);
  }

  return { kind: 'spawnAgent', agent, model, description, prompt };
}
```

### Example 3: emitSpawnAgent() Method

```typescript
// In emitter.ts
private emitSpawnAgent(node: SpawnAgentNode): string {
  // Escape double quotes in string values
  const escapeQuotes = (s: string) => s.replace(/"/g, '\\"');

  return `Task(
  prompt="${escapeQuotes(node.prompt)}",
  subagent_type="${escapeQuotes(node.agent)}",
  model="${escapeQuotes(node.model)}",
  description="${escapeQuotes(node.description)}"
)`;
}
```

### Example 4: Complete E2E Example

```tsx
// INPUT: commands/plan-phase.tsx
export default function PlanPhase() {
  return (
    <Command
      name="gsd:plan-phase"
      description="Plan a phase"
      allowedTools={["Read", "Task"]}
    >
      <h1>Phase Planning</h1>
      <p>This command spawns a researcher agent.</p>

      <SpawnAgent
        agent="gsd-phase-researcher"
        model="{researcher_model}"
        description="Research phase requirements"
        prompt={`<planning_context>
**Phase:** {phase_number}
**Description:** {phase_description}
</planning_context>

Research the technical domain for this phase.`}
      />
    </Command>
  );
}

// OUTPUT: .claude/commands/plan-phase.md
---
name: gsd:plan-phase
description: Plan a phase
allowed-tools:
  - Read
  - Task
---

# Phase Planning

This command spawns a researcher agent.

Task(
  prompt="<planning_context>
**Phase:** {phase_number}
**Description:** {phase_description}
</planning_context>

Research the technical domain for this phase.",
  subagent_type="gsd-phase-researcher",
  model="{researcher_model}",
  description="Research phase requirements"
)
```

## Edge Cases

### Edge Case 1: Empty Prompt

If `prompt=""` is explicitly set, it's valid but useless. Emit as is.

### Edge Case 2: Prompt With Quotes

```tsx
prompt={`Say "hello" to the agent`}
// Emits: prompt="Say \"hello\" to the agent"
```

### Edge Case 3: Multiple SpawnAgent in Single Command

Valid pattern - emit both Task() blocks separated by blank lines:

```tsx
<Command name="multi" description="Multi-spawn">
  <SpawnAgent agent="a" model="m" description="d" prompt="p1" />
  <SpawnAgent agent="b" model="m" description="d" prompt="p2" />
</Command>
```

### Edge Case 4: SpawnAgent With Children

SpawnAgent should NOT have children - it uses `prompt` prop. Either:
1. Ignore children (self-closing preferred)
2. Throw error if children present

**Recommendation:** Ignore children; SpawnAgent is always effectively self-closing.

### Edge Case 5: Placeholders in All Props

All props support `{variable}` syntax:
- `agent="{agent_name}"` - dynamic agent selection
- `model="{model}"` - model variable
- `description="{task_description}"` - dynamic description
- `prompt="{prompt_content}"` - entire prompt from variable

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual Task() writing | TSX SpawnAgent component | v1.1 | Type-safe agent spawning |
| Runtime context passing | Compile-time placeholder preservation | v1.1 | GSD format compatibility |

## Template Literal vs String Prop Decision

**Decision:** Support BOTH:
1. `prompt="simple string"` - for short, single-line prompts
2. `prompt={`template literal`}` - for multi-line prompts with preserved formatting

Both must preserve `{variable}` placeholders unchanged.

## Test Patterns

### Transformer Tests

```typescript
describe('SpawnAgent transformation', () => {
  it('transforms SpawnAgent with all props', () => {
    const tsx = `export default function MyCommand() {
      return (
        <Command name="test" description="Test">
          <SpawnAgent
            agent="gsd-researcher"
            model="{model}"
            description="Research task"
            prompt="Do research"
          />
        </Command>
      );
    }`;
    const doc = transformTsx(tsx);

    expect(doc.children).toHaveLength(1);
    expect(doc.children[0].kind).toBe('spawnAgent');
    if (doc.children[0].kind === 'spawnAgent') {
      expect(doc.children[0].agent).toBe('gsd-researcher');
      expect(doc.children[0].model).toBe('{model}');
      expect(doc.children[0].description).toBe('Research task');
      expect(doc.children[0].prompt).toBe('Do research');
    }
  });

  it('preserves {variable} placeholders in model', () => {
    const tsx = `export default function MyCommand() {
      return (
        <Command name="test" description="Test">
          <SpawnAgent
            agent="test"
            model="{researcher_model}"
            description="desc"
            prompt="prompt"
          />
        </Command>
      );
    }`;
    const doc = transformTsx(tsx);

    const spawn = doc.children[0];
    if (spawn.kind === 'spawnAgent') {
      expect(spawn.model).toBe('{researcher_model}');
    }
  });

  it('throws for missing agent prop', () => {
    const tsx = `export default function MyCommand() {
      return (
        <Command name="test" description="Test">
          <SpawnAgent model="m" description="d" prompt="p" />
        </Command>
      );
    }`;
    expect(() => transformTsx(tsx)).toThrow(/SpawnAgent requires agent prop/);
  });
});
```

### Emitter Tests

```typescript
describe('SpawnAgent emission', () => {
  it('emits Task() syntax', () => {
    const doc: DocumentNode = {
      kind: 'document',
      frontmatter: { kind: 'frontmatter', data: { name: 'test', description: 'desc' } },
      children: [{
        kind: 'spawnAgent',
        agent: 'gsd-researcher',
        model: '{model}',
        description: 'Research',
        prompt: 'Do research'
      }]
    };

    const output = emit(doc);

    expect(output).toContain('Task(');
    expect(output).toContain('subagent_type="gsd-researcher"');
    expect(output).toContain('model="{model}"');
    expect(output).toContain('description="Research"');
    expect(output).toContain('prompt="Do research"');
  });

  it('escapes quotes in prompt', () => {
    const doc: DocumentNode = {
      kind: 'document',
      frontmatter: { kind: 'frontmatter', data: { name: 'test', description: 'desc' } },
      children: [{
        kind: 'spawnAgent',
        agent: 'test',
        model: 'm',
        description: 'd',
        prompt: 'Say "hello"'
      }]
    };

    const output = emit(doc);
    expect(output).toContain('prompt="Say \\"hello\\""');
  });

  it('preserves multi-line prompt', () => {
    const doc: DocumentNode = {
      kind: 'document',
      frontmatter: { kind: 'frontmatter', data: { name: 'test', description: 'desc' } },
      children: [{
        kind: 'spawnAgent',
        agent: 'test',
        model: 'm',
        description: 'd',
        prompt: 'Line 1\nLine 2\nLine 3'
      }]
    };

    const output = emit(doc);
    expect(output).toContain('Line 1\nLine 2\nLine 3');
  });
});
```

## Open Questions

### Question 1: Template Literal Expression Handling

**What we know:** TSX template literals use `${var}` for interpolation
**What's unclear:** How to handle `prompt={`text ${variable} more`}` when we want literal `{variable}` in output?

**Options:**
1. Require users to escape: `prompt={`text \${variable} more`}` (ugly)
2. Convert `${var}` to `{var}` automatically (magic behavior)
3. Only support no-substitution templates: `prompt={`text {variable}`}` (no `$`)
4. Use string props with escape sequences: `prompt={"text {variable}"}` (recommended)

**Recommendation:** Support option 3 (no-substitution templates) and option 4 (string props). Document that `${...}` syntax is NOT supported and will throw an error. GSD placeholders use `{...}` not `${...}`.

### Question 2: Add SpawnAgent to SPECIAL_COMPONENTS?

**What we know:** SPECIAL_COMPONENTS set prevents treating names as custom components
**What's unclear:** Is SpawnAgent a special component or handled differently?

**Recommendation:** Add 'SpawnAgent' to SPECIAL_COMPONENTS set, then handle in transformElement() like other special components.

## Sources

### Primary (HIGH confidence)
- `/Users/glenninizan/workspace/react-agentic/src/ir/nodes.ts` - SpawnAgentNode interface (from Phase 8)
- `/Users/glenninizan/workspace/react-agentic/src/parser/transformer.ts` - Existing transformation patterns
- `/Users/glenninizan/workspace/react-agentic/src/emitter/emitter.ts` - Existing emission patterns
- `/Users/glenninizan/workspace/react-agentic/.planning/research/v1.1-agent-framework/FEATURES.md` - GSD Task() format specification

### Secondary (MEDIUM confidence)
- `/Users/glenninizan/workspace/react-agentic/tests/parser/transformer.test.ts` - Test patterns
- `/Users/glenninizan/workspace/react-agentic/tests/emitter/agent-emitter.test.ts` - Agent test patterns

### ts-morph Documentation (HIGH confidence)
- Template literal handling: `TemplateExpression`, `NoSubstitutionTemplateLiteral`
- JSX attribute handling: `JsxAttribute`, `JsxExpression`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, existing patterns
- Architecture: HIGH - SpawnAgentNode already in IR, follows block element pattern
- Pitfalls: HIGH - Clear from GSD format analysis
- Template literal handling: MEDIUM - Need to validate ts-morph API behavior

**Research date:** 2026-01-21
**Valid until:** Stable until Phase 10 completion
