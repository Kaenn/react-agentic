# Phase 3: Team + Teammate — Planning Document

Implementation planning for `<Team>` and `<Teammate>` components.

---

## Objective

Create components that emit Claude Code's team orchestration syntax:
1. `<Team>` — Emits `Teammate({ operation: "spawnTeam", team_name: ..., description: ... })`
2. `<Teammate>` — Emits `Task({ team_name, name, subagent_type, prompt, run_in_background: true })`

---

## Technical Requirements

### From GOLDEN_PATH.md

```tsx
// Team component
<Team team={ReviewTeam} description="Code review specialists">
  <Teammate worker={Security} ... />
  <Teammate worker={Perf} ... />
</Team>

// Teammate component
<Teammate
  worker={Security}
  description="Security audit"
  prompt={`Review for security vulnerabilities...`}
/>
```

### Expected Output Format

**Team output:**
```markdown
## Team: pr-review

> Code review specialists

```javascript
Teammate({ operation: "spawnTeam", team_name: "pr-review", description: "Code review specialists" })
```

### Members

{children}
```

**Teammate output:**
```javascript
Task({
  team_name: "pr-review",
  name: "security",
  subagent_type: "compound-engineering:review:security-sentinel",
  description: "Security audit",
  prompt: `Review for security vulnerabilities...`,
  run_in_background: true
})
```

### From Claude Code Documentation (swarm-claude-code.md)

**Team creation:**
```javascript
Teammate({
  operation: "spawnTeam",
  team_name: "feature-auth",
  description: "Implementing OAuth2 authentication"  // Optional
})
```

**Teammate spawning:**
```javascript
Task({
  team_name: "my-project",        // Required: which team to join
  name: "security-reviewer",      // Required: teammate's name
  subagent_type: "security-sentinel",
  prompt: "Review all authentication code...",
  run_in_background: true         // Teammates usually run in background
})
```

---

## Architecture Analysis

### Pipeline Overview

```
TSX Source → Parser → IR Nodes → Emitter → Markdown
```

### New Components Required

| Layer | New Item | Purpose |
|-------|----------|---------|
| IR | `TeamNode` | Represents team spawn with nested teammates |
| IR | `TeammateNode` | Represents single teammate Task call |
| Parser | `transformTeam()` | Transforms `<Team>` JSX to IR |
| Parser | `transformTeammate()` | Transforms `<Teammate>` JSX to IR |
| Parser | `extractPromptChild()` | Extracts and transforms `<Prompt>` children to markdown |
| Emitter | `emitTeam()` | Emits spawnTeam + members markdown |
| Emitter | `emitTeammate()` | Emits Task() call markdown |
| Component | `Team` | JSX component for authoring |
| Component | `Teammate` | JSX component for authoring |
| Component | `Prompt` | JSX component for structured prompt content |

### Dependencies from Previous Phases

| Phase | Item | Used By |
|-------|------|---------|
| Phase 1 | `WorkerRef`, `defineWorker()` | `<Teammate worker={...}>` |
| Phase 1 | `TeamRef`, `defineTeam()` | `<Team team={...}>` |
| Phase 1 | `AgentType`, `PluginAgentType`, `Model` | Worker type mapping |

---

## Decision Points

### 1. Team Context for Teammate

**The Problem:**

`<Teammate>` must emit `team_name` in the `Task()` call, but where does it get this value?

```tsx
<Team team={ReviewTeam}>
  <Teammate worker={Security} ... />  // How does this know team_name="pr-review"?
</Team>
```

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Prop drilling (explicit `teamName` prop on Teammate) | Explicit, no magic | Verbose, duplicates Team's name |
| B | Transform-time context (transformer tracks current team) | Clean API, auto-inherit | Requires stateful transform |
| C | IR nesting (Team IR node contains Teammate IR nodes) | Natural hierarchy | Requires two-phase emit |

**Recommendation:** Option C — IR nesting

Rationale:
- `TeamNode` contains `children: TeammateNode[]` directly
- Team name passed to `emitTeammate()` from parent `emitTeam()`
- Natural representation: Team owns its Teammates
- Clean API: no prop drilling, no global state

**Implementation:**
```typescript
interface TeamNode {
  kind: 'team';
  team: TeamRef;
  description?: string;
  children: TeammateNode[];
}

function emitTeam(node: TeamNode): string {
  // Emit spawnTeam call
  // Then emit each teammate with team.name context
  for (const teammate of node.children) {
    emitTeammate(teammate, node.team.name);
  }
}
```

---

### 2. Standalone Teammate (Outside Team)

**The Problem:**

Should `<Teammate>` be usable outside a `<Team>` container?

```tsx
// Standalone - is this valid?
<Teammate
  teamName="pr-review"  // Explicit team name required?
  worker={Security}
  ...
/>
```

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Require Teammate inside Team only | Clean API, enforces team lifecycle | Less flexible |
| B | Allow standalone with explicit `teamName` prop | Maximum flexibility | Inconsistent API |
| C | Allow both: infer from parent Team, or use explicit prop | Best of both | More complex transform |

**Recommendation:** Option A — Require Teammate inside Team

Rationale:
- Claude Code's lifecycle: spawnTeam → spawn teammates → work → shutdown → cleanup
- Standalone teammates without team context is an anti-pattern
- Enforcing nesting teaches correct usage
- Simplifies implementation (no conditional team name resolution)

**Decision:** `<Teammate>` MUST be a child of `<Team>`. Transform throws error otherwise.

---

### 3. WorkerRef vs Inline Worker Definition

**The Problem:**

GOLDEN_PATH shows `worker={Security}` prop using WorkerRef, but what if user wants inline definition?

```tsx
// Using WorkerRef (GOLDEN_PATH pattern)
const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
<Teammate worker={Security} ... />

// Inline (not in GOLDEN_PATH)
<Teammate
  name="security"
  type={PluginAgentType.SecuritySentinel}
  ...
/>
```

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | WorkerRef only (`worker` prop required) | Enforces Phase 1 refs, type-safe | Less convenient for quick usage |
| B | Inline only (`name` + `type` props) | Simple, no ref boilerplate | Loses type safety, no reuse |
| C | Both patterns (WorkerRef or inline) | Maximum flexibility | Complex props, inconsistent usage |

**Recommendation:** Option A — WorkerRef only

Rationale:
- Consistent with GOLDEN_PATH design philosophy
- Enforces type-safe worker definitions
- WorkerRef carries `__id` for identity resolution
- Single pattern = simpler docs, less confusion
- Inline usage covered by `defineWorker()` at call site

**Decision:** `<Teammate>` requires `worker: WorkerRef` prop. No inline `name`/`type` props.

---

### 4. Prompt Handling: Prop vs Children

**The Problem:**

GOLDEN_PATH shows prompt as a prop, but specs show `<Prompt>` as children:

