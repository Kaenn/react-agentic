# Phase 37: SpawnAgent Enhancement + Integration - Research

**Phase:** 37-spawnagent-enhancement-integration
**Researched:** 2026-02-01
**Domain:** React TypeScript compiler enhancements for agent self-reading pattern + integration validation
**Confidence:** HIGH

## Summary

This phase enhances `SpawnAgent` with an agent self-reading capability and validates end-to-end integration of all v3.1 meta-prompting components. The enhancement follows an established pattern from the GSD project where agents receive a pre-prompt instruction to read their own definition file before executing.

**Core Implementation:**
- Add `readAgentFile` boolean prop to `SpawnAgent` that prepends "First, read {path} for your role and instructions." to the prompt
- Path is derived from agent name + configurable agents directory (default: `~/.claude/agents/`)
- TypeScript conditional types enforce that `readAgentFile` requires the `agent` prop (can't self-read inline agents)
- Build config schema extension for `agentsDir` setting

**Integration Validation:**
- New test file `v31-integration.test.ts` validates component pairs work together
- Focus on MetaPrompt → SpawnAgent flow (ReadFile + ComposeContext → agent consumption)
- Snapshot-based testing for full compiled output structure

**Primary recommendation:** Implement as minimal enhancement to existing SpawnAgent transformer + emitter with TypeScript guard rails. Integration tests should be pragmatic - cover critical paths without exhaustive combinatorial testing.

## Standard Stack

The implementation uses existing project infrastructure. No external libraries needed.

### Core Technologies

| Component | Version | Purpose | Status |
|-----------|---------|---------|--------|
| ts-morph | ^24.0.0 | TypeScript AST manipulation for prop extraction | Already used in project |
| vitest | ^2.2.0 | Testing framework for integration tests | Already configured |
| TypeScript | ^5.7.3 | Conditional types for compile-time validation | Already used |

### Project Architecture

```
src/
├── components/Agent.ts         # Add readAgentFile prop + types
├── parser/transformers/
│   └── spawner.ts              # Extract and validate readAgentFile prop
├── emitter/
│   └── runtime-markdown-emitter.ts  # Emit self-reading instruction
├── cli/config.ts               # Add agentsDir to ReactAgenticConfig
└── ir/runtime-nodes.ts         # Add readAgentFile?: boolean to SpawnAgentNode

tests/
└── composites/
    └── v31-integration.test.ts  # NEW - End-to-end integration tests
```

## Architecture Patterns

### Pattern 1: Self-Reading Agent Instruction

**What:** Prepend a fixed instruction to the agent prompt that tells it to read its own definition file.

**When to use:** When `readAgentFile={true}` prop is present on SpawnAgent.

**Implementation flow:**

1. **Transformer phase** (`spawner.ts`):
   - Extract `readAgentFile` attribute (boolean)
   - Validate: if `readAgentFile === true`, require `agent` prop exists and is not inline
   - Pass through to SpawnAgentNode IR

2. **Emitter phase** (`runtime-markdown-emitter.ts`):
   - Construct path: `{agentsDir}/{agentName}.md` (agentsDir from build config)
   - Prepend instruction: `"First, read {path} for your role and instructions.\n\n"`
   - Prepend to prompt content before escaping for Task() call

**Example output:**

```markdown
Task(
  prompt="First, read ~/.claude/agents/gsd-phase-researcher.md for your role and instructions.\n\n<objective>Research phase 37</objective>",
  subagent_type="gsd-phase-researcher",
  model="sonnet",
  description="Research implementation approach"
)
```

**Source:** Derived from `/Users/glenninizan/workspace/get-shit-done/commands/gsd/plan-phase.md` line 643 in emitter.

### Pattern 2: TypeScript Conditional Type Enforcement

**What:** Use TypeScript conditional types to make `readAgentFile` require the `agent` prop.

**When to use:** Type definitions for SpawnAgentProps.

**Strategy:**

Since TypeScript doesn't support conditional prop requirements within a single interface (can't say "if readAgentFile is true, then agent is required"), we rely on runtime validation in the transformer. The type system provides basic guidance:

