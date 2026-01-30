# Architecture Research: Agent Framework Integration

**Domain:** TSX-to-Markdown Transpiler - Agent Extension
**Researched:** 2026-01-21
**Overall Confidence:** HIGH (builds on established v1.0 architecture patterns)

## Executive Summary

The Agent framework extends the existing transpiler architecture with two new component types: `<Agent>` for defining agents and `<SpawnAgent>` for invoking them from Commands. The key architectural insight is that these components require **type extraction during the parse phase** to enforce contracts at compile time, while emitting to **different output directories** (agents to `.claude/agents/`, commands to `.claude/commands/`).

The existing discriminated union IR system extends naturally with new node types. The main complexity lies in **interface extraction** from TypeScript types and **cross-file type validation** when a Command imports an Agent's interface.

---

## Integration with Existing Architecture

### Current Pipeline (v1.0)

```
TSX Source
    |
    v
[Parser: ts-morph] --> JsxElement AST
    |
    v
[Transformer] --> IR Nodes (DocumentNode with BlockNode children)
    |
    v
[Emitter] --> Markdown string
    |
    v
[CLI: build.ts] --> .claude/commands/*.md
```

### Extended Pipeline (v1.1)

```
TSX Source (Command OR Agent)
    |
    v
[Parser: ts-morph] --> JsxElement AST + TypeScript type information
    |
    +-- [Type Extractor] --> Interface definitions (for Agents)
    |
    v
[Transformer] --> IR Nodes (DocumentNode | AgentDocumentNode)
    |              |
    |              +-- AgentNode (with interface, structured_returns)
    |              +-- SpawnAgentNode (with type reference)
    |
    v
[Emitter] --> Markdown string (Command format OR Agent format)
    |
    v
[CLI: build.ts] --> Route by type:
                    - Command --> .claude/commands/*.md
                    - Agent   --> .claude/agents/*.md
```

---

## New IR Nodes Required

### 1. AgentDocumentNode

Parallel to `DocumentNode` but for agents. Agents have different frontmatter structure.

```typescript
/**
 * Agent document root node
 * Distinct from DocumentNode to enforce agent-specific structure
 */
export interface AgentDocumentNode {
  kind: 'agentDocument';
  frontmatter: AgentFrontmatterNode;
  children: BlockNode[];  // Agent system prompt content
}

export interface AgentFrontmatterNode {
  kind: 'agentFrontmatter';
  data: {
    name: string;
    description: string;
    model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
    tools?: string[];
    disallowedTools?: string[];
    permissionMode?: 'default' | 'acceptEdits' | 'dontAsk' | 'bypassPermissions' | 'plan';
  };
}
```

**Rationale:** Separating from `DocumentNode` enforces that Commands and Agents have different required fields. The emitter can then produce the correct format for each.

### 2. SpawnAgentNode

For `<SpawnAgent>` usage inside Commands.

```typescript
/**
 * SpawnAgent invocation within a Command
 * Emits as Task() tool call documentation
 */
export interface SpawnAgentNode {
  kind: 'spawnAgent';
  agentName: string;          // Reference to agent file
  inputType?: TypeReference;  // TypeScript type for input validation
  children: BlockNode[];      // Spawn instructions/context
}

export interface TypeReference {
  name: string;               // Interface name (e.g., 'ResearchInput')
  importPath: string;         // Where it's imported from
  properties: PropertyDef[];  // Extracted interface shape
}

export interface PropertyDef {
  name: string;
  type: string;               // TypeScript type as string
  optional: boolean;
  description?: string;       // From JSDoc comment
}
```

**Rationale:** `SpawnAgentNode` captures the relationship between a Command and Agent. The `TypeReference` enables type extraction for documentation and compile-time validation.

### 3. StructuredReturnNode

For Agent's expected return format.

```typescript
/**
 * Structured return format definition
 * Used in Agent's <output> section
 */
export interface StructuredReturnNode {
  kind: 'structuredReturn';
  format: 'markdown' | 'xml';
  template: string;           // Expected structure as template
  properties?: PropertyDef[]; // Type-extracted fields
}
```

---

## Component Boundaries

### Parser Layer Changes

**New Files:**
- `src/parser/type-extractor.ts` - Extract TypeScript interface definitions

**Modified Files:**
- `src/parser/parser.ts` - Add `extractTypeInterface()` function

