# TSX to Markdown Build Pipeline

This document explains how react-agentic transforms TSX source files into Claude Code-compatible markdown commands.

## Pipeline Overview

```
TSX Files → [Parser] → JSX AST → [Transformer] → IR Nodes → [Emitter] → Markdown
```

## Step-by-Step Process

### Entry & Configuration

- CLI command `build` is invoked via `node dist/cli/index.js build`
- Takes glob patterns for `.tsx` files (e.g., `src/app/**/*.tsx`)
- Output defaults to `.claude/commands/`
- **Goal:** Provide flexible file selection and output control
- **Advantage:** Single command builds entire project with customizable paths

### Phase 1: Parse TSX

- `ts-morph` initializes a TypeScript project with JSX preservation
- Each `.tsx` file is loaded and parsed into an AST
- `findRootJsxElement()` locates the JSX in the return statement
- **Goal:** Convert TSX source code into traversable syntax tree
- **Advantage:** Full TypeScript type-checking and IDE support during authoring

### Phase 2: Transform to IR (Intermediate Representation)

- Root `<Command>` component extracts props → `FrontmatterNode` (name, description, allowedTools)
- HTML elements map to IR nodes:
  - `h1-h6` → `HeadingNode`
  - `p` → `ParagraphNode`
  - `ul/ol/li` → `ListNode/ListItemNode`
  - `pre/code` → `CodeBlockNode`
  - `b/strong` → `BoldNode`, `i/em` → `ItalicNode`
  - `a` → `LinkNode`
- Special components like `<XmlBlock>` and `<Markdown>` have custom handling
- Children are recursively transformed
- **Goal:** Normalize JSX into a clean, format-agnostic structure
- **Advantage:** Decouples parsing from output—IR can emit to any format

### Phase 3: Emit Markdown

- `MarkdownEmitter` converts IR nodes to markdown strings
- Frontmatter emits as YAML block with `---` delimiters (via `gray-matter`)
- Headings emit with `#` prefix based on level
- Lists track nesting state via stack for proper indentation
- Code blocks emit with triple backticks + language
- All blocks joined with double newlines
- **Goal:** Produce valid, well-formatted markdown from IR
- **Advantage:** Consistent output formatting with proper nesting and spacing

### Phase 4: Write Output

- Output directory created if missing
- Each markdown file written to disk
- Build tree displayed with file sizes
- **Goal:** Persist generated markdown to file system
- **Advantage:** Ready-to-use Claude Code commands with visual build feedback

### Watch Mode (optional)

- `chokidar` monitors file changes
- On change: re-parses affected files and rebuilds
- **Goal:** Enable fast iterative development
- **Advantage:** Instant feedback loop without manual rebuild

## Transformation Examples

These examples show how each element flows through the pipeline: **TSX → IR → Markdown**

### Heading

```
<h2>Title</h2>
    ↓
HeadingNode { kind: 'heading', level: 2, children: [TextNode('Title')] }
    ↓
## Title
```

### Paragraph with Formatting

```
<p>This is <strong>bold</strong> and <code>inline code</code></p>
    ↓
ParagraphNode {
  kind: 'paragraph',
  children: [
    TextNode('This is '),
    BoldNode { children: [TextNode('bold')] },
    TextNode(' and '),
    InlineCodeNode { value: 'inline code' }
  ]
}
    ↓
This is **bold** and `inline code`
```

### Unordered List

```
<ul>
  <li>First item</li>
  <li>Second item</li>
</ul>
    ↓
ListNode {
  kind: 'list',
  ordered: false,
  items: [
    ListItemNode { children: [ParagraphNode(...)] },
    ListItemNode { children: [ParagraphNode(...)] }
  ]
}
    ↓
- First item
- Second item
```

### Code Block

```
<pre><code className="language-typescript">const x = 1;</code></pre>
    ↓
CodeBlockNode { kind: 'codeBlock', language: 'typescript', content: 'const x = 1;' }
    ↓
```typescript
const x = 1;
```‎
```

### Command with Frontmatter

```
<Command name="my-cmd" description="Does something" allowedTools={['Bash']}>
  <h2>Instructions</h2>
</Command>
    ↓
DocumentNode {
  kind: 'document',
  frontmatter: FrontmatterNode {
    data: { name: 'my-cmd', description: 'Does something', 'allowed-tools': ['Bash'] }
  },
  children: [HeadingNode { level: 2, children: [TextNode('Instructions')] }]
}
    ↓
---
name: my-cmd
description: Does something
allowed-tools:
  - Bash
---

## Instructions
```

### Link

```
<a href="https://example.com">Click here</a>
    ↓
LinkNode { kind: 'link', url: 'https://example.com', children: [TextNode('Click here')] }
    ↓
[Click here](https://example.com)
```

### XmlBlock (Claude-specific)

```
<XmlBlock name="example">
  <p>Sample content</p>
</XmlBlock>
    ↓
XmlBlockNode {
  kind: 'xmlBlock',
  name: 'example',
  children: [ParagraphNode { children: [TextNode('Sample content')] }]
}
    ↓
<example>
Sample content
</example>
```

## Key Source Files

| File | Purpose |
|------|---------|
| `src/cli/commands/build.ts` | Build orchestration |
| `src/parser/parser.ts` | TSX parsing utilities |
| `src/parser/transformer.ts` | JSX AST → IR transformation |
| `src/ir/nodes.ts` | IR node type definitions |
| `src/emitter/emitter.ts` | IR → Markdown emission |
| `src/cli/watcher.ts` | File watch mode |
| `src/cli/errors.ts` | Error formatting |

## Dependencies

- **ts-morph**: TypeScript AST parsing and manipulation
- **gray-matter**: YAML frontmatter parsing/serialization
- **globby**: File glob pattern matching
- **commander**: CLI argument parsing
- **chokidar**: File system watching
- **picocolors**: Colored terminal output
