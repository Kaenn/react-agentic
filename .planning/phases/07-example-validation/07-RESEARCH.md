# Phase 7: Example Validation - Research

**Researched:** 2026-01-21
**Domain:** TSX example authoring and Claude Code command format validation
**Confidence:** HIGH

## Summary

Phase 7 is a validation phase that fixes and demonstrates the react-agentic transpiler with a comprehensive example. The existing `docs/examples/command.tsx` file has a fundamental JSX syntax error: the `<Command>` element is self-closing on line 8, leaving subsequent content as orphan JSX that the parser cannot find.

The fix is straightforward: restructure the example to have all content inside the Command wrapper, using valid JSX syntax. The example should then demonstrate all supported features to serve as both validation and documentation.

**Primary recommendation:** Fix the JSX structure to place all content inside `<Command>` tags, then expand to demonstrate headings, lists, formatting, XML blocks, and raw markdown.

## Standard Stack

No additional libraries needed. This phase uses existing transpiler functionality.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-agentic | 0.1.0 | Transpiler under test | The tool being validated |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.0.17 | Test runner | For regression tests on example |

## Architecture Patterns

### Example File Structure
```tsx
// Valid TSX structure for react-agentic commands
export default function CommandName() {
  return (
    <Command
      name="command-name"
      description="Command description"
      allowedTools={["Tool1", "Tool2"]}
    >
      {/* All content INSIDE Command tags */}
      <h2>Section Title</h2>
      <p>Paragraph content with <b>bold</b> and <i>italic</i>.</p>

      <ul>
        <li>List item</li>
      </ul>

      <div name="custom-section">
        <p>XML block content</p>
      </div>

      <Markdown>
        ## Raw markdown passthrough
      </Markdown>
    </Command>
  );
}
```

### Output Format (Claude Code Command)
```markdown
---
name: command-name
description: Command description
allowed-tools:
  - Tool1
  - Tool2
---

## Section Title

Paragraph content with **bold** and *italic*.

- List item

<custom-section>
Content here
</custom-section>

## Raw markdown passthrough
```

### Anti-Patterns to Avoid
- **Self-closing Command with sibling content:** `<Command ... /><h2>Title</h2></Command>` is invalid JSX
- **Content outside Command wrapper:** All blocks must be children of Command
- **Missing export:** File must have `export default function` or `export function` for parser to find JSX

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Example validation | Manual inspection | Build command execution | CLI shows actual errors |
| Markdown verification | Visual diff | Snapshot testing | Catches regressions |

## Common Pitfalls

### Pitfall 1: Self-closing Command Tags
**What goes wrong:** Writing `<Command ... />` followed by content, expecting content to be inside Command
**Why it happens:** Confusion between self-closing (`/>`) and opening-without-closing tags
**How to avoid:** Use `<Command>content</Command>` pattern always when content is needed
**Warning signs:** Parser returns "No JSX element found" because the JSX after self-closing tag is invalid

### Pitfall 2: JSX Whitespace Between Inline Elements
**What goes wrong:** Space lost between `</b>` and following text: `<b>bold</b> text` renders as `**bold**text`
**Why it happens:** JSX collapses whitespace around tags differently than HTML
**How to avoid:** Use JSX expressions for explicit spacing: `<b>bold</b>{' '}text`
**Warning signs:** Words running together in output

### Pitfall 3: Curly Braces in Code Blocks
**What goes wrong:** `<pre><code>function() { return; }</code></pre>` fails to parse
**Why it happens:** `{` and `}` are JSX expression delimiters
**How to avoid:** Use template literals in JSX expressions or escape braces
**Warning signs:** JSX parsing errors about unexpected tokens

### Pitfall 4: Missing Required Props
**What goes wrong:** Command without `name` or `description` throws at transpile time
**Why it happens:** These are required by Claude Code command format
**How to avoid:** Always include both `name` and `description` props
**Warning signs:** Error "Command requires name prop" or "Command requires description prop"

### Pitfall 5: allowedTools Prop Name
**What goes wrong:** Using `allowed-tools` instead of `allowedTools` in TSX
**Why it happens:** YAML uses kebab-case but TSX uses camelCase
**How to avoid:** Use `allowedTools={["Read", "Write"]}` (camelCase) in TSX
**Warning signs:** Property not appearing in frontmatter output

