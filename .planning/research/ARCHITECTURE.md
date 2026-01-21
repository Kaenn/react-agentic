# Architecture Research

**Domain:** TSX-to-Markdown Transpiler
**Researched:** 2026-01-20
**Overall Confidence:** HIGH (based on established compiler/transpiler patterns)

## Executive Summary

TSX-to-Markdown transpilers follow the classic three-phase compiler architecture: **Parse → Transform → Generate**. The key insight is that working through an intermediate representation (AST) enables testable, maintainable code rather than direct string manipulation. Using ts-morph as the TypeScript AST library is the right choice - it wraps the TypeScript Compiler API and provides clean traversal methods.

---

## Components

### 1. Parser Layer (ts-morph)

**Responsibility:** Convert TSX source files into traversable AST nodes.

**Key Classes/Functions:**
- `Project` - ts-morph entry point, manages source files
- `SourceFile` - represents a single .tsx file
- `JsxElement`, `JsxSelfClosingElement` - JSX node types
- `JsxAttribute`, `JsxSpreadAttribute` - attribute handling

**What It Produces:**
```
TSX Source → SourceFile → JsxElement tree with attributes and children
```

**Build Complexity:** LOW - ts-morph handles all parsing. Just configure and call.

---

### 2. AST Transformer Layer

**Responsibility:** Walk the JSX AST and convert nodes to an intermediate markdown-oriented representation.

**Key Patterns:**
- **Visitor Pattern** via `forEachDescendant()` with traversal control
- **Node Type Switch** - different handlers for different JSX node kinds
- **Context Object** - tracks state during traversal (indentation, parent info)

**Node Type Mapping:**

| JSX Node Type | Handler | Output IR |
|---------------|---------|-----------|
| `Command` component | `visitCommand()` | FrontmatterNode + children |
| `h1`-`h6` elements | `visitHeading()` | HeadingNode |
| `p`, text content | `visitParagraph()` | ParagraphNode |
| `ul`, `ol`, `li` | `visitList()` | ListNode |
| `b`, `strong` | `visitBold()` | BoldNode |
| `i`, `em` | `visitItalic()` | ItalicNode |
| `code` | `visitCode()` | CodeNode |
| `a` | `visitLink()` | LinkNode |
| `div[name]` | `visitNamedBlock()` | XmlBlockNode |
| `Markdown` | `visitMarkdown()` | RawMarkdownNode |
| `br` | `visitBreak()` | LineBreakNode |

**Intermediate Representation (IR):**
```typescript
// Base node type
interface IRNode {
  kind: string;
  children?: IRNode[];
}

// Specific node types
interface FrontmatterNode extends IRNode {
  kind: 'frontmatter';
  fields: Record<string, unknown>;  // name, description, allowedTools, etc.
}

interface HeadingNode extends IRNode {
  kind: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  content: IRNode[];
}

interface XmlBlockNode extends IRNode {
  kind: 'xml-block';
  name: string;
  children: IRNode[];
}

interface RawMarkdownNode extends IRNode {
  kind: 'raw';
  content: string;
}
```

**Build Complexity:** MEDIUM - core transpiler logic lives here.

---

### 3. Code Generator / Emitter Layer

**Responsibility:** Walk the IR tree and emit markdown strings.

**Key Patterns:**
- **Tree-Walking Emitter** - recursive traversal emitting strings
- **Builder Pattern** - accumulate output with proper formatting
- **Context for Indentation** - track nesting level for lists, blocks

**Emitter Structure:**
```typescript
class MarkdownEmitter {
  private output: string[] = [];
  private indent: number = 0;

  emit(node: IRNode): string {
    switch (node.kind) {
      case 'frontmatter': return this.emitFrontmatter(node);
      case 'heading': return this.emitHeading(node);
      case 'xml-block': return this.emitXmlBlock(node);
      case 'raw': return this.emitRaw(node);
      // ... other handlers
    }
  }
}
```