```typescript
// In src/components/Agent.ts
export interface SpawnAgentProps<TInput = unknown> {
  agent: string | AgentRef<TInput>;  // Already required
  readAgentFile?: boolean;           // Optional flag
  // ... other props
}
```

**Validation enforcement:**
- TypeScript: `agent` is already a required prop, so basic type checking is automatic
- Runtime (transformer): Check that when `readAgentFile === true`, the agent is NOT an inline agent
- Error message guides user to use AgentRef or string agent name

**Alternative considered:** Discriminated union types with separate interfaces for `readAgentFile: true` vs `readAgentFile: false`. Rejected as overly complex for minimal type safety gain (agent is already required).

### Pattern 3: Build Configuration Extension

**What:** Add `agentsDir` field to `ReactAgenticConfig` for configuring the agents directory path.

**When to use:** When users want to customize where agent definition files are stored (default: `~/.claude/agents/`).

**Implementation:**

```typescript
// src/cli/config.ts
export interface ReactAgenticConfig {
  outputDir: string;
  runtimeDir: string;
  minify: boolean;
  codeSplit: boolean;
  agentsDir: string;  // NEW - default: '~/.claude/agents/'
}

export const DEFAULT_CONFIG: ReactAgenticConfig = {
  outputDir: DEFAULT_OUTPUT_DIR,
  runtimeDir: DEFAULT_RUNTIME_DIR,
  minify: false,
  codeSplit: false,
  agentsDir: '~/.claude/agents/',  // NEW
};
```

**Usage in loadConfigFile:**
- Parse `agentsDir` from JSON config if present
- Pass through to emitter context
- Emitter uses this value when constructing self-reading paths

### Pattern 4: Integration Test Structure

**What:** Snapshot-based integration tests that validate full compilation pipeline.

**When to use:** Testing that component combinations produce correct markdown output.

**Test organization:**

```typescript
// tests/composites/v31-integration.test.ts
describe('v3.1 Integration Tests', () => {
  describe('MetaPrompt + SpawnAgent', () => {
    it('should compile ReadFile with SpawnAgent consumption', () => {
      // Test that MetaPrompt's ReadFile + ComposeContext emits valid XML
      // that SpawnAgent can consume as structured input
    });
  });

  describe('SpawnAgent self-reading', () => {
    it('should emit self-reading instruction when readAgentFile=true', () => {
      // Snapshot test for the prepended instruction format
    });

    it('should error when readAgentFile=true with inline agent', () => {
      // Validation test - can't self-read if no agent file exists
    });
  });

  describe('Full end-to-end scenario', () => {
    it('should compile command with Uses + Init + MetaPrompt + SpawnAgent + HandleReturn', () => {
      // Comprehensive test using all v3.1 components together
    });
  });
});
```

**Snapshot testing approach:**
- Use vitest's `expect(output).toMatchSnapshot()` for full markdown comparison
- Snapshots catch unintended emission changes
- Update snapshots when intentional changes are made

**Component pair coverage (beyond mandatory):**
- MetaPrompt → SpawnAgent (mandatory - validates context flow)
- Uses → Init (validates imports work with state initialization)
- StructuredReturns → OnStatus (validates status handling roundtrip)
- All contract components together (Role + UpstreamInput + DownstreamConsumer + Methodology + StructuredReturns)

### Anti-Patterns to Avoid

**Don't validate inline agents:** The compile error should specifically prevent `readAgentFile` on inline agents (agents defined with JSX children rather than separate files). The error message should be: "readAgentFile requires a named agent (string or AgentRef). Inline agents cannot read themselves."

**Don't make agentsDir per-component:** The agents directory is a build-time configuration, not a runtime prop. It should come from the config file, not from individual SpawnAgent components. This ensures consistency across all agent spawns in a project.