## Code Examples

### Complete Working Example (Target)
```tsx
// Source: Project codebase analysis + Claude Code docs
export default function CommitHelperCommand() {
  return (
    <Command
      name="commit-helper"
      description="Helps create well-formatted git commits"
      allowedTools={['Bash', 'Read']}
    >
      <h2>Objective</h2>
      <p>
        Analyze staged changes and generate a commit message following{' '}
        <a href="https://www.conventionalcommits.org">conventional commits</a>{' '}
        format.
      </p>

      <h2>Context</h2>
      <ul>
        <li><b>Working directory:</b> Current git repository</li>
        <li><b>Staged changes:</b> Available via git diff --cached</li>
      </ul>

      <div name="instructions">
        <h3>Process</h3>
        <ol>
          <li>Run <code>git diff --cached</code> to see staged changes</li>
          <li>Analyze the type of changes (feat, fix, docs, etc.)</li>
          <li>Generate a commit message with scope if applicable</li>
        </ol>
      </div>

      <h2>Success Criteria</h2>
      <ul>
        <li>Commit message follows conventional commits format</li>
        <li>Message accurately describes the changes</li>
        <li>Scope is included when changes are focused on one area</li>
      </ul>

      <hr />

      <Markdown>
        ## Examples

        - `feat(auth): add OAuth2 login flow`
        - `fix(api): handle null response from upstream`
        - `docs: update README with installation steps`
      </Markdown>
    </Command>
  );
}
```

### Expected Output
```markdown
---
name: commit-helper
description: Helps create well-formatted git commits
allowed-tools:
  - Bash
  - Read
---

## Objective

Analyze staged changes and generate a commit message following [conventional commits](https://www.conventionalcommits.org) format.

## Context

- **Working directory:** Current git repository
- **Staged changes:** Available via git diff --cached

<instructions>
### Process

1. Run `git diff --cached` to see staged changes
2. Analyze the type of changes (feat, fix, docs, etc.)
3. Generate a commit message with scope if applicable

</instructions>

## Success Criteria

- Commit message follows conventional commits format
- Message accurately describes the changes
- Scope is included when changes are focused on one area

---

## Examples

- `feat(auth): add OAuth2 login flow`
- `fix(api): handle null response from upstream`
- `docs: update README with installation steps`
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual MD authoring | TSX transpilation | Current project | Type-safe commands |

**Current limitations (v1):**
- Component composition takes first block only from fragments
- Component props not supported (parameterless only)
- Only relative imports for composition

## Open Questions

None for this validation phase. The implementation is complete; this phase validates it works.

## Claude Code Command Format Reference

### YAML Frontmatter Fields
| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | String | Command name (becomes `/project:name`) |
| `description` | Yes | String | What the command does |
| `allowed-tools` | No | Array | Tools Claude can use without asking |
| `argument-hint` | No | String | Hint for expected arguments |
| `model` | No | String | Specific model to use |
| `disable-model-invocation` | No | Boolean | Prevent auto-loading |
| `user-invocable` | No | Boolean | Hide from `/` menu |

### File Location
- Project commands: `.claude/commands/command-name.md`
- User commands: `~/.claude/commands/command-name.md`

### Invocation
- `/project:command-name` for project commands
- `/user:command-name` for user commands

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/parser/transformer.ts`, `src/emitter/emitter.ts`
- Project tests: `tests/parser/transformer.test.ts` (1600+ lines of verified examples)
- Existing example: `docs/examples/command.tsx` (identified issue)

### Secondary (MEDIUM confidence)
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills) - Official frontmatter reference
- [Claude Code Slash Commands](https://platform.claude.com/docs/en/agent-sdk/slash-commands) - Command format

### Tertiary (LOW confidence)
- Community examples from search results (patterns consistent with official docs)

## Metadata

**Confidence breakdown:**
- Example fix: HIGH - JSX structure error is clear from parser analysis
- Feature coverage: HIGH - Comprehensive tests verify all element types
- Claude Code format: HIGH - Verified against official documentation

**Research date:** 2026-01-21
**Valid until:** Stable - example syntax and format are well-defined