```tsx
// GOLDEN_PATH: prompt prop
<Teammate
  worker={Security}
  prompt={`Review for security vulnerabilities...`}
/>

// Specs: Prompt child
<Teammate worker={Security}>
  <Prompt>Review for security vulnerabilities...</Prompt>
</Teammate>
```

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Prop only (`prompt` string prop) | Simple, matches GOLDEN_PATH | Long prompts are awkward |
| B | Children only (`<Prompt>` child) | Better for multi-line | Requires extra component |
| C | Both: prop takes precedence, children fallback | Maximum flexibility | Confusing precedence |
| D | Both: child takes precedence, prop fallback | Best of both, clear precedence | Slightly more complex |

**Decision:** Option D — Support both, `<Prompt>` child takes precedence

Rationale:
- `<Prompt>` is much better for multi-line prompts (very common in swarm scenarios)
- Specs have detailed patterns for `<Prompt>` (vars, templates, etc.)
- `prompt` prop works for simple one-liners
- Clear precedence: child > prop (no ambiguity)

**Additional Decision:** `<Prompt>` supports full JSX (all BlockContent elements)

`<Prompt>` is a **transparent container** that accepts the same children as `<Command>` body:
- HTML elements: `<h1>`, `<p>`, `<ul>`, `<blockquote>`, etc.
- Components: `<XmlBlock>`, `<Table>`, `<List>`, `<ExecutionContext>`, etc.
- Text content and template literals

This keeps the grammar consistent and allows structured, reusable prompts.

**Implementation:**
```typescript
// In transformTeammate:
// If Teammate has <Prompt> child, transform its children to markdown
// Otherwise, use prompt prop as raw string
const prompt = extractPromptChild(node, ctx) ?? getAttributeValue(opening, 'prompt');
if (!prompt) {
  throw new Error('Teammate requires either a <Prompt> child or prompt prop');
}

// extractPromptChild transforms <Prompt> children to markdown string
function extractPromptChild(node: JsxElement, ctx: TransformContext): string | undefined {
  for (const child of node.getJsxChildren()) {
    if (isJsxElementNamed(child, 'Prompt')) {
      // Transform Prompt's children (BlockContent) to IR nodes
      const childNodes = transformBlockContent(child.getJsxChildren(), ctx);
      // Emit IR nodes to markdown string
      return emitBlockNodes(childNodes).trim();
    }
  }
  return undefined;
}
```

**Examples:**
```tsx
// Short prompt: use prop
<Teammate worker={Security} description="Security audit" prompt="Check for XSS" />

// Long prompt with full JSX: use <Prompt> child
<Teammate worker={Security} description="Security audit">
  <Prompt>
    <h1>Security Review</h1>

    <XmlBlock name="focus_areas">
      <ul>
        <li>SQL injection</li>
        <li>XSS attacks</li>
        <li>Auth bypass</li>
      </ul>
    </XmlBlock>

    <Table
      headers={["Severity", "Action"]}
      rows={[["Critical", "Block PR"], ["High", "Request fix"]]}
    />

    <ExecutionContext paths={["SECURITY_RULES.md"]} />
  </Prompt>
</Teammate>
```

---

### 5. Model Override

**The Problem:**

GOLDEN_PATH shows model as optional prop on `<Teammate>`, but WorkerRef already has `model?`:

```tsx
// WorkerRef with model
const Explorer = defineWorker('explorer', AgentType.Explore, Model.Haiku);

// Teammate model override
<Teammate
  worker={Explorer}
  model={Model.Sonnet}  // Override WorkerRef's model?
  ...
/>
```

**Question:** What's the precedence? Which takes priority?

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | WorkerRef model only, no prop | Simple, single source of truth | Can't override per-usage |
| B | Teammate prop only, ignore WorkerRef | Flexible | WorkerRef.model becomes useless |
| C | Both: Teammate prop overrides WorkerRef | Maximum flexibility | Confusing precedence |
| D | WorkerRef is default, Teammate prop overrides | Clear precedence, flexibility | Slightly complex |

**Recommendation:** Option D — WorkerRef is default, Teammate prop overrides

Rationale:
- WorkerRef.model is the "default" for that worker type
- `<Teammate model={...}>` is situational override
- Matches common React pattern (default props + overrides)
- Clear mental model: define once, override as needed

**Implementation:**
```typescript
// In emitTeammate
const model = node.model ?? node.worker.model;  // Teammate prop takes precedence
if (model) {
  output += `  model: "${model}",\n`;
}
```

**Decision:** Teammate `model` prop overrides WorkerRef's `model` if both provided.

---

### 6. `run_in_background` Default

**The Problem:**

GOLDEN_PATH says teammates "usually run in background" with `run_in_background: true`. Should this be configurable or always true?

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Always true (no prop) | Matches teammate semantics | Can't use synchronous teammates |
| B | Default true, configurable prop | Flexible | Rarely needed, adds complexity |
| C | Required prop | Explicit | Verbose for common case |

**Decision:** Option B — Optional `background` prop, default `true`

Rationale:
- Matches both GOLDEN_PATH and specs which define `background?: boolean`
- Allows synchronous teammates for edge cases (quick validation checks)
- Low implementation cost (one optional prop)
- Default `true` means no change for typical usage

**Implementation:**
```typescript
// In TeammateProps
interface TeammateProps {
  // ...
  /** Run in background. Default: true */
  background?: boolean;
}

// In emitTeammate
const runInBackground = node.background ?? true;
lines.push(`  run_in_background: ${runInBackground}`);
```

**Example:**
```tsx
// Default: background (async)
<Teammate worker={Security} description="Full audit" prompt="..." />

// Explicit sync for quick checks
<Teammate worker={Validator} description="Quick check" prompt="..." background={false} />
```

---

### 7. Team Description Source

**The Problem:**

Where does team description come from?

```tsx
// Option 1: Team has description prop
<Team team={ReviewTeam} description="Code review specialists">

// Option 2: TeamRef has description
const ReviewTeam = defineTeam('pr-review', { description: '...' });

// Option 3: Both
```

**Analysis:**

GOLDEN_PATH shows:
- `<Team team={ref} description="...">` — description as prop
- `defineTeam(name, members?)` — no description in factory

Claude Code API:
- `Teammate({ operation: "spawnTeam", team_name: "...", description: "..." })`
- Description is optional in spawnTeam

**Recommendation:** Description on `<Team>` prop only

Rationale:
- TeamRef is a reference (name + members)
- Description is about this specific team instantiation
- Matches GOLDEN_PATH example
- Keeps `defineTeam()` minimal

**Decision:**
- `TeamRef` has no description
- `<Team description="...">` prop passed to spawnTeam

---

### 8. subagent_type Value Mapping

**The Problem:**

WorkerRef has `type: string` which maps to Claude Code's `subagent_type`. What's the exact mapping?

**Analysis from Claude Code docs:**