```typescript
// type-extractor.ts
import { SourceFile, InterfaceDeclaration, TypeAliasDeclaration } from 'ts-morph';

export interface ExtractedInterface {
  name: string;
  properties: PropertyDef[];
  sourceFile: string;
}

/**
 * Extract interface definition from source file
 * Handles both `interface Foo {}` and `type Foo = {}`
 */
export function extractInterface(
  sourceFile: SourceFile,
  interfaceName: string
): ExtractedInterface | null {
  // Look for interface declaration
  const interfaceDecl = sourceFile.getInterface(interfaceName);
  if (interfaceDecl) {
    return extractFromInterface(interfaceDecl);
  }

  // Look for type alias
  const typeAlias = sourceFile.getTypeAlias(interfaceName);
  if (typeAlias) {
    return extractFromTypeAlias(typeAlias);
  }

  return null;
}

function extractFromInterface(decl: InterfaceDeclaration): ExtractedInterface {
  return {
    name: decl.getName(),
    properties: decl.getProperties().map(prop => ({
      name: prop.getName(),
      type: prop.getType().getText(),
      optional: prop.hasQuestionToken(),
      description: getJsDocDescription(prop),
    })),
    sourceFile: decl.getSourceFile().getFilePath(),
  };
}
```

### Transformer Layer Changes

**New in transformer.ts:**

```typescript
// Add to SPECIAL_COMPONENTS set
const SPECIAL_COMPONENTS = new Set([
  'Command', 'Markdown', 'XmlBlock',
  'Agent', 'SpawnAgent'  // NEW
]);

// New transformation methods
private transformAgent(node: JsxElement | JsxSelfClosingElement): AgentDocumentNode {
  const openingElement = Node.isJsxElement(node) ? node.getOpeningElement() : node;
  const props = this.mergeProps(openingElement);

  // Required props
  const name = props.name as string;
  const description = props.description as string;

  if (!name) throw this.createError('Agent requires name prop', openingElement);
  if (!description) throw this.createError('Agent requires description prop', openingElement);

  // Optional props with Claude Code agent defaults
  const model = props.model as string | undefined;
  const tools = props.tools as string[] | undefined;

  // Build frontmatter
  const frontmatter: AgentFrontmatterNode = {
    kind: 'agentFrontmatter',
    data: { name, description, model, tools },
  };

  // Transform children as agent system prompt
  const children = this.transformAgentChildren(node);

  return { kind: 'agentDocument', frontmatter, children };
}

private transformSpawnAgent(node: JsxElement | JsxSelfClosingElement): SpawnAgentNode {
  const openingElement = Node.isJsxElement(node) ? node.getOpeningElement() : node;

  const agentName = getAttributeValue(openingElement, 'agent');
  if (!agentName) {
    throw this.createError('SpawnAgent requires agent prop', openingElement);
  }

  // Extract input type if specified
  const inputType = this.extractInputType(openingElement);

  // Children become spawn context/instructions
  const children: BlockNode[] = [];
  if (Node.isJsxElement(node)) {
    for (const child of node.getJsxChildren()) {
      const block = this.transformToBlock(child);
      if (block) children.push(block);
    }
  }

  return { kind: 'spawnAgent', agentName, inputType, children };
}
```

### Emitter Layer Changes

**New in emitter.ts:**

```typescript
// Add to emitBlock switch
case 'spawnAgent':
  return this.emitSpawnAgent(node);

// New emitter methods
private emitSpawnAgent(node: SpawnAgentNode): string {
  const parts: string[] = [];

  // Emit as Task() invocation documentation
  parts.push(`Use the **${node.agentName}** agent with Task tool:`);
  parts.push('');
  parts.push('```');
  parts.push(`Task(${node.agentName})`);
  parts.push('```');

  // If input type defined, document expected input
  if (node.inputType) {
    parts.push('');
    parts.push('**Input:**');
    parts.push('');
    for (const prop of node.inputType.properties) {
      const optMarker = prop.optional ? '(optional) ' : '';
      parts.push(`- \`${prop.name}\`: ${optMarker}${prop.type}`);
      if (prop.description) {
        parts.push(`  ${prop.description}`);
      }
    }
  }

  // Emit children as context
  if (node.children.length > 0) {
    parts.push('');
    for (const child of node.children) {
      parts.push(this.emitBlock(child));
    }
  }

  return parts.join('\n');
}

/**
 * Emit AgentDocumentNode to Claude Code agent format
 */
emitAgent(doc: AgentDocumentNode): string {
  const parts: string[] = [];

  // Agent frontmatter
  parts.push(this.emitAgentFrontmatter(doc.frontmatter));

  // System prompt content
  for (const child of doc.children) {
    parts.push(this.emitBlock(child));
  }

  return parts.join('\n\n') + '\n';
}

