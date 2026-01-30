# react-agentic Grammar Specification

This document provides a formal grammar specification for all valid JSX elements in react-agentic, their props, nesting rules, and version availability.

## Table of Contents

- [Document Roots](#document-roots)
- [External Components](#external-components)
- [Block Elements](#block-elements)
- [Inline Elements](#inline-elements)
- [Component Reference](#component-reference)
- [Nesting Rules](#nesting-rules)
- [Version Matrix](#version-matrix)

---

## Document Roots

Every react-agentic file must have exactly one root element.

```ebnf
document     ::= command | agent
command      ::= '<Command' CommandProps '>' BlockContent* '</Command>'
agent        ::= '<Agent' AgentProps '>' BlockContent* '</Agent>'
```

### Command

Creates a Claude Code slash command with YAML frontmatter.

```tsx
<Command
  name="my-command"           // Required: command identifier
  description="Description"   // Required: what this command does
  argumentHint="<filename>"   // Optional: hint shown in UI
  agent="agent-name"          // Optional: run in subagent
  allowedTools={["Read"]}     // Optional: pre-approved tools
  folder="subfolder"          // Optional: output path subfolder
  arguments={[...]}           // Optional: typed arguments
>
  {/* BlockContent */}
</Command>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | Yes | Command identifier (kebab-case) |
| `description` | `string` | Yes | Command purpose for frontmatter |
| `argumentHint` | `string` | No | UI hint like `<filename>` |
| `agent` | `string` | No | Subagent to run command in |
| `allowedTools` | `string[]` | No | Tools allowed without prompting |
| `folder` | `string` | No | Output path subfolder |
| `arguments` | `CommandArgument[]` | No | Typed argument definitions |
| `children` | `ReactNode \| (ctx) => ReactNode` | No | Body content or render props |

### Agent

Creates a spawnable agent definition with YAML frontmatter.

```tsx
<Agent<InputType, OutputType>
  name="my-agent"             // Required: agent identifier
  description="Description"   // Required: agent purpose
  tools="Read Grep Glob"      // Optional: space-separated tools
  color="cyan"                // Optional: terminal output color
  folder="subfolder"          // Optional: output path subfolder
  model="sonnet"              // Optional: model override
>
  {/* BlockContent */}
</Agent>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | Yes | Agent identifier (kebab-case) |
| `description` | `string` | Yes | Agent purpose for frontmatter |
| `tools` | `string` | No | Space-separated tool names |
| `color` | `string` | No | Terminal color (cyan, green, etc.) |
| `folder` | `string` | No | Output path subfolder |
| `model` | `string` | No | Model name override |
| `children` | `ReactNode \| (ctx) => ReactNode` | No | Body content or render props |

---

## External Components

Components can be imported from external files for reuse across commands and agents:

```tsx
// Named imports
import { Banner, Footer } from './components/layout';

// Default imports
import Card from './components/card';

export default (
  <Command name="example" description="Uses external components">
    {() => (
      <>
        <Banner title="Welcome" />
        <Card>
          <p>Card content</p>
        </Card>
        <Footer />
      </>
    )}
  </Command>
);
```

### Defining External Components

External components follow standard React patterns:

```tsx
// ./components/layout.tsx

// Arrow function component
export const Banner = ({ title }: { title: string }) => (
  <h1>{title}</h1>
);

// Function declaration component
export function Footer() {
  return <p>© 2024</p>;
}

// Default export
const Card = ({ children }: { children?: any }) => (
  <XmlBlock name="card">
    {children}
  </XmlBlock>
);
export default Card;
```

### Constraints

| Constraint | Description |
|------------|-------------|
| Relative imports only | External components must use relative paths (e.g., `./components/banner`). Node modules are ignored. |
| PascalCase names | Only PascalCase identifiers are treated as components |
| Local precedence | Local component definitions take precedence over imported components with the same name |
| Static only | External components cannot use runtime features (`useRuntimeVar`, `runtimeFn`). Use runtime features in the consuming command/agent instead. |

---

## Block Elements

Block elements form the structural content of commands and agents.

```ebnf
BlockContent  ::= HTMLBlock | Component | TextContent
HTMLBlock     ::= Heading | Paragraph | List | Blockquote | CodeBlock | HRule | Div
Component     ::= MarkdownComp | XmlBlock | Table | List | Indent
              |   ExecutionContext | SpawnAgent | OnStatus
              |   If | Else | Loop | Break | Return | AskUser
              |   Assign | AssignGroup | ReadFiles | Step | Bash | PromptTemplate
TextContent   ::= RawText | TemplateExpression
```

### HTML Block Elements

#### Headings (h1-h6)

```tsx
<h1>Heading Level 1</h1>
<h2>Heading Level 2</h2>
// ... through h6
```

| Element | Children | Output |
|---------|----------|--------|
| `<h1>` | InlineContent | `# text` |
| `<h2>` | InlineContent | `## text` |
| `<h3>` | InlineContent | `### text` |
| `<h4>` | InlineContent | `#### text` |
| `<h5>` | InlineContent | `##### text` |
| `<h6>` | InlineContent | `###### text` |

#### Paragraph (p)

```tsx
<p>Paragraph with <b>inline</b> content.</p>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `InlineContent` | No | Inline text and elements |

#### Lists (ul, ol, li)

```tsx
<ul>
  <li>Bullet item</li>
  <li>Another item</li>
</ul>

<ol start={5}>
  <li>Numbered from 5</li>
  <li>Continues at 6</li>
</ol>
```

| Element | Props | Children | Description |
|---------|-------|----------|-------------|
| `<ul>` | none | `<li>` only | Unordered (bullet) list |
| `<ol>` | `start?: number` | `<li>` only | Ordered (numbered) list |
| `<li>` | none | BlockContent | List item |

#### Blockquote

```tsx
<blockquote>
  <p>Quoted content</p>
</blockquote>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `BlockContent` | No | Block content with `>` prefix |

#### Code Block (pre)

```tsx
<pre>
  <code className="language-typescript">
    const x = 1;
  </code>
</pre>
```

| Element | Props | Children | Description |
|---------|-------|----------|-------------|
| `<pre>` | none | `<code>` | Fenced code block wrapper |
| `<code>` | `className?: string` | Text | Code content; `language-*` for syntax |

#### Horizontal Rule (hr)

```tsx
<hr />
```

Self-closing. Emits `---` thematic break.

#### Div

```tsx
// Named div becomes XML block
<div name="example">Content</div>

// Unnamed div is invisible grouping
<div>
  <p>Tight spacing</p>
  <p>Between children</p>
</div>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | No | If present, emits `<name>...</name>` XML |
| `children` | `BlockContent` | No | Block content |

---

## Inline Elements

Inline elements appear within paragraphs, headings, and list items.

```ebnf
InlineContent ::= (Text | InlineElement)*
InlineElement ::= Bold | Italic | InlineCode | Link | LineBreak
Bold          ::= ('<b>' | '<strong>') InlineContent ('</b>' | '</strong>')
Italic        ::= ('<i>' | '<em>') InlineContent ('</i>' | '</em>')
InlineCode    ::= '<code>' Text '</code>'
Link          ::= '<a' 'href=' URL '>' InlineContent '</a>'
LineBreak     ::= '<br' '/>'
```

### Inline Element Reference

| Element | Props | Children | Output |
|---------|-------|----------|--------|
| `<b>`, `<strong>` | none | InlineContent | `**text**` |
| `<i>`, `<em>` | none | InlineContent | `*text*` |
| `<code>` | none | Text | `` `text` `` |
| `<a>` | `href: string` (required) | InlineContent | `[text](url)` |
| `<br />` | none | none | Hard line break |

---

## Component Reference

### Content Components

#### Markdown

Pass through raw markdown content.

```tsx
<Markdown>
## Pre-formatted

Already formatted markdown.
</Markdown>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `ReactNode` | No | Raw markdown content |

#### XmlBlock

Create named XML section.

```tsx
<XmlBlock name="instructions">
  <p>Content inside XML tags</p>
</XmlBlock>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | Yes | XML tag name |
| `children` | `ReactNode` | No | Block content |

**Output:**
```xml
<instructions>
Content inside XML tags
</instructions>
```

#### Table

Structured markdown table from props.

```tsx
<Table
  headers={["Name", "Age", "City"]}
  rows={[
    ["Alice", 30, "NYC"],
    ["Bob", 25, "LA"],
  ]}
  align={["left", "right", "center"]}
  emptyCell="-"
/>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `headers` | `string[]` | No | Header row |
| `rows` | `(string \| number \| null)[][]` | Yes | Data rows |
| `align` | `('left' \| 'center' \| 'right')[]` | No | Column alignment |
| `emptyCell` | `string` | No | Content for null/undefined cells |

#### List (Component)

Structured list from props (distinct from HTML `<ul>`/`<ol>`).

```tsx
<List
  items={["First", "Second", "Third"]}
  ordered
  start={5}
/>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `items` | `(string \| number)[]` | Yes | List items |
| `ordered` | `boolean` | No | Use numbered list (default: false) |
| `start` | `number` | No | Starting number for ordered lists |

#### Indent

Indent content by spaces.

```tsx
<Indent spaces={4}>
  Indented content here.
</Indent>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `spaces` | `number` | No | Indentation spaces (default: 2) |
| `children` | `ReactNode` | No | Content to indent |

### Semantic Components

#### ExecutionContext

Reference files for Claude to read.

```tsx
<ExecutionContext
  paths={["PROJECT.md", "src/config.ts"]}
  prefix="@"
/>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `paths` | `string[]` | Yes | File paths to reference |
| `prefix` | `string` | No | Path prefix (default: "@") |
| `children` | `ReactNode` | No | Additional content |

**Output:**
```xml
<execution_context>
@PROJECT.md
@src/config.ts
</execution_context>
```

#### SpawnAgent

Spawn a subagent from within a Command.

```tsx
<SpawnAgent
  agent="my-researcher"
  model="sonnet"
  description="Research the topic"
  prompt="Find information about X"
  input={{ topic: "TypeScript" }}
  output={resultVar}
  loadFromFile={true}
/>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `agent` | `string \| AgentRef` | Yes | Agent name or typed reference |
| `model` | `string` | Yes | Model to use (sonnet, opus, haiku) |
| `description` | `string` | Yes | Human-readable task description |
| `prompt` | `string` | No | Prompt content |
| `input` | `object` | No | Typed input object |
| `output` | `RuntimeVarProxy` | No | Variable to capture result (V3) |
| `loadFromFile` | `boolean \| string` | No | Load agent from file |
| `children` | `ReactNode` | No | Additional instructions |

#### OnStatus

Conditional block based on agent return status.

```tsx
const result = useOutput<MyOutput>('researcher');

<OnStatus output={result} status="SUCCESS">
  <p>Agent completed successfully</p>
</OnStatus>
<OnStatus output={result} status="BLOCKED">
  <p>Agent was blocked</p>
</OnStatus>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `output` | `OutputRef` | Yes | From `useOutput()` |
| `status` | `AgentStatus` | Yes | SUCCESS, BLOCKED, NOT_FOUND, ERROR, CHECKPOINT |
| `children` | `ReactNode` | No | Content for this status |

#### SuccessCriteria

Checkbox list for verification.

```tsx
<SuccessCriteria items={[
  "Tests pass",
  { text: "Documentation updated", checked: true },
  "Code reviewed"
]} />
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `items` | `(string \| {text: string, checked: boolean})[]` | Yes | Criteria items |

#### OfferNext

Navigation options for workflow continuation.

```tsx
<OfferNext routes={[
  { name: "Deploy", path: "/deploy", description: "Deploy to production" },
  { name: "Test", path: "/test" }
]} />
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `routes` | `{name: string, path: string, description?: string}[]` | Yes | Route options |

#### XmlSection

Dynamic XML block with custom tag name.

```tsx
<XmlSection name="rules">
  <p>Rule content here</p>
</XmlSection>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | Yes | XML tag name |
| `children` | `ReactNode` | No | Block content |

#### XML Wrapper Components

Convenience components that emit snake_case XML tags:

| Component | Output Tag | Description |
|-----------|------------|-------------|
| `<DeviationRules>` | `<deviation_rules>` | Deviation handling rules |
| `<CommitRules>` | `<commit_rules>` | Git commit rules |
| `<WaveExecution>` | `<wave_execution>` | Wave execution config |
| `<CheckpointHandling>` | `<checkpoint_handling>` | Checkpoint behavior |

### State Components

> **⚠️ Internal/Future**: These components are not yet available in the public API.
> They are documented for internal development and may be exported in a future release.

#### ReadState

Read state value from registry.

```tsx
const projectState = useStateRef<ProjectState>("projectContext");
const stateVar = useVariable("STATE_JSON");

<ReadState
  state={projectState}
  into={stateVar}
  field="user.name"
/>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `state` | `StateRef<TSchema>` | Yes | State reference from `useStateRef` |
| `into` | `VariableRef` | Yes | Variable to store result |
| `field` | `string` | No | Nested field path (e.g., "user.preferences.theme") |

#### WriteState

Write state value to registry. Specify exactly one of: `field`+`value` OR `merge`.

```tsx
// Single field write (literal value)
<WriteState state={projectState} field="name" value="my-project" />

// Single field write (variable reference)
const userInput = useVariable("USER_INPUT");
<WriteState state={projectState} field="name" value={userInput} />

// Merge partial update
<WriteState state={projectState} merge={{ phase: 2, status: "active" }} />
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `state` | `StateRef<TSchema>` | Yes | State reference from `useStateRef` |
| `field` | `string` | No* | Field path for single-field write |
| `value` | `string \| VariableRef` | No* | Value to write (with field) |
| `merge` | `Partial<TSchema>` | No* | Partial object for merge write |

*Specify exactly one of: `field`+`value` OR `merge`.

### Control Flow Components (V3)

Control flow components enable runtime logic within Commands.

#### If / Else

Conditional blocks based on RuntimeVar conditions.

```tsx
const ctx = useRuntimeVar<Context>('CTX');

<If condition={ctx.error}>
  <p>Error: {ctx.error}</p>
</If>
<Else>
  <p>Success!</p>
</Else>
```

**If Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `condition` | `Condition` | Yes | RuntimeVar or boolean expression |
| `children` | `ReactNode` | No | Content when true |

**Else Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `ReactNode` | No | Content when If condition is false |

**Constraint:** `<Else>` must immediately follow `<If>` as sibling.

#### Loop

Bounded iteration.

```tsx
const i = useRuntimeVar<number>('I');

<Loop max={5} counter={i}>
  <p>Iteration {i}</p>
  <If condition={done}>
    <Break message="Found it!" />
  </If>
</Loop>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `max` | `number \| RuntimeVar<number>` | Yes | Maximum iterations |
| `counter` | `RuntimeVarProxy<number>` | No | Counter variable |
| `children` | `ReactNode` | No | Loop body |

#### Break

Exit current loop early.

```tsx
<Break message="Stopping early" />
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `message` | `string \| RuntimeVar<string>` | No | Exit message |

**Constraint:** Only valid inside `<Loop>`.

#### Return

Exit command early with status.

```tsx
<Return status="SUCCESS" message="Already initialized" />
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `status` | `ReturnStatus` | No | SUCCESS, BLOCKED, NOT_FOUND, ERROR, CHECKPOINT |
| `message` | `string \| RuntimeVar<string>` | No | Exit message |

#### AskUser

Prompt user for input.

```tsx
const choice = useRuntimeVar<string>('CHOICE');

<AskUser
  question="Which database?"
  header="Database"
  options={[
    { value: 'postgres', label: 'PostgreSQL', description: 'Recommended' },
    { value: 'sqlite', label: 'SQLite' },
  ]}
  output={choice}
  multiSelect={false}
/>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `question` | `string` | Yes | Question text |
| `options` | `AskUserOption[]` | Yes | 2-4 options |
| `output` | `RuntimeVarProxy<string>` | Yes | Variable for response |
| `header` | `string` | No | Chip label (max 12 chars) |
| `multiSelect` | `boolean` | No | Allow multiple selections |

**AskUserOption:**
```typescript
interface AskUserOption {
  value: string;      // Internal value
  label: string;      // Display text
  description?: string; // Optional explanation
}
```

### Runtime Components (V3)

#### useRuntimeVar

Create typed runtime variable reference.

```tsx
const ctx = useRuntimeVar<MyType>('CTX');
// ctx.user.name → $(echo "$CTX" | jq -r '.user.name')
```

#### runtimeFn / .Call

Wrap TypeScript function for runtime extraction.

```tsx
async function initProject(args: InitArgs): Promise<InitResult> {
  // Implementation extracted to runtime.js
}

const Init = runtimeFn(initProject);

// In JSX:
<Init.Call args={{ path: "." }} output={result} />
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `args` | `AllowRuntimeVars<TArgs>` | Yes | Function arguments |
| `output` | `RuntimeVarProxy<TReturn>` | Yes | Variable for result |

### Workflow Primitives

> **⚠️ Internal/Future**: These components are not yet available in the public API.
> They are documented for internal development and may be exported in a future release.

#### Step

Numbered workflow step.

```tsx
<Step number="1" name="Initialize" variant="heading">
  <p>Step content here</p>
</Step>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `number` | `string` | Yes | Step number (supports "1.1") |
| `name` | `string` | Yes | Step title |
| `variant` | `'heading' \| 'bold' \| 'xml'` | No | Output format (default: heading) |
| `children` | `ReactNode` | No | Step body |

#### Bash

Emit bash code block.

```tsx
<Bash>
  npm install
  npm run build
</Bash>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | Text | No | Bash commands |

#### ReadFiles

Batch file reading.

```tsx
<ReadFiles files={[
  { varName: 'CONFIG', path: 'config.json', required: true },
  { varName: 'README', path: 'README.md', required: false },
]} />
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `files` | `ReadFileEntry[]` | Yes | Files to read |

**ReadFileEntry:**
```typescript
interface ReadFileEntry {
  varName: string;   // Variable name for content
  path: string;      // File path
  required: boolean; // Error if missing
}
```

#### PromptTemplate

Wrap content in markdown code fence.

```tsx
<PromptTemplate>
  Content that avoids nested escaping
</PromptTemplate>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `ReactNode` | No | Content to wrap |

### Variable Components

> **⚠️ Internal/Future**: These components are not yet available in the public API.
> They are documented for internal development and may be exported in a future release.

#### Assign

Shell variable assignment.

```tsx
<Assign
  name="PROJECT_DIR"
  bash="pwd"
  comment="Get current directory"
/>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | Yes | Variable name |
| `bash` | `string` | No* | Bash command for value |
| `value` | `string` | No* | Static value |
| `env` | `string` | No* | Environment variable |
| `comment` | `string` | No | Inline comment |

*One of `bash`, `value`, or `env` required.

#### AssignGroup

Group multiple assignments in single code block.

```tsx
<AssignGroup>
  <Assign name="A" value="1" />
  <Assign name="B" bash="echo test" />
</AssignGroup>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `<Assign>` elements | Yes | Assignments to group |

---

## Nesting Rules

### Constraints

| ID | Rule | Error |
|----|------|-------|
| C1 | `<Else>` must immediately follow `<If>` as sibling | `<Else> must follow <If> as sibling` |
| C2 | `<Break>` only valid inside `<Loop>` | Context error |
| C3 | `<li>` only valid inside `<ul>` or `<ol>` | Unsupported element |
| C4 | `<ul>` and `<ol>` can only contain `<li>` | Invalid list child |
| C5 | Inline elements cannot contain block elements | Unsupported inline element |
| C6 | V3 control flow only in Commands, not Agents | Feature restriction |

### Content Model

```
Command/Agent
├── BlockContent*
    ├── HTMLBlock
    │   ├── h1-h6 → InlineContent
    │   ├── p → InlineContent
    │   ├── ul/ol → li* → BlockContent
    │   ├── blockquote → BlockContent
    │   ├── pre → code → Text
    │   ├── div → BlockContent
    │   └── hr (empty)
    ├── Component
    │   ├── Markdown → RawText
    │   ├── XmlBlock → BlockContent
    │   ├── Table (self-closing with props)
    │   ├── List (self-closing with props)
    │   ├── Indent → BlockContent
    │   ├── ExecutionContext → BlockContent
    │   ├── SpawnAgent → InlineContent (children optional)
    │   ├── OnStatus → BlockContent
    │   ├── SuccessCriteria (self-closing with props)
    │   ├── OfferNext (self-closing with props)
    │   ├── XmlSection → BlockContent
    │   ├── DeviationRules/CommitRules/etc → BlockContent
    │   ├── ReadState (self-closing with props)
    │   ├── WriteState (self-closing with props)
    │   ├── Step → BlockContent
    │   ├── Bash → Text
    │   ├── ReadFiles (self-closing with props)
    │   ├── PromptTemplate → BlockContent
    │   ├── Assign (self-closing with props)
    │   ├── AssignGroup → Assign*
    │   ├── If → BlockContent
    │   ├── Else → BlockContent
    │   ├── Loop → BlockContent
    │   ├── Break (self-closing)
    │   ├── Return (self-closing)
    │   └── AskUser (self-closing)
    └── TextContent
        └── Template literals, raw text

InlineContent
├── Text
├── b/strong → InlineContent
├── i/em → InlineContent
├── code → Text
├── a → InlineContent
└── br (empty)
```

---

## Version Matrix

| Element | V1 (Static) | V3 (Runtime) | Status | Notes |
|---------|-------------|--------------|--------|-------|
| **Document Roots** |
| `<Command>` | ✅ | ✅ | ✅ Public | |
| `<Agent>` | ✅ | ✅ | ✅ Public | |
| **HTML Blocks** |
| `<h1>`-`<h6>` | ✅ | ✅ | ✅ Public | |
| `<p>` | ✅ | ✅ | ✅ Public | |
| `<ul>`, `<ol>`, `<li>` | ✅ | ✅ | ✅ Public | |
| `<blockquote>` | ✅ | ✅ | ✅ Public | |
| `<pre>`, `<code>` | ✅ | ✅ | ✅ Public | |
| `<div>` | ✅ | ✅ | ✅ Public | |
| `<hr>` | ✅ | ✅ | ✅ Public | |
| **Inline** |
| `<b>`, `<strong>` | ✅ | ✅ | ✅ Public | |
| `<i>`, `<em>` | ✅ | ✅ | ✅ Public | |
| `<code>` (inline) | ✅ | ✅ | ✅ Public | |
| `<a>` | ✅ | ✅ | ✅ Public | |
| `<br>` | ✅ | ✅ | ✅ Public | |
| **Components** |
| `<Markdown>` | ✅ | ✅ | ✅ Public | |
| `<XmlBlock>` | ✅ | ✅ | ✅ Public | |
| `<Table>` | ✅ | ✅ | ✅ Public | |
| `<List>` | ✅ | ✅ | ✅ Public | |
| `<Indent>` | ✅ | ✅ | ✅ Public | |
| `<ExecutionContext>` | ✅ | ✅ | ✅ Public | |
| `<SpawnAgent>` | ✅ | ✅ | ✅ Public | V3 adds output prop |
| `<OnStatus>` | ✅ | ✅ | ✅ Public | |
| **Workflow** |
| `<Step>` | ✅ | ✅ | 🔒 Internal | |
| `<Bash>` | ✅ | ✅ | 🔒 Internal | |
| `<ReadFiles>` | ✅ | ✅ | 🔒 Internal | |
| `<PromptTemplate>` | ✅ | ✅ | 🔒 Internal | |
| **Variables** |
| `<Assign>` | ✅ | ✅ | 🔒 Internal | |
| `<AssignGroup>` | ✅ | ✅ | 🔒 Internal | |
| **Semantic** |
| `<SuccessCriteria>` | ✅ | ✅ | 🔒 Internal | |
| `<OfferNext>` | ✅ | ✅ | 🔒 Internal | |
| `<XmlSection>` | ✅ | ✅ | 🔒 Internal | |
| `<DeviationRules>` | ✅ | ✅ | 🔒 Internal | XML wrapper |
| `<CommitRules>` | ✅ | ✅ | 🔒 Internal | XML wrapper |
| `<WaveExecution>` | ✅ | ✅ | 🔒 Internal | XML wrapper |
| `<CheckpointHandling>` | ✅ | ✅ | 🔒 Internal | XML wrapper |
| **State** |
| `<ReadState>` | ✅ | ✅ | 🔒 Internal | |
| `<WriteState>` | ✅ | ✅ | 🔒 Internal | |
| **V3 Control Flow** |
| `<If>` | ❌ | ✅ | ✅ Public | Commands only |
| `<Else>` | ❌ | ✅ | ✅ Public | Commands only |
| `<Loop>` | ❌ | ✅ | ✅ Public | Commands only |
| `<Break>` | ❌ | ✅ | ✅ Public | Commands only |
| `<Return>` | ❌ | ✅ | ✅ Public | Commands only |
| `<AskUser>` | ❌ | ✅ | ✅ Public | Commands only |
| **V3 Runtime** |
| `useRuntimeVar()` | ❌ | ✅ | ✅ Public | Hook for typed vars |
| `runtimeFn()` | ❌ | ✅ | ✅ Public | Function extraction |
| `<Fn.Call>` | ❌ | ✅ | ✅ Public | Runtime invocation |

**Legend:**
- ✅ Public: Exported in public API, ready for use
- 🔒 Internal: Implemented but not yet exported, may be available in future release

### V3 Feature Detection

V3 features are automatically detected when you use:
- `useRuntimeVar<T>()` hook
- `runtimeFn()` wrapper
- Control flow components (`If`, `Else`, `Loop`, `Break`, `Return`)
- `AskUser` component

---

## Quick Reference

### Element Summary

| Category | Elements | Count | Status |
|----------|----------|-------|--------|
| Document Roots | Command, Agent | 2 | ✅ Public |
| HTML Block | h1-h6, p, ul, ol, li, blockquote, pre, code, div, hr | 12 | ✅ Public |
| Inline | b, strong, i, em, code, a, br | 7 | ✅ Public |
| Content Components | Markdown, XmlBlock, Table, List, Indent | 5 | ✅ Public |
| Communication | ExecutionContext, SpawnAgent, OnStatus | 3 | ✅ Public |
| Control Flow | If, Else, Loop, Break, Return, AskUser | 6 | ✅ Public |
| **Public Total** | | **35** | |
| Semantic | SuccessCriteria, OfferNext, XmlSection | 3 | 🔒 Internal |
| XML Wrappers | DeviationRules, CommitRules, WaveExecution, CheckpointHandling | 4 | 🔒 Internal |
| Workflow | Step, Bash, ReadFiles, PromptTemplate | 4 | 🔒 Internal |
| Variables | Assign, AssignGroup | 2 | 🔒 Internal |
| State | ReadState, WriteState | 2 | 🔒 Internal |
| **Internal Total** | | **15** | |
| **Grand Total** | | **50** | |

> **Note**: Internal components are documented for completeness but not yet exported in the public API.
> They may be available in a future release.

### Props Quick Reference

```typescript
// Common prop types
type Condition = RuntimeVar<T> | boolean | undefined;
type OrRuntimeVar<T> = T | RuntimeVar<T>;
type AgentStatus = 'SUCCESS' | 'BLOCKED' | 'NOT_FOUND' | 'ERROR' | 'CHECKPOINT';
type ReturnStatus = AgentStatus;
type StepVariant = 'heading' | 'bold' | 'xml';
type TableAlignment = 'left' | 'center' | 'right';
```