| Source | subagent_type Value |
|--------|---------------------|
| `AgentType.Bash` | `"Bash"` |
| `AgentType.Explore` | `"Explore"` |
| `AgentType.Plan` | `"Plan"` |
| `AgentType.GeneralPurpose` | `"general-purpose"` |
| `PluginAgentType.SecuritySentinel` | `"compound-engineering:review:security-sentinel"` |

**Question:** Does WorkerRef.type already contain the correct string?

**Answer:** Yes. Phase 1 enums store the exact Claude Code string:

```typescript
// src/components/swarm/enums.ts
export const AgentType = {
  Bash: 'Bash',
  Explore: 'Explore',
  GeneralPurpose: 'general-purpose',  // Note: string, not "GeneralPurpose"
} as const;
```

**Decision:** No mapping needed. `WorkerRef.type` is directly emitted as `subagent_type`.

---

## Incoherences with GOLDEN_PATH and Specs (To Resolve)

### INC-1. Output Format: Heading Style

**Status:** 🔴 NEEDS RESOLUTION

**The Problem:**

GOLDEN_PATH shows different output format than specs:

**GOLDEN_PATH output:**
```markdown
## Team: pr-review

> Code review specialists

```javascript
Teammate({ operation: "spawnTeam", team_name: "pr-review", description: "Code review specialists" })
```

### Members

#### security

```javascript
Task({
  team_name: "pr-review",
  name: "security",
  ...
})
```
```

**Specs example output (examples.md):**
```markdown
## Team: reviewers

> Code review team

```javascript
Teammate({ operation: "spawnTeam", team_name: "reviewers" })
```

### Members

#### security

```javascript
Task({
  team_name: "reviewers",
  name: "security",
  subagent_type: "security-sentinel",  // Different format!
  prompt: `Review for vulnerabilities`,
  run_in_background: true
})
```
```

**Differences:**

| Item | GOLDEN_PATH | Specs |
|------|-------------|-------|
| subagent_type format | Full plugin path | Short name |
| Description in spawnTeam | Yes | Not shown |
| Task description field | Yes (separate from prompt) | Not shown |

**Decision:** ❓ TO RESOLVE

**Questions:**
1. Should spawnTeam include description? (Claude Code supports it, GOLDEN_PATH shows it)
2. Should subagent_type use full path or short name?
3. Should Task() include `description` field separate from `prompt`?

---

### INC-2. Teammate `description` vs `prompt`

**Status:** 🔴 NEEDS RESOLUTION

**The Problem:**

GOLDEN_PATH shows both `description` and `prompt` on Teammate:

```tsx
<Teammate
  worker={Security}
  description="Security audit"      // What is this for?
  prompt={`Review for security...`}  // And this?
/>
```

**Output:**
```javascript
Task({
  team_name: "pr-review",
  name: "security",
  subagent_type: "...",
  description: "Security audit",  // Maps here
  prompt: `Review for security...`,  // Maps here
  run_in_background: true
})
```

**Claude Code Task API (from docs):**
```javascript
Task({
  subagent_type: "Explore",
  description: "Find auth files",  // Used for what?
  prompt: "Find all authentication-related files"
})
```

**Question:** What's the semantic difference between `description` and `prompt` in Claude Code's Task API?

**Analysis from Claude Code docs:**

Looking at Task tool documentation:
- `description`: "A short description of the task" — used for Task tool's summary
- `prompt`: "The task for the agent to perform" — actual instructions

**Decision:** ✅ RESOLVED

Both fields have distinct purposes:
- `description` → Short summary (shown in task list, logs)
- `prompt` → Full instructions for the agent

**Teammate props:**
```typescript
interface TeammateProps {
  worker: WorkerRef;
  description: string;  // Required: short summary
  prompt: string;       // Required: full instructions
  model?: Model;        // Optional: override worker's model
}
```

---

### INC-3. Specs Show `<Prompt>` Child Pattern