private emitAgentFrontmatter(node: AgentFrontmatterNode): string {
  const data: Record<string, unknown> = {
    name: node.data.name,
    description: node.data.description,
  };

  // Only include optional fields if specified
  if (node.data.model) data.model = node.data.model;
  if (node.data.tools) data.tools = node.data.tools.join(', ');
  if (node.data.disallowedTools) data.disallowedTools = node.data.disallowedTools.join(', ');
  if (node.data.permissionMode) data.permissionMode = node.data.permissionMode;

  return matter.stringify('', data).trimEnd();
}
```

### CLI Layer Changes

**Modified build.ts:**

```typescript
interface BuildResult {
  inputFile: string;
  outputPath: string;
  content: string;
  size: number;
  type: 'command' | 'agent';  // NEW: track output type
}

async function runBuild(...) {
  for (const inputFile of tsxFiles) {
    // Parse and find root
    const sourceFile = project.addSourceFileAtPath(inputFile);
    const root = findRootJsxElement(sourceFile);

    // Detect type from root element
    const rootName = getElementName(root);
    const isAgent = rootName === 'Agent';

    // Transform (returns DocumentNode or AgentDocumentNode)
    const doc = transform(root, sourceFile);

    // Emit with appropriate method
    const markdown = isAgent
      ? emitter.emitAgent(doc as AgentDocumentNode)
      : emitter.emit(doc as DocumentNode);

    // Route to correct output directory
    const basename = path.basename(inputFile, '.tsx');
    const outputDir = isAgent ? '.claude/agents' : options.out;
    const outputPath = path.join(outputDir, `${basename}.md`);

    results.push({
      inputFile,
      outputPath,
      content: markdown,
      size: Buffer.byteLength(markdown, 'utf8'),
      type: isAgent ? 'agent' : 'command',
    });
  }
}
```

---

## Data Flow for Type Extraction

### Agent Definition (owns the contract)

```
// agents/researcher.tsx
interface ResearchInput {
  /** What to research */
  topic: string;
  /** Optional focus areas */
  areas?: string[];
}

interface ResearchOutput {
  /** Summary of findings */
  summary: string;
  /** Sources consulted */
  sources: string[];
}

export { ResearchInput, ResearchOutput };

export default function Researcher() {
  return (
    <Agent
      name="researcher"
      description="Research a topic and return findings"
      model="sonnet"
      tools={['WebSearch', 'WebFetch', 'Read', 'Grep']}
      inputType={ResearchInput}     // Type reference
      outputType={ResearchOutput}   // Type reference
    >
      <h2>Role</h2>
      <p>You are a research agent that investigates topics thoroughly.</p>

      <XmlBlock name="input_format">
        <p>You receive input as:</p>
        <pre><code>{`{ topic: string, areas?: string[] }`}</code></pre>
      </XmlBlock>

      <XmlBlock name="output_format">
        <p>You must return:</p>
        <pre><code>{`{ summary: string, sources: string[] }`}</code></pre>
      </XmlBlock>
    </Agent>
  );
}
```

### Command Usage (imports the contract)

```
// commands/analyze.tsx
import { ResearchInput } from '../agents/researcher';

export default function AnalyzeCommand() {
  return (
    <Command name="analyze" description="Analyze a codebase">
      <h2>Steps</h2>
      <ol>
        <li>Read the codebase structure</li>
        <li>
          <SpawnAgent
            agent="researcher"
            input={ResearchInput}  // Type validation at compile time
          >
            <p>Research best practices for this type of codebase.</p>
          </SpawnAgent>
        </li>
        <li>Generate analysis report</li>
      </ol>
    </Command>
  );
}
```

### Compile-Time Validation Flow

```
1. Parse Command file
   |
   v
2. Find SpawnAgent with input={ResearchInput}
   |
   v
3. Resolve import: '../agents/researcher'
   |
   v
4. Extract ResearchInput interface from agent file
   |
   v
5. Store type reference in SpawnAgentNode
   |
   v
6. Emit includes type documentation in markdown
```

---

## Output Format Comparison

### Command Output (.claude/commands/analyze.md)

```markdown
---
name: analyze
description: Analyze a codebase
---

## Steps

1. Read the codebase structure
2. Use the **researcher** agent with Task tool:

```
Task(researcher)
```

**Input:**

- `topic`: string - What to research
- `areas`: (optional) string[] - Optional focus areas

Research best practices for this type of codebase.

3. Generate analysis report
```

### Agent Output (.claude/agents/researcher.md)

```markdown
---
name: researcher
description: Research a topic and return findings
model: sonnet
tools: WebSearch, WebFetch, Read, Grep
---