**Build Complexity:** MEDIUM - straightforward but many cases to handle.

---

### 4. Frontmatter Generator

**Responsibility:** Convert Command component props to YAML frontmatter.

**Input:** Props from Command JSX element
**Output:** YAML string with `---` delimiters

**Mapping:**
```
Command props → YAML fields
  name → name
  description → description
  allowedTools → allowed-tools (array)
  [custom props] → [custom fields]
```

**Build Complexity:** LOW - simple prop-to-YAML conversion.

---

### 5. CLI Interface

**Responsibility:** User-facing command interface with watch mode.

**Key Features:**
- Single file transpilation: `tsx2md input.tsx output.md`
- Directory transpilation: `tsx2md src/ dist/`
- Watch mode: `tsx2md --watch src/`
- Configuration file support (optional)

**Key Dependencies:**
- `commander` or `yargs` - CLI argument parsing
- `chokidar` - file watching (battle-tested, used by webpack/gulp)
- `glob` - file pattern matching

**Build Complexity:** LOW - standard CLI patterns.

---

### 6. File Orchestrator

**Responsibility:** Coordinate file discovery, transpilation, and output.

**Responsibilities:**
- Discover input files (glob patterns)
- Route files to transpiler
- Write output files
- Handle watch mode events

**Build Complexity:** LOW - coordination logic only.

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLI INTERFACE                               │
│  tsx2md [options] <input> [output]                                  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       FILE ORCHESTRATOR                              │
│  • Glob patterns → file list                                        │
│  • Watch mode (chokidar)                                            │
│  • Output path resolution                                           │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TRANSPILER PIPELINE                               │
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   PARSER     │    │ TRANSFORMER  │    │   EMITTER    │          │
│  │  (ts-morph)  │───▶│  (Visitor)   │───▶│  (Builder)   │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│         │                   │                   │                   │
│         ▼                   ▼                   ▼                   │
│      TSX AST          IR Tree            Markdown String            │
│                                                                      │
│  Input:                                                             │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │ <Command name="foo" description="...">                   │       │
│  │   <h2>Section</h2>                                       │       │
│  │   <p>Content</p>                                         │       │
│  │ </Command>                                               │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                      │
│  IR:                                                                 │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │ FrontmatterNode { name: "foo", description: "..." }      │       │
│  │ └─ HeadingNode { level: 2, content: "Section" }          │       │
│  │ └─ ParagraphNode { content: "Content" }                  │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                      │
│  Output:                                                            │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │ ---                                                      │       │
│  │ name: foo                                                │       │
│  │ description: ...                                         │       │
│  │ ---                                                      │       │
│  │                                                          │       │
│  │ ## Section                                               │       │
│  │                                                          │       │
│  │ Content                                                  │       │
│  └─────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

### Detailed Transform Flow

```
1. PARSE PHASE
   SourceFile.tsx
        │
        ▼ ts-morph Project.addSourceFilesAtPaths()
        │
   SourceFile node
        │
        ▼ sourceFile.getFirstDescendantByKind(SyntaxKind.JsxElement)
        │
   JsxElement (Command)
        │
        ├─▶ openingElement.getTagNameNode().getText() → "Command"
        ├─▶ openingElement.getAttributes() → props
        └─▶ getJsxChildren() → child JSX nodes

2. TRANSFORM PHASE
   JsxElement (Command)
        │
        ▼ visitCommand()
        │
        ├─▶ extractProps() → { name, description, allowedTools }
        │         │
        │         ▼
        │   FrontmatterNode
        │
        └─▶ forEachDescendant() with visitor
                  │
                  ├─▶ visitHeading(h2) → HeadingNode
                  ├─▶ visitParagraph(p) → ParagraphNode
                  ├─▶ visitList(ul) → ListNode
                  └─▶ ...etc

   Output: IRNode tree

3. EMIT PHASE
   IRNode tree
        │
        ▼ emitter.emit(rootNode)
        │
        ├─▶ emitFrontmatter() → "---\nname: ...\n---"
        ├─▶ emitHeading() → "## Section"
        ├─▶ emitParagraph() → "Content"
        └─▶ emitXmlBlock() → "<name>\n...\n</name>"

   Output: Markdown string
```

