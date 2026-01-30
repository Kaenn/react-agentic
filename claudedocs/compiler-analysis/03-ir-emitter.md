# IR Design and Emission

The IR (Intermediate Representation) uses discriminated unions for type-safe transformation and emission.

## Goal

Provide a type-safe intermediate format that:
- Enables exhaustive switch handling (compiler catches missing cases)
- Separates parsing concerns from emission concerns
- Supports multiple document types (Command, Agent, Skill)
- Extends cleanly for runtime features

## Why IR?

**Separation of Concerns**: Parsing (understanding JSX structure) is decoupled from emission (generating markdown). This allows:
- Testing transformers without string comparisons
- Multiple emitters for same IR (V1 vs V3)
- Easier debugging - inspect IR nodes directly

**Testability**: IR nodes are plain objects, easy to construct in tests:

```typescript
const node: HeadingNode = { kind: 'heading', level: 2, children: [{ kind: 'text', value: 'Test' }] };
expect(emitter.emitBlock(node)).toBe('## Test');
```

**Type Safety**: Discriminated unions with `kind` property enable exhaustive switch handling. See [Cross-Cutting Patterns](./04-patterns.md#discriminated-unions-for-safety) for the pattern details.

## Node Hierarchies

**File:** `src/ir/nodes.ts` (base nodes)
**File:** `src/ir/runtime-nodes.ts` (runtime extensions)

### Inline Nodes

For content within paragraphs/headings:

```typescript
type InlineNode =
  | TextNode        // Plain text
  | BoldNode        // **text**
  | ItalicNode      // *text*
  | InlineCodeNode  // `code`
  | LinkNode        // [text](url)
  | LineBreakNode;  // Line break
```

### Base Block Nodes

For standalone elements:

```typescript
type BaseBlockNode =
  | HeadingNode
  | ParagraphNode
  | ListNode
  | CodeBlockNode
  | BlockquoteNode
  | ThematicBreakNode
  | TableNode
  | XmlBlockNode
  | GroupNode
  | RawMarkdownNode
  | IndentNode
  | AssignNode
  | AssignGroupNode
  | OnStatusNode
  | ReadStateNode
  | WriteStateNode
  | ReadFilesNode
  | PromptTemplateNode
  | StepNode
  | ExecutionContextNode
  | SuccessCriteriaNode
  | OfferNextNode
  | MCPServerNode;
```

### Runtime Block Nodes

V3 additions for runtime features:

```typescript
type RuntimeBlockNode =
  | RuntimeVarDeclNode  // useRuntimeVar declaration
  | RuntimeCallNode     // <Fn.Call> invocation
  | IfNode              // Runtime conditional
  | ElseNode
  | LoopNode            // Bounded iteration
  | BreakNode
  | ReturnNode
  | AskUserNode         // User prompt
  | SpawnAgentNode;     // Agent spawning

type BlockNode = BaseBlockNode | RuntimeBlockNode;
```

## Document Nodes

### Command Document

```typescript
interface DocumentNode {
  kind: 'document';
  frontmatter?: FrontmatterNode;
  metadata?: DocumentMetadata;  // Build-time only (folder)
  runtimeVars: RuntimeVarDeclNode[];
  runtimeFunctions: string[];
  children: BlockNode[];
}
```

### Agent Document

```typescript
interface AgentDocumentNode {
  kind: 'agentDocument';
  frontmatter: AgentFrontmatterNode;  // Required
  children: BaseBlockNode[];  // No runtime nodes in agents
}

interface AgentFrontmatterNode {
  kind: 'agentFrontmatter';
  name: string;
  description: string;
  tools?: string;  // Space-separated, GSD format
  color?: string;
  inputType?: TypeReference;
  outputType?: TypeReference;
}
```

### Skill Document

```typescript
interface SkillDocumentNode {
  kind: 'skillDocument';
  frontmatter: SkillFrontmatterNode;
  children: BaseBlockNode[];
  files: SkillFileNode[];      // Additional generated files
  statics: SkillStaticNode[];  // Files to copy
}
```

## Emitter Architecture

### V1 Emitter

**File:** `src/emitter/emitter.ts`

Class-based with stack for list nesting:

```typescript
class MarkdownEmitter {
  private listStack: ListContext[] = [];

  emit(doc: DocumentNode): string { ... }
  emitAgent(doc: AgentDocumentNode): string { ... }
  emitSkill(doc: SkillDocumentNode): string { ... }

  private emitBlock(node: BlockNode): string {
    switch (node.kind) {
      case 'heading': return this.emitHeading(node);
      case 'list': return this.emitList(node);
      // ... exhaustive cases
      default: return assertNever(node);
    }
  }

  private emitList(node: ListNode): string {
    this.listStack.push({ ordered: node.ordered, index: node.start ?? 1 });
    const items = node.items.map(item => this.emitListItem(item));
    this.listStack.pop();
    return items.join('\n');
  }
}
```

### V3 Emitter

**File:** `src/emitter/runtime-markdown-emitter.ts`

Extends V1 patterns with runtime node handling:

```typescript
class RuntimeMarkdownEmitter {
  emit(doc: DocumentNode): string { ... }

  private emitBlock(node: BlockNode): string {
    switch (node.kind) {
      // V3-specific nodes
      case 'runtimeCall':
        return this.emitRuntimeCall(node);
      case 'if':
        return this.emitIf(node);
      case 'spawnAgent':
        return this.emitSpawnAgent(node);

      // Shared V1 nodes
      case 'heading':
      case 'paragraph':
        // ... same as V1
    }
  }

  private emitRuntimeCall(node: RuntimeCallNode): string {
    const argsJson = JSON.stringify(node.args);
    return `\`\`\`bash\n${node.outputVar}=$(node runtime.js ${node.fnName} '${argsJson}')\n\`\`\``;
  }

  private emitIf(node: IfNode): string {
    const condProse = conditionToProse(node.condition);
    return `**If ${condProse}:**\n\n${emitChildren(node.children)}`;
  }
}
```

### List Stack for Nesting

**File:** `src/emitter/emitter.ts`

Lists can nest arbitrarily deep. The emitter uses a stack to track nesting context:

```typescript
class MarkdownEmitter {
  private listStack: ListContext[] = [];

