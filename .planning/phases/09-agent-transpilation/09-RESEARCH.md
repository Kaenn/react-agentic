# Phase 9: Agent Transpilation - Research

**Researched:** 2026-01-21
**Domain:** TSX Agent parsing, GSD-format emission, output routing
**Confidence:** HIGH

## Summary

Phase 9 extends the existing Command transpilation pipeline to support Agent components. The key insight: Agent follows the same parse -> transform -> emit pattern as Command, but with different frontmatter fields and a different output path routing strategy.

The IR layer (Phase 8) already provides `AgentDocumentNode` and `AgentFrontmatterNode`. This phase implements:
1. Agent component parsing (similar to Command parsing)
2. Agent frontmatter emission (GSD format: `tools` as string, not array)
3. Output path routing (Agent -> `.claude/agents/`, with optional subfolder support)

**Primary recommendation:** Follow Command implementation exactly for parsing/transformation patterns. Implement a parallel `AgentEmitter` that extends `MarkdownEmitter` with Agent-specific frontmatter handling, or add Agent support to existing emitter. Modify CLI to route Agent output to `.claude/agents/`.

## Standard Stack

No new dependencies needed. Existing stack fully supports this phase.

### Core
| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| ts-morph | ^27.0.2 | JSX parsing | Already used for Command parsing |
| gray-matter | ^4.0.3 | YAML frontmatter generation | Already used for Command frontmatter |
| TypeScript | ^5.9.3 | Type checking | Existing discriminated union patterns |

### Key APIs Used
| API | Location | Usage |
|-----|----------|-------|
| `getElementName()` | parser.ts | Detect `<Agent>` root element |
| `getAttributeValue()` | parser.ts | Extract name, description, tools, color props |
| `matter.stringify()` | emitter.ts | Generate YAML frontmatter |

## Architecture Patterns

### Existing File Structure (to extend)
```
src/
├── parser/
│   ├── parser.ts       # JSX parsing utilities (unchanged)
│   └── transformer.ts  # Add transformAgent() method
├── emitter/
│   └── emitter.ts      # Add Agent emission support
├── ir/
│   └── nodes.ts        # AgentDocumentNode, AgentFrontmatterNode (done in Phase 8)
├── jsx.ts              # Add AgentProps interface, Agent function stub
└── cli/
    └── commands/
        └── build.ts    # Route Agent output to .claude/agents/
```

### Pattern 1: Root Element Detection
**What:** Determine if TSX file is Command or Agent based on root element
**When to use:** During transformation, before frontmatter extraction
**Example:**
```typescript
// Source: Existing Command detection in transformer.ts
const name = getElementName(node);
if (name === 'Command') {
  return this.transformCommand(node);
}
if (name === 'Agent') {
  return this.transformAgent(node);  // NEW
}
```

### Pattern 2: Agent Frontmatter Emission
**What:** Generate GSD-format frontmatter with `tools` as string (not array)
**When to use:** Emitting AgentDocumentNode
**Example:**
```typescript
// Source: Based on existing emitFrontmatter() in emitter.ts
private emitAgentFrontmatter(node: AgentFrontmatterNode): string {
  const data: Record<string, unknown> = {
    name: node.name,
    description: node.description,
  };
  if (node.tools) {
    data.tools = node.tools;  // String, not array
  }
  if (node.color) {
    data.color = node.color;
  }
  return matter.stringify('', data).trimEnd();
}
```

### Pattern 3: Output Path Routing
**What:** Agent files output to `.claude/agents/`, Commands to `.claude/commands/`
**When to use:** CLI build phase, after determining document type
**Example:**
```typescript
// Source: Extend build.ts output path logic
function getOutputPath(doc: DocumentNode | AgentDocumentNode, options: BuildOptions, inputFile: string): string {
  const basename = path.basename(inputFile, '.tsx');

  if (doc.kind === 'agentDocument') {
    // Agent: .claude/agents/{folder?}/{basename}.md
    const folder = doc.frontmatter.folder ?? '';
    return path.join('.claude/agents', folder, `${basename}.md`);
  }

  // Command: .claude/commands/{basename}.md
  return path.join(options.out, `${basename}.md`);
}
```

### Pattern 4: Folder Prop Support (CONTEXT.md Decision)
**What:** Agent `folder` prop determines subfolder path for namespacing
**When to use:** Output path calculation
**Example:**
```typescript
// folder="my-team" + name="researcher" -> .claude/agents/my-team/researcher.md
// No folder -> .claude/agents/researcher.md
```