---

## Suggested Build Order

Based on dependency analysis and testability, build in this order:

### Phase 1: Core Pipeline (Foundation)

**Build order within phase:**
1. **IR Types** - Define all intermediate representation node types
2. **Emitter** - Build markdown emitter that works with IR nodes
3. **Basic Transformer** - Handle minimal JSX → IR conversion
4. **Integration** - Wire parser → transformer → emitter

**Rationale:** You can test the emitter in isolation with hand-crafted IR nodes. Then test transformer independently. Integration is last.

**Deliverable:** Can transpile simple TSX with `<h1>`, `<p>`, `<br>` to markdown.

### Phase 2: Element Coverage

**Build order within phase:**
1. **Frontmatter** - Command props → YAML
2. **Text formatting** - `<b>`, `<i>`, `<code>`, `<a>`
3. **Lists** - `<ul>`, `<ol>`, `<li>` with nesting
4. **Named blocks** - `<div name="...">` → XML blocks
5. **Raw passthrough** - `<Markdown>` component

**Rationale:** Each element type can be developed and tested independently. Frontmatter is first because it's the primary differentiator.

**Deliverable:** Full element coverage for the example TSX file.

### Phase 3: CLI + Watch

**Build order within phase:**
1. **Basic CLI** - Single file transpilation
2. **Directory mode** - Glob patterns, multiple files
3. **Watch mode** - chokidar integration
4. **Error handling** - Source location in errors

**Rationale:** CLI is independent of transpiler internals. Build after core works.

**Deliverable:** Usable CLI tool with watch mode.

### Phase 4: Advanced Features

**Build order within phase:**
1. **Component composition** - Handle nested custom components
2. **Props spreading** - `{...props}` support
3. **Source maps** (optional) - Error tracing to original TSX
4. **Configuration** - tsconfig-style config file

**Rationale:** These are enhancements. Core functionality must work first.

**Deliverable:** Production-ready transpiler.

---

## Integration Points

### Parser ↔ Transformer

**Interface:** ts-morph `Node` types

```typescript
interface TransformContext {
  sourceFile: SourceFile;
  project: Project;
}

function transform(ctx: TransformContext, root: JsxElement): IRNode {
  // Entry point for transformation
}
```

**Key ts-morph APIs Used:**
- `node.getKind()` - identify node type
- `node.forEachDescendant()` - traverse with control
- `jsxElement.getJsxChildren()` - get children
- `jsxAttribute.getName()`, `.getInitializer()` - extract props

### Transformer ↔ Emitter

**Interface:** IR node types

```typescript
interface EmitterOptions {
  indentSize?: number;
  lineEnding?: '\n' | '\r\n';
}

function emit(node: IRNode, options?: EmitterOptions): string {
  // Entry point for emission
}
```

**Contract:** Emitter must handle all IR node kinds. Unknown kinds throw.

### CLI ↔ File Orchestrator

**Interface:** File operations

```typescript
interface TranspileOptions {
  watch?: boolean;
  outDir?: string;
}

interface TranspileResult {
  inputPath: string;
  outputPath: string;
  success: boolean;
  error?: Error;
}

async function transpile(
  patterns: string[],
  options: TranspileOptions
): AsyncIterable<TranspileResult>;
```

### Watch Mode ↔ Transpiler

**Interface:** Event-driven

```typescript
// chokidar events trigger re-transpilation
watcher.on('change', async (path) => {
  const result = await transpileFile(path);
  console.log(`Transpiled: ${result.outputPath}`);
});
```

---

## Architecture Anti-Patterns to Avoid

### 1. Direct String Manipulation in Transformer