**Don't over-test combinations:** Integration tests should focus on realistic usage patterns, not exhaustive combinatorial testing. Test the critical paths that users will actually use.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript conditional props | Custom validation decorators | Runtime transformer validation | TypeScript's type system has limitations for conditional prop requirements within a single interface. Runtime validation is clearer and provides better error messages. |
| Config file parsing | Custom JSON parser | Existing `loadConfigFile` pattern | The project already has robust config loading with validation. Extend the existing pattern. |
| Path resolution | Custom path handling | Node.js `path.join()` + tilde expansion | Path manipulation is error-prone. Use established Node.js utilities. |

**Key insight:** TypeScript's type system is powerful but has limits. When types can't express a constraint, runtime validation with clear error messages is better than complex type gymnastics that confuse users.

## Common Pitfalls

### Pitfall 1: Forgetting to Expand Tilde in Paths

**What goes wrong:** Default `agentsDir: '~/.claude/agents/'` won't work because shell commands need actual home directory path.

**Why it happens:** Node.js doesn't auto-expand `~` like shells do.

**How to avoid:**
- In emitter, expand `~` to actual home directory before constructing full path
- Use `os.homedir()` or check for leading `~` and replace
- Example: `agentsDir.startsWith('~') ? agentsDir.replace('~', os.homedir()) : agentsDir`

**Warning signs:** Tests pass but actual command execution fails with "file not found" on `~/.claude/agents/...`

### Pitfall 2: Not Escaping Newlines in Prompt

**What goes wrong:** The self-reading instruction uses `\n\n` to separate from the rest of the prompt, but if not escaped properly in the Task() call, it breaks the markdown code block.

**Why it happens:** The emitter uses `escapeQuotes` but must also preserve literal `\n` characters in the string.

**How to avoid:**
- Use double newline `\\n\\n` in the emitted string to represent literal newlines
- Example: `"First, read {path} for your role and instructions.\\n\\n{restOfPrompt}"`
- The bash interpreter will then correctly parse these as newlines in the prompt string

**Warning signs:** Generated markdown has broken code blocks, or the agent prompt has literal `\n` text instead of newlines.

### Pitfall 3: Inline Agent Detection Edge Cases

**What goes wrong:** Validation allows `readAgentFile` on agents that have no file (e.g., string agent name without corresponding .md file).

**Why it happens:** The compiler can't verify file existence at compile time, only whether it's an inline vs file-based agent definition.

**How to avoid:**
- Only validate that `agent` prop is a string or AgentRef (not children-based)
- Don't try to verify file existence at compile time
- Runtime will fail gracefully if file doesn't exist (agent reads and gets error)
- Error message should clarify: "readAgentFile requires agent={...} to be a file path or AgentRef"

**Warning signs:** Confusing error messages that conflate "no agent prop" with "agent file doesn't exist"

### Pitfall 4: Config Not Propagated to Emitter

**What goes wrong:** `agentsDir` is read from config but not passed through the build pipeline to the emitter.

**Why it happens:** The emitter receives a separate context object, and config needs to be threaded through.

**How to avoid:**
- Add `agentsDir` to emitter options/context
- Trace config flow: CLI → buildCommand → processFile → buildRuntimeFile → emitter
- Ensure config is threaded through each step

**Warning signs:** Tests use hardcoded `~/.claude/agents/` even when config specifies different path.

## Code Examples

Verified patterns from the existing codebase:

### Example 1: Extracting Boolean Prop (from spawner.ts)