### Anti-Patterns to Avoid
- **Mixing frontmatter formats:** Agent uses `tools: "string"`, Command uses `allowed-tools: []`
- **Hardcoding output paths:** Should be configurable, respect folder prop
- **Duplicating parsing logic:** Reuse `getAttributeValue()`, `getArrayAttributeValue()` etc.
- **Ignoring document kind:** Must check `doc.kind` to determine output routing

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML generation | Custom string formatting | gray-matter library | Edge cases in YAML escaping |
| Prop extraction | Custom attribute parsing | `getAttributeValue()` | Already handles string literals and expressions |
| Frontmatter structure | New emit pattern | Extend existing pattern | Consistency, tested |
| Document kind detection | Runtime checks | TypeScript discriminated unions | Compile-time safety |

**Key insight:** The existing Command pipeline handles 90% of Agent's needs. Focus on extending, not rewriting.

## Common Pitfalls

### Pitfall 1: Wrong Frontmatter Format for Tools
**What goes wrong:** Emitting `tools: ["Read", "Grep"]` instead of `tools: "Read Grep"`
**Why it happens:** Following Command's `allowed-tools` array pattern
**How to avoid:** AgentFrontmatterNode already has `tools?: string` - emit directly
**Warning signs:** YAML array syntax in agent output

### Pitfall 2: Forgetting to Route Agent Output
**What goes wrong:** Agent files output to `.claude/commands/` instead of `.claude/agents/`
**Why it happens:** CLI defaults to `--out .claude/commands`
**How to avoid:** Check document kind before determining output path
**Warning signs:** Agent files not found by Claude Code

### Pitfall 3: Folder Path Not Created
**What goes wrong:** Error when folder doesn't exist
**Why it happens:** `mkdir` not called for nested folders
**How to avoid:** Use `mkdir(dir, { recursive: true })` before writing
**Warning signs:** ENOENT errors on nested folder paths

### Pitfall 4: Missing Required Props Not Caught
**What goes wrong:** Agent transpiles without name/description
**Why it happens:** No validation in transformer
**How to avoid:** Check for required props, throw TranspileError with location
**Warning signs:** Empty or invalid frontmatter in output

### Pitfall 5: Body Content Ignored
**What goes wrong:** Agent children (role sections, content) not emitted
**Why it happens:** Only frontmatter handled, children skipped
**How to avoid:** Transform children same as Command body
**Warning signs:** Agent output has only frontmatter, no body content

## Code Examples

### Example 1: AgentProps Interface
```typescript
// Source: Follow CommandProps pattern in jsx.ts

/**
 * Props for the Agent component
 */
export interface AgentProps {
  /** Agent name (used in frontmatter and Task() spawning) */
  name: string;
  /** Agent description (used in frontmatter) */
  description: string;
  /** Space-separated tool names (optional) */
  tools?: string;
  /** Terminal color for agent output (optional) */
  color?: string;
  /** Subfolder for output path (optional) */
  folder?: string;
  /** Agent body content */
  children?: ReactNode;
}
```

### Example 2: Agent Component Stub
```typescript
// Source: Follow Command pattern in jsx.ts

/**
 * Agent component - creates a Claude Code agent with frontmatter
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 *
 * @example
 * <Agent name="researcher" description="Research topics" tools="Read Grep Glob">
 *   <role>
 *     <p>You are a researcher...</p>
 *   </role>
 * </Agent>
 */
export function Agent(_props: AgentProps): null {
  return null;
}
```

### Example 3: transformAgent() Method
```typescript
// Source: Follow transformCommand() pattern in transformer.ts

/**
 * Transform an Agent element to AgentDocumentNode with frontmatter
 */
private transformAgent(node: JsxElement | JsxSelfClosingElement): AgentDocumentNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract required props
  const name = getAttributeValue(openingElement, 'name');
  const description = getAttributeValue(openingElement, 'description');

  if (!name) {
    throw this.createError('Agent requires name prop', openingElement);
  }
  if (!description) {
    throw this.createError('Agent requires description prop', openingElement);
  }

  // Extract optional props
  const tools = getAttributeValue(openingElement, 'tools');
  const color = getAttributeValue(openingElement, 'color');

  // Build frontmatter
  const frontmatter: AgentFrontmatterNode = {
    kind: 'agentFrontmatter',
    name,
    description,
    ...(tools && { tools }),
    ...(color && { color }),
  };

  // Transform children as body blocks
  const children: BlockNode[] = [];
  if (Node.isJsxElement(node)) {
    for (const child of node.getJsxChildren()) {
      const block = this.transformToBlock(child);
      if (block) children.push(block);
    }
  }

  return { kind: 'agentDocument', frontmatter, children };
}
```