## Role

You are a research agent that investigates topics thoroughly.

<input_format>
You receive input as:

```
{ topic: string, areas?: string[] }
```
</input_format>

<output_format>
You must return:

```
{ summary: string, sources: string[] }
```
</output_format>
```

---

## Build Order Recommendation

Based on dependency analysis:

### Phase 1: IR Extensions (Foundation)

**Build order:**
1. Add `AgentFrontmatterNode` and `AgentDocumentNode` to `nodes.ts`
2. Add `SpawnAgentNode` and `TypeReference` to `nodes.ts`
3. Update `IRNode` union type
4. Add `assertNever` cases

**Deliverable:** Extended type system compiles.

### Phase 2: Basic Agent Transpilation

**Build order:**
1. Add `Agent` to `SPECIAL_COMPONENTS` in transformer
2. Implement `transformAgent()` method
3. Implement `emitAgent()` and `emitAgentFrontmatter()` in emitter
4. Update CLI for agent routing

**Deliverable:** Can transpile `<Agent>` to `.claude/agents/*.md`

### Phase 3: SpawnAgent Component

**Build order:**
1. Add `SpawnAgent` to transformer
2. Implement `transformSpawnAgent()` method
3. Implement `emitSpawnAgent()` in emitter

**Deliverable:** Commands can include `<SpawnAgent>` references

### Phase 4: Type Extraction

**Build order:**
1. Create `type-extractor.ts` with interface extraction
2. Wire type extraction into `transformSpawnAgent()`
3. Emit type documentation in SpawnAgent output

**Deliverable:** Full type-safe agent framework

### Phase 5: Cross-File Validation

**Build order:**
1. Validate agent exists when SpawnAgent references it
2. Validate imported type matches agent's expected input
3. Clear error messages for type mismatches

**Deliverable:** Compile-time contract enforcement

---

## JSX Component Type Stubs

**New in jsx.ts:**

```typescript
/**
 * Props for the Agent component
 */
export interface AgentProps {
  /** Agent name (used in frontmatter and Task() calls) */
  name: string;
  /** When Claude should delegate to this agent */
  description: string;
  /** Model to use: sonnet, opus, haiku, or inherit */
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
  /** Tools the agent can access (comma-separated or array) */
  tools?: string[];
  /** Tools to explicitly deny */
  disallowedTools?: string[];
  /** Permission handling mode */
  permissionMode?: 'default' | 'acceptEdits' | 'dontAsk' | 'bypassPermissions' | 'plan';
  /** Agent system prompt content */
  children?: ReactNode;
}

/**
 * Props for the SpawnAgent component
 */
export interface SpawnAgentProps {
  /** Name of agent to spawn (must exist in .claude/agents/) */
  agent: string;
  /** TypeScript type for input validation (optional) */
  input?: unknown;
  /** Context/instructions for the agent */
  children?: ReactNode;
}

/**
 * Agent component - creates a Claude Code agent definition
 */
export function Agent(_props: AgentProps): null {
  return null;
}

/**
 * SpawnAgent component - invokes an agent from a command
 */
export function SpawnAgent(_props: SpawnAgentProps): null {
  return null;
}
```

---

## Risk Areas

### High Risk: Type Extraction Complexity

**What could go wrong:** TypeScript types can be arbitrarily complex (generics, mapped types, conditional types). Full extraction is non-trivial.

**Mitigation:** Limit supported types to:
- Simple interfaces with primitive properties
- Optional properties
- Array types
- Reject complex types with clear error

### Medium Risk: Cross-File Resolution

**What could go wrong:** Resolving types across files requires accurate module resolution.

**Mitigation:** Leverage ts-morph's existing `importDecl.getModuleSpecifierSourceFile()` which already handles this in v1.0.

### Low Risk: Output Directory Routing

**What could go wrong:** Agent files going to wrong directory.

**Mitigation:** Single check based on root element name. Already have pattern from Command detection.

---

## Sources

**HIGH Confidence:**
- [Claude Code Subagent Documentation](https://code.claude.com/docs/en/sub-agents) - Official agent format
- [ts-morph Documentation](https://ts-morph.com/) - Type extraction APIs
- Existing v1.0 codebase (`transformer.ts`, `emitter.ts`, `nodes.ts`)

**MEDIUM Confidence:**
- [GSD Framework GitHub](https://github.com/glittercowboy/get-shit-done) - Task() pattern inspiration
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)

**LOW Confidence:**
- Community patterns for agent orchestration (multiple blog sources)