**Status:** ✅ RESOLVED (see Decision Point #4)

Resolved: Phase 3 uses `prompt` prop only. `<Prompt>` child pattern deferred to future phase if needed.

---

### INC-4. Specs Show Additional Props Not in GOLDEN_PATH

**Status:** 🔴 NEEDS RESOLUTION

**The Problem:**

Specs index.md mentions props not in GOLDEN_PATH:

| Specs Prop | GOLDEN_PATH | Decision |
|------------|-------------|----------|
| `background: boolean` | Not shown (always true) | ❌ Not needed (always true) |
| `mode: "plan"` | Not shown | ❓ Defer to future |
| `vars: Variables` | Not shown | ❓ Defer to future |

**Decision:** Phase 3 implements GOLDEN_PATH props only:
- `worker: WorkerRef` ✅
- `description: string` ✅
- `prompt: string` ✅
- `model?: Model` ✅

Future phases can add:
- `planModeRequired?: boolean` — for plan approval workflow
- `vars?: Record<string, string>` — for prompt interpolation

---

### INC-5. Team Members Array vs Children

**Status:** 🔴 NEEDS RESOLUTION

**The Problem:**

GOLDEN_PATH shows two patterns for defining team members:

**Pattern 1: defineTeam with members (Phase 1)**
```tsx
const ReviewTeam = defineTeam('pr-review', [Security, Perf]);
// ReviewTeam.members = [Security, Perf]
```

**Pattern 2: Team children (Phase 3)**
```tsx
<Team team={ReviewTeam}>
  <Teammate worker={Security} ... />
  <Teammate worker={Perf} ... />
</Team>
```

**Questions:**
1. Are `defineTeam` members used for validation?
2. Can `<Team>` have children not in `defineTeam.members`?
3. What happens if child worker not in members array?

**Options:**

| Option | Behavior | Pros | Cons |
|--------|----------|------|------|
| A | Ignore defineTeam.members | Simple, children are source of truth | TeamRef.members useless |
| B | Validate children against members | Type-safe, catches mismatches | More complex transform |
| C | Merge: members auto-generate Teammates if no children | Convenient | Implicit behavior |

**Recommendation:** Option A — Children are source of truth

Rationale:
- `defineTeam.members` is documentation/metadata
- Runtime behavior determined by actual `<Teammate>` children
- No validation complexity
- TeamRef.members useful for generating docs/diagrams

**Decision:** `<Team>` children define actual teammates. `TeamRef.members` is informational only.

---

### INC-6. Transform vs Emit Time Team Context

**Status:** ✅ RESOLVED (see Decision Point #1)

Resolved: IR nesting approach. TeamNode contains TeammateNode[] directly.

---

## IR Node Definitions

### TeamNode

```typescript
// src/ir/swarm-nodes.ts (add to existing file)

import type { TeamRef } from '../components/swarm/refs.js';

/**
 * Team definition node
 * Emits Teammate({ operation: "spawnTeam" }) + nested teammate Tasks
 */
export interface TeamNode {
  kind: 'team';
  /** TeamRef from defineTeam() */
  team: TeamRef;
  /** Team description - maps to spawnTeam.description */
  description?: string;
  /** Nested teammate definitions */
  children: TeammateNode[];
}
```

### TeammateNode

```typescript
/**
 * Teammate definition node
 * Emits Task({ team_name, name, subagent_type, ... })
 */
export interface TeammateNode {
  kind: 'teammate';
  /** WorkerRef from defineWorker() */
  worker: WorkerRef;
  /** Short description - maps to Task.description */
  description: string;
  /** Full instructions - maps to Task.prompt */
  prompt: string;
  /** Model override (optional) */
  model?: string;
  /** Run in background (default: true) */
  background?: boolean;
}
```

---

## Component Definitions

### Team Component

```typescript
// src/components/swarm/Team.tsx

import type { ReactNode } from 'react';
import type { TeamRef } from './refs.js';

export interface TeamProps {
  /** TeamRef from defineTeam() */
  team: TeamRef;
  /** Team description (optional) */
  description?: string;
  /** Teammate children */
  children: ReactNode;
}

/**
 * Defines a team for Claude Code's swarm system.
 *
 * @example
 * <Team team={ReviewTeam} description="Code review specialists">
 *   <Teammate worker={Security} description="..." prompt="..." />
 *   <Teammate worker={Perf} description="..." prompt="..." />
 * </Team>
 */
export function Team(_props: TeamProps): null {
  return null;
}
```

### Prompt Component

```typescript
// src/components/swarm/Prompt.tsx

import type { ReactNode } from 'react';

export interface PromptProps {
  /**
   * Prompt content - supports all BlockContent elements:
   * - HTML: <h1>, <p>, <ul>, <blockquote>, etc.
   * - Components: <XmlBlock>, <Table>, <List>, <ExecutionContext>, etc.
   * - Text content and template literals
   */
  children: ReactNode;
}

/**
 * Container for agent prompts with full JSX support.
 * Transforms children to markdown string for Task.prompt.
 *
 * Must be used inside a <Teammate> component.
 *
 * @example
 * // Simple text content
 * <Prompt>Review the code for security issues.</Prompt>
 *
 * @example
 * // Structured with components
 * <Prompt>
 *   <h1>Security Review</h1>
 *   <XmlBlock name="focus">
 *     <ul>
 *       <li>SQL injection</li>
 *       <li>XSS</li>
 *     </ul>
 *   </XmlBlock>
 * </Prompt>
 */
export function Prompt(_props: PromptProps): null {
  return null;
}
```

---

### Teammate Component

```typescript
// src/components/swarm/Teammate.tsx

import type { ReactNode } from 'react';
import type { WorkerRef } from './refs.js';
import type { Model } from './enums.js';

export interface TeammateProps {
  /** WorkerRef from defineWorker() */
  worker: WorkerRef;
  /** Short description shown in task list */
  description: string;
  /** Full instructions - alternative to <Prompt> child */
  prompt?: string;
  /** Model override (optional, defaults to worker's model) */
  model?: Model | string;
  /** Run in background (default: true) */
  background?: boolean;
  /** Children - can be <Prompt> for multi-line instructions */
  children?: ReactNode;
}

/**
 * Defines a team member for Claude Code's swarm system.
 * Must be used inside a <Team> component.
 *
 * Prompt can be specified via:
 * 1. `prompt` prop (for short prompts)
 * 2. `<Prompt>` child (for multi-line prompts) - takes precedence
 *
 * @example
 * // Short prompt via prop
 * <Teammate worker={Security} description="Quick check" prompt="Check for XSS" />
 *
 * @example
 * // Long prompt via <Prompt> child
 * <Teammate worker={Security} description="Security audit">
 *   <Prompt>
 *     Review for security vulnerabilities.
 *
 *     Focus on:
 *     - SQL injection
 *     - XSS
 *     - Auth bypass
 *   </Prompt>
 * </Teammate>
 */
export function Teammate(_props: TeammateProps): null {
  return null;
}
```

---

## Transformer Implementation

### transformTeam

```typescript
// src/parser/transformers/swarm.ts (add to existing file)

import { Node, JsxElement, JsxSelfClosingElement } from 'ts-morph';
import type { TeamNode, TeammateNode } from '../../ir/swarm-nodes.js';
import type { TeamRef } from '../../components/swarm/refs.js';
import { getAttributeValue } from '../utils/index.js';
import type { TransformContext } from './types.js';

/**
 * Transform <Team> to TeamNode
 */
export function transformTeam(
  node: JsxElement,
  ctx: TransformContext
): TeamNode {
  // Only JsxElement (has children), not self-closing
  const opening = node.getOpeningElement();

  // Get team prop - must be a TeamRef
  const teamRef = extractTeamRefProp(opening, 'team', ctx);
  if (!teamRef) {
    throw new Error('Team requires a team prop with TeamRef');
  }

  // Get optional description
  const description = getAttributeValue(opening, 'description') ?? undefined;

  // Transform children - must all be Teammate
  const children: TeammateNode[] = [];
  for (const child of node.getJsxChildren()) {
    if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
      const name = getElementName(child);
      if (name === 'Teammate') {
        children.push(transformTeammate(child, ctx));
      } else {
        throw new Error(`Team only accepts Teammate children, got: ${name}`);
      }
    }
  }

  if (children.length === 0) {
    throw new Error('Team requires at least one Teammate child');
  }

  return {
    kind: 'team',
    team: teamRef,
    description,
    children,
  };
}
```

### transformTeammate

```typescript
/**
 * Transform <Teammate> to TeammateNode
 */
export function transformTeammate(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): TeammateNode {
  const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

  // Get worker prop - must be a WorkerRef
  const workerRef = extractWorkerRefProp(opening, 'worker', ctx);
  if (!workerRef) {
    throw new Error('Teammate requires a worker prop with WorkerRef');
  }

  // Get description (required)
  const description = getAttributeValue(opening, 'description');
  if (!description) {
    throw new Error('Teammate requires a description prop');
  }

  // Get prompt - <Prompt> child takes precedence over prop
  let prompt: string | undefined;
  if (Node.isJsxElement(node)) {
    prompt = extractPromptChild(node, ctx);
  }
  if (!prompt) {
    prompt = getAttributeValue(opening, 'prompt');
  }
  if (!prompt) {
    throw new Error('Teammate requires either a <Prompt> child or prompt prop');
  }

  // Get optional model override
  const model = getAttributeValue(opening, 'model') ?? undefined;

  // Get optional background (default: true)
  const backgroundStr = getAttributeValue(opening, 'background');
  const background = backgroundStr === 'false' ? false : undefined; // Only store if explicitly false

  return {
    kind: 'teammate',
    worker: workerRef,
    description,
    prompt,
    model,
    background,
  };
}

/**
 * Extract <Prompt> child content from Teammate
 */
function extractPromptChild(
  node: JsxElement,
  ctx: TransformContext
): string | undefined {
  for (const child of node.getJsxChildren()) {
    if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
      const name = getElementName(child);
      if (name === 'Prompt') {
        // Extract text content from <Prompt>
        return extractPromptContent(child, ctx);
      }
    }
  }
  return undefined;
}

/**
 * Extract TeamRef from prop value
 */
function extractTeamRefProp(
  opening: JsxOpeningElement | JsxSelfClosingElement,
  propName: string,
  ctx: TransformContext
): TeamRef | null {
  // Implementation: use __id from TeamRef (similar to TaskRef extraction)
}

/**
 * Extract WorkerRef from prop value
 */
function extractWorkerRefProp(
  opening: JsxOpeningElement | JsxSelfClosingElement,
  propName: string,
  ctx: TransformContext
): WorkerRef | null {
  // Implementation: use __id from WorkerRef
}
```

---

## Emitter Implementation

### emitTeam

```typescript
// src/emitter/swarm-emitter.ts (add to existing file)

import type { TeamNode, TeammateNode } from '../ir/swarm-nodes.js';

/**
 * Emit Team to markdown
 */
export function emitTeam(node: TeamNode): string {
  const lines: string[] = [];

  // Team header
  lines.push(`## Team: ${node.team.name}`);
  lines.push('');

  // Description as blockquote
  if (node.description) {
    lines.push(`> ${node.description}`);
    lines.push('');
  }

  // spawnTeam call
  lines.push('```javascript');
  const spawnProps = [`operation: "spawnTeam"`, `team_name: "${node.team.name}"`];
  if (node.description) {
    spawnProps.push(`description: ${JSON.stringify(node.description)}`);
  }
  lines.push(`Teammate({ ${spawnProps.join(', ')} })`);
  lines.push('```');
  lines.push('');

  // Members section
  lines.push('### Members');
  lines.push('');

  // Emit each teammate
  for (const teammate of node.children) {
    lines.push(emitTeammate(teammate, node.team.name));
    lines.push('');
  }

  return lines.join('\n');
}
```

### emitTeammate

```typescript
/**
 * Emit Teammate to markdown
 * @param teamName - Inherited from parent Team
 */
export function emitTeammate(node: TeammateNode, teamName: string): string {
  const lines: string[] = [];

  // Teammate heading
  lines.push(`#### ${node.worker.name}`);
  lines.push('');

  // Task call
  lines.push('```javascript');
  lines.push('Task({');
  lines.push(`  team_name: "${teamName}",`);
  lines.push(`  name: "${node.worker.name}",`);
  lines.push(`  subagent_type: "${node.worker.type}",`);
  lines.push(`  description: ${JSON.stringify(node.description)},`);

  // Prompt - preserve multi-line with template literal
  const promptLines = node.prompt.split('\n');
  if (promptLines.length === 1) {
    lines.push(`  prompt: ${JSON.stringify(node.prompt)},`);
  } else {
    lines.push(`  prompt: \`${node.prompt.replace(/`/g, '\\`')}\`,`);
  }

  // Model (if specified or inherited from worker)
  const model = node.model ?? node.worker.model;
  if (model) {
    lines.push(`  model: "${model}",`);
  }

  // Background - default true
  const runInBackground = node.background ?? true;
  lines.push(`  run_in_background: ${runInBackground}`);
  lines.push('})');
  lines.push('```');

  return lines.join('\n');
}
```

---

## Technical Questions to Resolve

### Critical

#### 1. How to extract WorkerRef/TeamRef from AST?

**Status:** ✅ RESOLVED (same as TaskRef)

Same approach as Phase 2: use `__id` UUID for identity.

```typescript
// WorkerRef and TeamRef already have __id from Phase 1 updates
interface WorkerRef {
  name: string;
  type: string;
  model?: string;
  __id: string;  // UUID for identity
  readonly __isWorkerRef: true;
}
```

Transform extracts `__id` string from AST, stores in IR node.

---

#### 2. Ref Registry Approach

**Status:** 🔴 NEEDS RESOLUTION

**The Problem:**

Unlike TaskRef (where IDs are assigned at emit time), WorkerRef and TeamRef have meaningful `name` values that must be preserved.

**Question:** Do we need a registry to map `__id` → ref, or can we reconstruct refs from AST?

**Analysis:**

For Team/Teammate, we need:
- `WorkerRef.name` → `Task.name`
- `WorkerRef.type` → `Task.subagent_type`
- `WorkerRef.model` → `Task.model`
- `TeamRef.name` → `Teammate.team_name`

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Store full ref object in IR | Simple, all data available | IR stores runtime objects |
| B | Extract all fields from AST | Pure AST approach | Complex extraction |
| C | Registry: defineWorker registers, transform looks up by __id | Clean separation | Global registry state |

**Recommendation:** Option A — Store full ref in IR

Rationale:
- Same approach as Phase 2 (TaskRef stored directly in IR)
- IR is never serialized
- Transform and emit in same process
- Simplest implementation

**Decision:** Store `WorkerRef` and `TeamRef` directly in IR nodes.

---

#### 3. Error Messages for Invalid Nesting

**Status:** ✅ RESOLVED

Transform throws helpful errors:

```typescript
// Teammate outside Team
throw new Error(
  'Teammate must be used inside a Team component. ' +
  'Wrap your Teammate in <Team team={...}>...</Team>'
);