```typescript
// Pattern for extracting readAgentFile boolean prop
function extractReadAgentFileProp(
  element: JsxOpeningElement | JsxSelfClosingElement,
  agentName: string | undefined,
  ctx: TransformContext
): boolean {
  const attr = element.getAttribute('readAgentFile');
  if (!attr || !Node.isJsxAttribute(attr)) {
    return false;
  }

  const init = attr.getInitializer();

  // Case 1: Boolean shorthand - readAgentFile (no value = true)
  if (!init) {
    validateCanSelfRead(agentName, element, ctx);
    return true;
  }

  // Case 2: JSX expression - readAgentFile={true|false}
  if (Node.isJsxExpression(init)) {
    const expr = init.getExpression();
    if (expr && expr.getText() === 'true') {
      validateCanSelfRead(agentName, element, ctx);
      return true;
    }
    if (expr && expr.getText() === 'false') {
      return false;
    }
  }

  throw ctx.createError(
    'readAgentFile must be a boolean (true or false)',
    element
  );
}

function validateCanSelfRead(
  agentName: string | undefined,
  element: JsxOpeningElement | JsxSelfClosingElement,
  ctx: TransformContext
): void {
  if (!agentName) {
    throw ctx.createError(
      'readAgentFile requires agent prop to be specified',
      element
    );
  }
  // Note: We can't detect "inline" agents at transformer level
  // The agent prop being present is sufficient validation
}
```

**Source:** Adapted from `extractLoadFromFileProp` pattern in `src/parser/transformers/spawner.ts` lines 296-369.

### Example 2: Emitting Self-Reading Instruction

```typescript
// In runtime-markdown-emitter.ts, emitSpawnAgent method
private emitSpawnAgent(node: SpawnAgentNode): string {
  const escapeQuotes = (s: string): string => s.replace(/"/g, '\\"');

  // Build base prompt content
  let promptContent: string;
  if (node.prompt) {
    promptContent = node.prompt;
  } else if (node.input) {
    promptContent = this.formatInput(node.input);
  } else {
    promptContent = '';
  }

  // Handle readAgentFile
  if (node.readAgentFile) {
    const agentName = typeof node.agent === 'string'
      ? node.agent
      : node.agent.varName; // RuntimeVarRefNode case

    // Construct path using config's agentsDir
    const agentsDir = this.config.agentsDir || '~/.claude/agents/';
    const expandedDir = agentsDir.startsWith('~')
      ? agentsDir.replace('~', require('os').homedir())
      : agentsDir;

    const agentFilePath = `${expandedDir}/${agentName}.md`;

    // Prepend self-reading instruction
    const instruction = `First, read ${agentFilePath} for your role and instructions.\\n\\n`;
    promptContent = instruction + promptContent;
  }

  const promptOutput = `"${escapeQuotes(promptContent)}"`;

  // ... rest of Task() emission
}
```

**Source:** Adapted from existing `emitSpawnAgent` in `src/emitter/runtime-markdown-emitter.ts` lines 624-669, with loadFromFile pattern as reference.

### Example 3: Config Extension

```typescript
// In src/cli/config.ts

export interface ReactAgenticConfig {
  outputDir: string;
  runtimeDir: string;
  minify: boolean;
  codeSplit: boolean;
  agentsDir: string;  // NEW
}

export const DEFAULT_CONFIG: ReactAgenticConfig = {
  outputDir: DEFAULT_OUTPUT_DIR,
  runtimeDir: DEFAULT_RUNTIME_DIR,
  minify: false,
  codeSplit: false,
  agentsDir: '~/.claude/agents/',  // NEW - matches GSD convention
};

// In loadConfigFile function, add validation
if (typeof parsed.agentsDir === 'string') {
  config.agentsDir = parsed.agentsDir;
}
```

**Source:** Adapted from existing config pattern in `src/cli/config.ts` lines 16-75.

### Example 4: Integration Test Snapshot