**Bad:**
```typescript
function transformElement(node: JsxElement): string {
  if (node.getName() === 'h1') {
    return '# ' + getTextContent(node);  // Direct string output
  }
}
```

**Good:**
```typescript
function transformElement(node: JsxElement): IRNode {
  if (node.getName() === 'h1') {
    return { kind: 'heading', level: 1, content: transformChildren(node) };
  }
}
```

**Why:** Intermediate representation enables testing, reuse, and future output formats.

### 2. Monolithic Visitor Function

**Bad:**
```typescript
function visit(node: Node) {
  // 500 lines of switch cases
}
```

**Good:**
```typescript
const visitors: Record<string, Visitor> = {
  h1: visitHeading,
  h2: visitHeading,
  p: visitParagraph,
  // ...
};

function visit(node: Node) {
  const visitor = visitors[getTagName(node)];
  return visitor ? visitor(node) : visitDefault(node);
}
```

**Why:** Individual visitors can be tested and modified independently.

### 3. Tight Coupling to ts-morph Types in Emitter

**Bad:**
```typescript
function emit(node: JsxElement): string {
  // Emitter directly uses ts-morph types
}
```

**Good:**
```typescript
function emit(node: IRNode): string {
  // Emitter only knows about IR types
}
```

**Why:** Emitter should be format-agnostic. Could emit HTML, MDX, or other formats from same IR.

---

## Technology Decisions

### ts-morph for Parsing

**Chosen because:**
- Wraps TypeScript Compiler API cleanly
- `forEachDescendant()` with traversal control is perfect for visitors
- JSX support is first-class
- Active maintenance (latest release Oct 2025)
- 5.7K+ GitHub stars, battle-tested

**Alternative considered:** Direct TypeScript Compiler API
**Why not:** Much more verbose, ts-morph provides better DX

### chokidar for Watch Mode

**Chosen because:**
- Industry standard (used by webpack, gulp, karma, etc.)
- Handles cross-platform edge cases
- Minimal CPU usage (uses native fs.watch)
- v5 released Nov 2025, actively maintained

**Alternative considered:** Native fs.watch
**Why not:** Platform inconsistencies, edge cases

### String Concatenation for Emitter

**Chosen because:**
- Simple, fast, predictable
- No template compilation overhead
- Easy to debug output issues

**Alternative considered:** Template literals / template engine
**Why not:** Overkill for markdown generation

---

## Scalability Considerations

| Concern | Current Approach | At Scale |
|---------|------------------|----------|
| Large files | Single-pass transform | Same (AST in memory) |
| Many files | Sequential processing | Parallel with worker threads |
| Complex nesting | Recursive visitor | Stack depth limit (~1000) |
| Watch mode | File-by-file rebuild | Incremental (cache IR) |

**Note:** For a Claude Code command transpiler, scale is not a concern. 100s of files max.

---

## Sources

**HIGH Confidence (Official Documentation):**
- [ts-morph Official Documentation](https://ts-morph.com/)
- [ts-morph Navigation Guide](https://ts-morph.com/navigation/)
- [TypeScript JSX Documentation](https://www.typescriptlang.org/docs/handbook/jsx.html)
- [chokidar GitHub](https://github.com/paulmillr/chokidar)

**MEDIUM Confidence (Verified Guides):**
- [How to Write a Transpiler - Strumenta](https://tomassetti.me/how-to-write-a-transpiler/)
- [ts-morph JsxElement Source](https://github.com/dsherret/ts-morph/blob/latest/packages/ts-morph/src/compiler/ast/jsx/JsxElement.ts)
- [jsx-md GitHub](https://github.com/dbartholomae/jsx-md)
- [TypeScript Compiler JSX Transform](https://github.com/microsoft/TypeScript/blob/main/src/compiler/transformers/jsx.ts)

**LOW Confidence (Community Sources):**
- [Crafting Interpreters - Representing Code](https://craftinginterpreters.com/representing-code.html)
- Various compiler design academic resources