// Non-Teammate inside Team
throw new Error(
  `Team only accepts Teammate children, got: ${name}. ` +
  `Use <Teammate worker={...} description="..." prompt="..." /> inside Team.`
);

// Empty Team
throw new Error(
  'Team requires at least one Teammate child. ' +
  'Add <Teammate worker={...} description="..." prompt="..." /> inside Team.'
);
```

---

### Nice to Have

#### 4. Should Team emit members table?

**Status:** 🔴 NEEDS RESOLUTION

**Question:** Should Team output include a summary table like TaskPipeline?

```markdown
| Name | Type | Model |
|------|------|-------|
| security | security-sentinel | sonnet |
| perf | performance-oracle | - |
```

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | No table, just nested members | Simple, matches GOLDEN_PATH | Less overview |
| B | Add table after members | Better overview | More verbose output |

**Recommendation:** Option A — No table

Rationale:
- GOLDEN_PATH doesn't show table
- Mermaid diagram (Phase 5 Workflow) provides visual overview
- Keep Phase 3 minimal

**Decision:** No summary table in Team output.

---

#### 5. Mermaid Diagram for Team?

**Status:** ✅ RESOLVED

**Question:** Should Team emit a mermaid diagram showing members?

**Decision:** No. Team-level diagrams deferred to Phase 5 (Workflow component).

Rationale:
- GOLDEN_PATH shows mermaid only in Workflow context
- Team is building block, Workflow is visualization
- Keep Phase 3 focused

---

## File Structure

### New Files

```
src/components/swarm/
├── index.ts                    # Add Team, Teammate, Prompt exports
├── Team.tsx                    # Team component (NEW)
├── Teammate.tsx                # Teammate component (NEW)
└── Prompt.tsx                  # Prompt component (NEW)
```

### Modified Files

```
src/ir/swarm-nodes.ts           # Add TeamNode, TeammateNode
src/ir/nodes.ts                 # Add to BlockNode union
src/parser/transformers/swarm.ts    # Add transformTeam, transformTeammate
src/parser/transformers/dispatch.ts # Add Team/Teammate dispatch
src/emitter/swarm-emitter.ts    # Add emitTeam, emitTeammate
src/emitter/emitter.ts          # Add team/teammate case
src/jsx.ts                      # Export Team, Teammate
src/components/swarm/index.ts   # Export new components
```

---

## Testing Strategy

### Unit Tests

1. **Team transformation:**
   ```typescript
   test('transformTeam creates TeamNode with children', () => {
     const source = `
       <Team team={ReviewTeam} description="Review team">
         <Teammate worker={Security} description="Security" prompt="Review..." />
       </Team>
     `;
     const node = transformTeam(parseJsx(source), mockContext);

     expect(node.kind).toBe('team');
     expect(node.description).toBe('Review team');
     expect(node.children).toHaveLength(1);
   });
   ```

2. **Teammate transformation:**
   ```typescript
   test('transformTeammate creates TeammateNode', () => {
     const source = `<Teammate worker={Security} description="Audit" prompt="Review for..." />`;
     const node = transformTeammate(parseJsx(source), mockContext);

     expect(node.kind).toBe('teammate');
     expect(node.description).toBe('Audit');
     expect(node.prompt).toBe('Review for...');
   });
   ```

3. **Model override:**
   ```typescript
   test('Teammate model prop overrides worker model', () => {
     // Worker has Model.Haiku
     const source = `<Teammate worker={Explorer} model={Model.Sonnet} ... />`;
     const node = transformTeammate(parseJsx(source), mockContext);

     expect(node.model).toBe('sonnet');  // Override, not worker's haiku
   });
   ```

4. **Team output format:**
   ```typescript
   test('emitTeam produces correct markdown', () => {
     const node: TeamNode = {
       kind: 'team',
       team: { name: 'review', __id: '...', __isTeamRef: true },
       description: 'Review team',
       children: [/* ... */],
     };
     const output = emitTeam(node);

     expect(output).toContain('## Team: review');
     expect(output).toContain('Teammate({ operation: "spawnTeam"');
   });
   ```

5. **Error handling:**
   ```typescript
   test('throws error for Teammate outside Team', () => {
     expect(() => transformTeammate(parseJsx(`<Teammate ... />`), noTeamContext))
       .toThrow('Teammate must be used inside a Team');
   });

   test('throws error for non-Teammate child in Team', () => {
     const source = `<Team team={ReviewTeam}><div>bad</div></Team>`;
     expect(() => transformTeam(parseJsx(source), mockContext))
       .toThrow('Team only accepts Teammate children');
   });
   ```

### Integration Tests

1. **Full team compile:**
   ```typescript
   test('compiles Team with Teammates to expected markdown', async () => {
     const result = await compile('fixtures/review-team.tsx');
     expect(result).toMatchSnapshot();
   });
   ```

---

## Implementation Order

1. **Update IR nodes** — Add `TeamNode`, `TeammateNode` to `swarm-nodes.ts`
2. **Add to BlockNode union** — `src/ir/nodes.ts`
3. **Implement transformers** — `transformTeam()`, `transformTeammate()`
4. **Add to dispatch** — `src/parser/transformers/dispatch.ts`
5. **Implement emitters** — `emitTeam()`, `emitTeammate()`
6. **Add to main emitter** — `src/emitter/emitter.ts`
7. **Create component stubs** — `Team.tsx`, `Teammate.tsx`, `Prompt.tsx`
8. **Update exports** — `jsx.ts`, `swarm/index.ts`
9. **Write tests** — Unit and integration
10. **Update GOLDEN_PATH.md** — Reflect any decisions that changed output format

---

## Dependencies

- **Phase 1 complete:** `WorkerRef`, `TeamRef`, `defineWorker()`, `defineTeam()`
- **Phase 2 patterns:** Two-pass emit approach, ref identity via `__id`
- No external dependencies

---

## Success Criteria

Phase 3 is complete when:

1. ✅ `<Team>` compiles to `Teammate({ operation: "spawnTeam" })` markdown
2. ✅ `<Teammate>` compiles to `Task({ team_name, name, ... })` markdown
3. ✅ Team context (team_name) flows correctly to nested Teammates
4. ✅ WorkerRef properties map correctly to Task fields
5. ✅ Model override works (Teammate prop > WorkerRef.model)
6. ✅ `run_in_background: true` always emitted for teammates
7. ✅ Transform errors for invalid nesting
8. ✅ All unit and integration tests pass
9. ✅ Documentation updated

---

## Next Steps After Phase 3

Phase 4 (`<ShutdownSequence>`) will:
- Add IR node: `shutdownSequenceNode`
- Add transformer: `transformShutdownSequence()`
- Add emitter: emit `Teammate({ operation: "requestShutdown" })` and `Teammate({ operation: "cleanup" })`
- Consume `WorkerRef[]` for shutdown targets

---

## Resolution Summary

| ID | Issue | Decision |
|----|-------|----------|
| DP-1 | Team context for Teammate | ✅ IR nesting (TeamNode contains TeammateNode[]) |
| DP-2 | Standalone Teammate | ✅ Require inside Team (error otherwise) |
| DP-3 | WorkerRef vs inline | ✅ WorkerRef only (no inline props) |
| DP-4 | Prompt handling | ✅ Prop only (no `<Prompt>` child) |
| DP-5 | Model override | ✅ Teammate prop overrides WorkerRef.model |
| DP-6 | run_in_background | ✅ Always true (no prop) |
| DP-7 | Team description | ✅ Prop on `<Team>`, not in TeamRef |
| DP-8 | subagent_type mapping | ✅ WorkerRef.type used directly |
| INC-1 | Output format | 🔴 TO RESOLVE: Match GOLDEN_PATH |
| INC-2 | description vs prompt | ✅ Both required, distinct purposes |
| INC-3 | Prompt child | ✅ Deferred (prop only in Phase 3) |
| INC-4 | Additional props | ✅ GOLDEN_PATH props only |
| INC-5 | Team members validation | ✅ Children are source of truth |
| TQ-1 | Ref extraction | ✅ Same as TaskRef (__id approach) |
| TQ-2 | Ref registry | ✅ Store full ref in IR |
| TQ-3 | Error messages | ✅ Helpful errors defined |
| TQ-4 | Members table | ✅ No table |
| TQ-5 | Mermaid diagram | ✅ Deferred to Phase 5 |

---

## Open Questions for User

Before starting implementation, resolve:

1. **INC-1: Output Format** — Should we match GOLDEN_PATH exactly, or use simplified format from specs?
   - GOLDEN_PATH shows `subagent_type: "compound-engineering:review:security-sentinel"`
   - Specs show `subagent_type: "security-sentinel"`

   **Recommendation:** Use full path (GOLDEN_PATH) since that's what Claude Code expects.

2. **GOLDEN_PATH Updates** — Phase 2 resolved several incoherences that should be backported to GOLDEN_PATH. Should we update GOLDEN_PATH before Phase 3, or continue and update all at end?

   **Recommendation:** Update GOLDEN_PATH now to avoid accumulating drift.

---

## Additional Incoherences Found (Deep Review)

After thorough review against `swarm-claude-code.md`, `GOLDEN_PATH.md`, and specs, these additional issues require discussion.

---

### INC-6. Team Prop Naming: `team` vs `ref`

**Status:** 🔴 NEEDS RESOLUTION

**Sources:**

| Source | Prop Name | Example |
|--------|-----------|---------|
| **GOLDEN_PATH** | `team` | `<Team team={ReviewTeam}>` |
| **Specs (Team.spec.tsx)** | `ref` | `<Team ref={ReviewTeam}>` |
| **Phase 3 Planning** | `team` | Following GOLDEN_PATH |

**Question:** Which prop name should we use?

**Options:**

| Option | Prop | Pros | Cons |
|--------|------|------|------|
| A | `team` | Matches GOLDEN_PATH, semantic | Differs from specs |
| B | `ref` | Matches specs pattern | "ref" is confusing (React uses ref differently) |
| C | Support both | Maximum compatibility | Two ways to do same thing |

**Recommendation:** Option A — Use `team` prop (GOLDEN_PATH)

**Rationale:**
- `team` is more semantic and clear
- `ref` conflicts with React's ref concept
- GOLDEN_PATH is the authoritative design doc

---

### INC-7. Teammate: Inline Props vs WorkerRef Only

**Status:** 🔴 NEEDS RESOLUTION

**Sources:**

| Source | Pattern | Example |
|--------|---------|---------|
| **GOLDEN_PATH** | WorkerRef only | `<Teammate worker={Security} ...>` |
| **Specs** | Both patterns | `<Teammate worker={Security}>` OR `<Teammate name="x" type="y">` |
| **Phase 3 Planning** | WorkerRef only | Decision DP-3 |

**Specs explicitly mark as "legacy, still supported":**
```tsx
// Pattern 4: Simple inline (legacy, still supported)
<Teammate name="reviewer-1" type="general-purpose">
```

**Question:** Should Phase 3 support inline pattern for backward compatibility?

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | WorkerRef only (current decision) | Clean API, enforces best practice | Not backward compatible with specs |
| B | Support both | Matches specs, flexible | Two patterns, more complex |
| C | WorkerRef only, add inline in future | Start clean, extend later | May never add |

**Recommendation:** Option A — WorkerRef only (maintain current decision)

**Rationale:**
- Specs mark inline as "legacy"
- GOLDEN_PATH uses WorkerRef only
- Single pattern = simpler docs and implementation
- No existing code to be backward compatible with

---

### INC-8. Prompt: `prompt` Prop vs `<Prompt>` Child

**Status:** 🔴 NEEDS RESOLUTION — MAJOR DIFFERENCE

**Sources:**

| Source | Pattern | Example |
|--------|---------|---------|
| **GOLDEN_PATH** | `prompt` prop | `<Teammate prompt="..." />` |
| **Specs** | `<Prompt>` child | `<Teammate><Prompt>...</Prompt></Teammate>` |
| **Phase 3 Planning** | `prompt` prop only | Decision DP-4 |

**This is a significant divergence.** Specs strongly prefer `<Prompt>` child:

```tsx
// Specs pattern (Teammate.spec.tsx)
<Teammate worker={SecurityAuditor}>
  <Prompt>Review code for security vulnerabilities</Prompt>