### Example 4: Agent Frontmatter Emission
```typescript
// Source: Extend MarkdownEmitter in emitter.ts

/**
 * Emit an AgentDocumentNode to markdown
 */
emitAgent(doc: AgentDocumentNode): string {
  const parts: string[] = [];

  // Agent frontmatter (GSD format)
  parts.push(this.emitAgentFrontmatter(doc.frontmatter));

  // Body content (same as Command)
  for (const child of doc.children) {
    parts.push(this.emitBlock(child));
  }

  const result = parts.join('\n\n');
  return result ? result + '\n' : '';
}

/**
 * Emit Agent frontmatter (tools as string, not array)
 */
private emitAgentFrontmatter(node: AgentFrontmatterNode): string {
  const data: Record<string, unknown> = {
    name: node.name,
    description: node.description,
  };
  if (node.tools) {
    data.tools = node.tools;
  }
  if (node.color) {
    data.color = node.color;
  }
  return matter.stringify('', data).trimEnd();
}
```

### Example 5: Output Path Routing
```typescript
// Source: Modify build.ts runBuild()

// After transform, check document kind
const doc = transform(root, sourceFile);

// Determine output path based on document type
let outputPath: string;
if (doc.kind === 'agentDocument') {
  // Agent: .claude/agents/{folder?}/{basename}.md
  const folder = doc.frontmatter.folder ?? '';
  outputPath = path.join('.claude/agents', folder, `${basename}.md`);
} else {
  // Command: use --out option (default .claude/commands/)
  outputPath = path.join(options.out, `${basename}.md`);
}

// Ensure output directory exists
await mkdir(path.dirname(outputPath), { recursive: true });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Command-only output | Agent + Command routing | v1.1 | New output path logic |
| Single frontmatter format | Two formats (Command vs Agent) | v1.1 | Different YAML structure |
| Single emit() function | emit() + emitAgent() | v1.1 | Document-kind-aware emission |

**Critical difference from Command:**
- Command: `allowed-tools: ["Read", "Write"]` (array)
- Agent: `tools: "Read Write"` (space-separated string)

## Edge Cases

### Edge Case 1: Agent Without Tools
If `tools` prop is not provided, omit the `tools` field from frontmatter entirely.
```yaml
---
name: minimal-agent
description: An agent with no tool restrictions
---
```

### Edge Case 2: Empty Tools String
If `tools=""` is explicitly set, decision needed: emit empty string or omit field?
**Recommendation:** Omit if falsy (empty string or undefined).

### Edge Case 3: Nested Folder Paths
If `folder="team/sub-team"`, create nested directories:
```
.claude/agents/team/sub-team/agent-name.md
```

### Edge Case 4: Agent Name vs Filename
Agent's `name` prop determines frontmatter content, but filename determines output file:
- `<Agent name="gsd-researcher" ...>` in `researcher.tsx`
- Output: `.claude/agents/researcher.md`
- Frontmatter: `name: gsd-researcher`

### Edge Case 5: Self-Closing Agent
`<Agent name="x" description="y" />` with no children is valid - produces frontmatter only.

## Test Patterns

Based on existing test patterns in `tests/parser/transformer.test.ts`:

```typescript
describe('Agent transformation', () => {
  function transformTsx(tsx: string) {
    const project = createProject();
    const source = parseSource(project, tsx, 'test.tsx');
    const root = findRootJsxElement(source);
    if (!root) throw new Error('No JSX found');
    const transformer = new Transformer();
    return transformer.transform(root);
  }

  it('transforms Agent to AgentDocumentNode', () => {
    const tsx = `export default function MyAgent() {
      return (
        <Agent name="researcher" description="Research topics">
          <p>Agent body content</p>
        </Agent>
      );
    }`;
    const doc = transformTsx(tsx);

    expect(doc.kind).toBe('agentDocument');
    expect(doc.frontmatter.name).toBe('researcher');
    expect(doc.frontmatter.description).toBe('Research topics');
    expect(doc.children).toHaveLength(1);
  });

  it('transforms Agent with all props', () => {
    const tsx = `export default function FullAgent() {
      return (
        <Agent
          name="full-agent"
          description="Full featured"
          tools="Read Grep Glob"
          color="cyan"
        >
          <h1>Role</h1>
        </Agent>
      );
    }`;
    const doc = transformTsx(tsx);

    expect(doc.frontmatter.tools).toBe('Read Grep Glob');
    expect(doc.frontmatter.color).toBe('cyan');
  });

  it('throws for Agent without name', () => {
    const tsx = `export default function BadAgent() {
      return <Agent description="Missing name" />;
    }`;
    expect(() => transformTsx(tsx)).toThrow(/requires name prop/);
  });

  it('throws for Agent without description', () => {
    const tsx = `export default function BadAgent() {
      return <Agent name="missing-desc" />;
    }`;
    expect(() => transformTsx(tsx)).toThrow(/requires description prop/);
  });
});
```

### Emitter Tests
```typescript
describe('Agent emission', () => {
  it('emits AgentDocumentNode with frontmatter', () => {
    const doc: AgentDocumentNode = {
      kind: 'agentDocument',
      frontmatter: {
        kind: 'agentFrontmatter',
        name: 'test-agent',
        description: 'Test agent description',
        tools: 'Read Grep',
        color: 'cyan',
      },
      children: [],
    };

    const output = emitAgent(doc);
    expect(output).toContain('name: test-agent');
    expect(output).toContain('description: Test agent description');
    expect(output).toContain('tools: Read Grep');
    expect(output).toContain('color: cyan');
  });

  it('omits undefined optional fields', () => {
    const doc: AgentDocumentNode = {
      kind: 'agentDocument',
      frontmatter: {
        kind: 'agentFrontmatter',
        name: 'minimal',
        description: 'Minimal agent',
      },
      children: [],
    };

    const output = emitAgent(doc);
    expect(output).not.toContain('tools:');
    expect(output).not.toContain('color:');
  });
});
```

## Open Questions

### Question 1: folder Prop Storage
**What we know:** CONTEXT.md specifies `folder` prop for output path routing
**What's unclear:** Should `folder` be stored in AgentFrontmatterNode or handled separately?
**Recommendation:** Add `folder?: string` to AgentFrontmatterNode, or handle only in CLI routing (not emitted to markdown). Since folder affects file path, not frontmatter content, handle in CLI only.

### Question 2: Unified Emit Function Signature
**What we know:** Current `emit(doc: DocumentNode)` handles only Command documents
**What's unclear:** Add overload `emit(doc: AgentDocumentNode)` or separate function `emitAgent()`?
**Recommendation:** Add `emitAgent()` function, keep `emit()` for backward compatibility. Caller determines which to use based on `doc.kind`.

## Sources

### Primary (HIGH confidence)
- `/Users/glenninizan/workspace/react-agentic/src/parser/transformer.ts` - Command transformation patterns
- `/Users/glenninizan/workspace/react-agentic/src/emitter/emitter.ts` - Emission patterns
- `/Users/glenninizan/workspace/react-agentic/src/ir/nodes.ts` - AgentDocumentNode, AgentFrontmatterNode types
- `/Users/glenninizan/workspace/react-agentic/.planning/research/v1.1-agent-framework/FEATURES.md` - GSD format specification
- `/Users/glenninizan/workspace/react-agentic/.planning/phases/09-agent-transpilation/09-CONTEXT.md` - User decisions

### Secondary (MEDIUM confidence)
- `/Users/glenninizan/workspace/react-agentic/.planning/research/v1.1-SUMMARY.md` - Phase structure overview
- `/Users/glenninizan/workspace/react-agentic/tests/parser/transformer.test.ts` - Test patterns

### Tertiary (Documentation reference)
- gray-matter 4.0.3 documentation
- `/Users/glenninizan/workspace/react-agentic/.planning/REQUIREMENTS.md` - AGENT-01 through AGENT-06

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, existing patterns
- Architecture: HIGH - Following established Command patterns exactly
- Pitfalls: HIGH - Clear differentiation from Command (tools format, output path)
- Output routing: HIGH - CONTEXT.md provides clear folder prop decision

**Research date:** 2026-01-21
**Valid until:** Stable until v1.1 completion