  private emitList(node: ListNode): string {
    // Push context for this list level
    this.listStack.push({
      ordered: node.ordered,
      index: node.start ?? 1
    });

    // Emit items (may recurse into nested lists)
    const items = node.items.map(item => this.emitListItem(item));

    // Pop when done with this level
    this.listStack.pop();

    return items.join('\n');
  }

  private emitListItem(item: ListItemNode): string {
    const current = this.listStack[this.listStack.length - 1];
    const marker = current.ordered ? `${current.index++}.` : '-';
    const indent = '  '.repeat(this.listStack.length - 1);
    // ... emit content with proper indentation
  }
}
```

The stack depth determines indentation: nested list items get `2 * depth` spaces prefix.

### Whitespace Handling

**File:** `src/parser/transformers/dispatch.ts`

JSX normalizes whitespace (collapses newlines to spaces), but markdown needs newlines preserved. The transformer extracts raw source text:

```typescript
function extractRawMarkdownText(node: Node): string | null {
  // Bypass JSX normalization - get raw text from source file
  const sourceFile = node.getSourceFile();
  const text = sourceFile.getFullText().slice(node.getStart(), node.getEnd());

  // Single-line: standard normalization
  if (!text.includes('\n')) {
    return text.replace(/\s+/g, ' ').trim();
  }

  // Multi-line: preserve newlines, dedent by common leading whitespace
  const lines = text.split('\n');
  // Find minimum indentation, strip it from all lines
  // Collapse 3+ blank lines to 2 (one visual blank)
  // ...
}
```

This ensures markdown content like:

```tsx
<XmlBlock name="example">
  First line.

  Second paragraph.
</XmlBlock>
```

Preserves the blank line between paragraphs.

### jq Expression Generation

V3 conditions compile to jq-based shell expressions:

```typescript
function toJqExpression(ref: RuntimeVarRefNode): string {
  const jqPath = ref.path.length === 0 ? '.' : '.' + ref.path.join('.');
  return `$(echo "$${ref.varName}" | jq -r '${jqPath}')`;
}

// Input:  { varName: 'CTX', path: ['user', 'name'] }
// Output: $(echo "$CTX" | jq -r '.user.name')
```

## Frontmatter Emission

### Command (YAML via gray-matter)

```typescript
private emitFrontmatter(node: FrontmatterNode): string {
  return matter.stringify('', node.data).trimEnd();
}
```

### Agent (GSD format, manual YAML)

Tools are space-separated, not arrays:

```typescript
private emitAgentFrontmatter(node: AgentFrontmatterNode): string {
  const lines = ['---', `name: ${node.name}`, `description: ${node.description}`];
  if (node.tools) lines.push(`tools: ${node.tools}`);
  if (node.color) lines.push(`color: ${node.color}`);
  lines.push('---');
  return lines.join('\n');
}
```

## Runtime Bundling

**File:** `src/emitter/esbuild-bundler.ts`

### Single-Entry Bundling

1. Generate entry point importing all namespaces
2. Bundle with esbuild (deduplicates shared code)
3. Wrap with CLI entry point

```typescript
async function bundleSingleEntryRuntime(options): Promise<SingleEntryBundleResult> {
  // 1. Generate entry: import * as ns from './file.runtime.js'
  const { content: entryContent, functions } = generateRuntimeEntryPoint(
    runtimeFiles, entryDirPath
  );

  // 2. Bundle with esbuild
  const result = await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    platform: 'node',
    format: 'esm',
    treeShaking: true,
  });

  // 3. Wrap with CLI
  return wrapWithCLI(result.outputFiles[0].text);
}
```

### Code-Split Bundling

For faster startup with many commands:

1. Generate entry per namespace
2. Bundle each namespace separately (parallel)
3. Generate dispatcher that loads on-demand

```typescript
// Dispatcher dynamically imports modules
const namespace = fnName.slice(0, underscoreIdx);
const mod = await import(`./${namespace}.js`);
const result = await mod[fn](args);
```

## Key Files

| File | Purpose |
|------|---------|
| `src/ir/nodes.ts` | Base IR node definitions |
| `src/ir/runtime-nodes.ts` | Runtime IR extensions |
| `src/emitter/emitter.ts` | V1 MarkdownEmitter |
| `src/emitter/runtime-markdown-emitter.ts` | V3 RuntimeMarkdownEmitter |
| `src/emitter/esbuild-bundler.ts` | Runtime bundling |
| `src/emitter/settings.ts` | MCP config emission (settings.json) |