</Teammate>

// GOLDEN_PATH pattern
<Teammate
  worker={Security}
  description="Security audit"
  prompt={`Review for security...`}
/>
```

**Question:** Which pattern should Phase 3 implement?

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | `prompt` prop only (current) | Simple, matches GOLDEN_PATH | Multiline prompts awkward |
| B | `<Prompt>` child only | Better for long prompts, matches specs | Different from GOLDEN_PATH |
| C | Support both | Maximum flexibility | Two patterns, precedence confusion |
| D | `<Prompt>` child preferred, `prompt` prop fallback | Best of both | More complex, clear precedence |

**Recommendation:** Option D — Support both, `<Prompt>` child takes precedence

**Rationale:**
- `<Prompt>` is much better for multi-line prompts (common case)
- Specs have detailed patterns for `<Prompt>` (vars, templates, etc.)
- `prompt` prop works for simple one-liners
- Clear precedence: child > prop

**Implementation:**
```typescript
// If Teammate has <Prompt> child, use it
// Otherwise, use prompt prop
const prompt = extractPromptChild(node) ?? getAttributeValue(opening, 'prompt');
```

**Impact:** Phase 3 Planning decision DP-4 needs revision.

---

### INC-9. Teammate `description` Prop Missing from Specs

**Status:** 🔴 NEEDS RESOLUTION

**Sources:**

| Source | Has `description` prop? | Notes |
|--------|-------------------------|-------|
| **GOLDEN_PATH** | Yes | `description="Security audit"` |
| **Specs** | No | Only shows `<Prompt>` child |
| **Claude Code doc** | Yes | `Task({ description: "..." })` |

**Specs output does NOT show `description` field:**
```javascript
// Specs Teammate output
Task({
  team_name: "{team}",
  name: "worker",
  subagent_type: "general-purpose",
  prompt: `Complete assigned tasks`,
  run_in_background: true
})
// NO description field!
```

**GOLDEN_PATH output DOES show `description`:**
```javascript
Task({
  team_name: "pr-review",
  name: "security",
  subagent_type: "...",
  description: "Security audit",  // ← Present
  prompt: `...`,
  run_in_background: true
})
```

**Question:** Should Teammate have `description` prop?

**Analysis from Claude Code doc:**
```javascript
// Claude Code Task API
Task({
  subagent_type: "Explore",
  description: "Find auth files",  // Used for task summary/logs
  prompt: "Find all authentication-related files"
})
```

Both `description` and `prompt` serve different purposes in Claude Code.

**Recommendation:** Keep `description` prop (follow GOLDEN_PATH + Claude Code doc)

**Rationale:**
- Claude Code uses both fields
- `description` = short summary for UI/logs
- `prompt` = full instructions
- Specs appear to be incomplete/simplified

---

### INC-10. `background` Prop vs Always True

**Status:** 🔴 NEEDS RESOLUTION

**Sources:**

| Source | Approach | Default |
|--------|----------|---------|
| **GOLDEN_PATH** | Has `background` prop | `true` |
| **Specs** | Has `background` prop | `true` |
| **Phase 3 Planning** | No prop, always `true` | N/A |

**GOLDEN_PATH Teammate props table:**
```
| `background` | `boolean` | No | `Task.run_in_background` (default: true) |
```

**Specs TeammateProps:**
```typescript
/**
 * Whether to run in background
 * @default true
 */