```typescript
// tests/composites/v31-integration.test.ts

import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { buildRuntimeFile } from '../../src/cli/runtime-build.js';

describe('v3.1 Integration - SpawnAgent Self-Reading', () => {
  it('should emit self-reading instruction', async () => {
    const project = new Project({ useInMemoryFileSystem: true });

    const source = `
      import { Command, SpawnAgent } from 'react-agentic';

      export default function TestCommand() {
        return (
          <Command name="test" description="Test command">
            <SpawnAgent
              agent="gsd-phase-researcher"
              model="sonnet"
              description="Research phase"
              readAgentFile
              prompt="Research context here"
            />
          </Command>
        );
      }
    `;

    const sourceFile = project.createSourceFile('test.tsx', source);
    const result = await buildRuntimeFile(sourceFile, project, {
      commandsOut: '.claude/commands',
      runtimeOut: '.claude/runtime',
    });

    // Snapshot the markdown output
    expect(result.markdown).toMatchSnapshot();

    // Also verify specific instruction is present
    expect(result.markdown).toContain('First, read ~/.claude/agents/gsd-phase-researcher.md');
  });
});
```

**Source:** Adapted from test patterns in `tests/composites/spawn-agent.test.ts` and build patterns from `src/cli/commands/build.ts`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual prompt construction | `loadFromFile` pattern with `general-purpose` agent | v1.8-v2.0 | Enabled file-based agent definitions, but required agent type override |
| `loadFromFile` with path override | `readAgentFile` with config-based path | Phase 37 (v3.1) | Cleaner API - agent keeps its own name, config controls directory |
| Inline agent definitions only | AgentRef pattern with file paths | v1.1-v2.0 | Type-safe agent references with compile-time validation |

**Current state (v3.0):**
- SpawnAgent supports `loadFromFile` which overrides agent to `general-purpose` and prepends file-read instruction
- Works well but loses the specific agent name in Task() call
- Config-based directories exist for commands/runtime but not agents

**Phase 37 enhancement:**
- `readAgentFile` keeps original agent name
- Agents directory configurable via build config
- Better alignment with GSD's actual usage pattern

## Open Questions

None - all design decisions were resolved during the discuss phase. The CONTEXT.md provides complete implementation guidance.

## Sources

### Primary (HIGH confidence)

**Codebase analysis:**
- `/Users/glenninizan/workspace/react-agentic/react-agentic/src/components/Agent.ts` - Current SpawnAgent props interface
- `/Users/glenninizan/workspace/react-agentic/react-agentic/src/parser/transformers/spawner.ts` - Transformer extraction patterns
- `/Users/glenninizan/workspace/react-agentic/react-agentic/src/emitter/runtime-markdown-emitter.ts` - Current SpawnAgent emission (lines 624-669)
- `/Users/glenninizan/workspace/react-agentic/react-agentic/src/cli/config.ts` - Config loading patterns
- `/Users/glenninizan/workspace/react-agentic/react-agentic/src/ir/runtime-nodes.ts` - SpawnAgentNode IR definition

**Reference implementation:**
- `/Users/glenninizan/workspace/get-shit-done/commands/gsd/plan-phase.md` - Real-world usage of agent self-reading pattern

**User decisions:**
- `.planning/phases/37-spawnagent-enhancement-integration/37-CONTEXT.md` - Complete implementation decisions from discuss phase

### Secondary (MEDIUM confidence)

**Test patterns:**
- `tests/composites/spawn-agent.test.ts` - Current testing approach for composites
- `tests/composites/control-flow.test.ts` - Integration test patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - uses existing project dependencies
- Architecture: HIGH - extends established patterns (loadFromFile, config extension)
- Pitfalls: HIGH - based on common path/escaping issues in similar code
- TypeScript patterns: MEDIUM - conditional types have limitations, runtime validation is clearer

**Research approach:**
- Analyzed existing codebase patterns for SpawnAgent, config, and transformers
- Reviewed user decisions in CONTEXT.md for locked choices
- Examined reference implementation (GSD plan-phase.md) for real-world usage
- Identified TypeScript type system constraints for conditional props

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (stable - internal compiler enhancement, not dependent on external ecosystem)