background?: boolean;
```

**Question:** Should we expose `background` prop or always emit `true`?

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Always `true` (current) | Simple, teammates are always async | Can't do sync teammate |
| B | Optional prop, default `true` | Matches specs/GOLDEN_PATH, flexible | Rarely needed |

**Recommendation:** Option B — Add optional `background` prop, default `true`

**Rationale:**
- Both GOLDEN_PATH and specs show it as optional
- Edge case: sync teammate for quick checks (specs show `background={false}` example)
- Low implementation cost

**Impact:** Phase 3 Planning decision DP-6 needs revision.

---

### INC-11. subagent_type: Full Path vs Short Name

**Status:** 🔴 NEEDS RESOLUTION

**Sources:**

| Source | Format | Example |
|--------|--------|---------|
| **Claude Code doc** | Full path | `"compound-engineering:review:security-sentinel"` |
| **GOLDEN_PATH** | Full path | `"compound-engineering:review:security-sentinel"` |
| **Specs output** | Short name | `"security-sentinel"` |

**Question:** What's the correct subagent_type format?

**Claude Code doc is authoritative:**
```javascript
// From swarm-claude-code.md
Task({
  subagent_type: "compound-engineering:review:security-sentinel",
  ...
})
```

**Recommendation:** Use full path (Claude Code doc + GOLDEN_PATH)

**Rationale:**
- Claude Code doc is the API source of truth
- Specs output appears to be simplified/incomplete
- WorkerRef.type already stores full path (Phase 1 decision)

---

### INC-12. Phase 1 `__id` Implementation Status

**Status:** 🟡 NEEDS VERIFICATION

**Phase 2 Planning decided:**
- Add `__id: string` (UUID) to TaskRef, WorkerRef, TeamRef
- Required for identity-based resolution

**Question:** Was Phase 1 actually updated with these changes?

**Required updates (from Phase 2 Planning):**
1. `TaskRef` — add `name?: string` and `__id: string`
2. `defineTask()` — change to `defineTask(subject, name?)`
3. `WorkerRef` — add `__id: string`
4. `TeamRef` — add `__id: string`

**Action:** Verify Phase 1 implementation before starting Phase 3.

---

### INC-13. Specs Show Additional Features Not in GOLDEN_PATH

**Status:** 🟡 FOR FUTURE REFERENCE

Features in specs but not in GOLDEN_PATH (defer to future phases):

| Feature | Specs Location | Priority |
|---------|---------------|----------|
| `<Prompt vars={...}>` | Prompt.spec.tsx | Low — convenience |
| `createPromptTemplate()` | Prompt.spec.tsx | Low — convenience |
| `createReviewWorkflow()` | Team.spec.tsx | Medium — builder pattern |
| `batchWorkers()` | Team.spec.tsx | Low — convenience |
| `addToTeam()` | Team.spec.tsx | Low — convenience |

**Decision:** Phase 3 implements GOLDEN_PATH features only. These can be added in future phases.

---

### INC-14. Specs Support Both `worker` Prop AND Inline Props

**Status:** 🔴 NEEDS CLARIFICATION

**Specs TeammateProps shows:**
```typescript
interface TeammateProps {
  worker?: WorkerRef;  // Optional!
  name?: string;       // Optional if worker provided
  type: AgentType | PluginAgentType | string;  // REQUIRED
  // ...
}
```

**Issue:** `type` is marked as required, but comment says it's optional if `worker` provided.

**Actual behavior implied:**
- If `worker` provided → `name`, `type`, `model` extracted from WorkerRef
- If `worker` not provided → `name` and `type` required

**Question:** Should Phase 3 implement this flexible pattern?

**Recommendation:** No — WorkerRef only (maintain DP-3 decision)

**Rationale:**
- GOLDEN_PATH uses WorkerRef only
- Specs mark inline as "legacy"
- Single pattern simplifies implementation

---

## Final Resolution Summary

| ID | Issue | Status | Decision |
|----|-------|--------|----------|
| DP-1 | Team context for Teammate | ✅ | IR nesting |
| DP-2 | Standalone Teammate | ✅ | Require inside Team |
| DP-3 | WorkerRef vs inline | ✅ | WorkerRef only |
| DP-4 | Prompt handling | ✅ | Support both `<Prompt>` child AND `prompt` prop (child takes precedence) |
| DP-5 | Model override | ✅ | Teammate prop overrides WorkerRef.model |
| DP-6 | run_in_background | ✅ | Add optional `background` prop, default `true` |
| DP-7 | Team description | ✅ | Prop on `<Team>` |
| DP-8 | subagent_type mapping | ✅ | Full path from WorkerRef.type |
| INC-1 | Output format | ✅ | Full path for subagent_type |
| INC-2 | description vs prompt | ✅ | Both required |
| INC-3 | Prompt child | ✅ | Support `<Prompt>` child (takes precedence over prop) |
| INC-4 | Additional props | ✅ | GOLDEN_PATH props only |
| INC-5 | Team members validation | ✅ | Children are source of truth |
| INC-6 | Team prop naming | ✅ | Use `team` prop |
| INC-7 | Inline props support | ✅ | WorkerRef only |
| INC-8 | Prompt pattern | ✅ | Support both, child preferred |
| INC-9 | description prop | ✅ | Keep `description` prop |
| INC-10 | background prop | ✅ | Add optional `background` prop, default `true` |
| INC-11 | subagent_type format | ✅ | Full path |
| INC-12 | Phase 1 __id status | ✅ | Verified implemented |
| INC-13 | Additional specs features | 🟡 | Defer to future |
| INC-14 | Flexible props | ✅ | WorkerRef only |

---

## Questions Resolved

All questions have been discussed and resolved.

| Question | Decision | Rationale |
|----------|----------|-----------|
| **INC-8** Prompt Pattern | Support both `<Prompt>` child AND `prompt` prop | Child takes precedence. Better for multi-line prompts. |
| **INC-10** background Prop | Add optional `background?: boolean`, default `true` | Matches GOLDEN_PATH and specs. Allows sync teammates. |
| **INC-12** Phase 1 `__id` | ✅ Verified implemented | TaskRef, WorkerRef, TeamRef all have `__id` fields. |
| **INC-6** Team Prop Name | Use `team` prop | Semantic naming. Avoids React `ref` conflict. |
| **INC-11** subagent_type Format | Full path | e.g. `"compound-engineering:review:security-sentinel"`. Matches Claude Code doc. |
