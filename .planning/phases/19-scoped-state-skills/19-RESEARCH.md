# Phase 19: Scoped State Skills - Research

**Researched:** 2026-01-22
**Domain:** State management, code generation, provider templates
**Confidence:** HIGH

## Summary

Phase 19 refactors the state system from generic skills (`/react-agentic:state-read`) to scoped, auto-generated skills per state definition (`/releases:read`, `/releases:write`). Each `<State>` component generates multiple skill files with deterministic SQL/bash code.

Based on CONTEXT.md decisions:
- **SQLite only** for this phase (localfile and Supabase are future phases)
- **Bash + sqlite3 CLI** for all generated code
- **Separate init skill** for schema creation
- **Convention-based type mapping** from TypeScript to SQL
- **Hardcoded database paths** baked into generated skills

**Primary recommendation:** Extend existing Skill/SkillDocument patterns to support multi-skill generation from a single State TSX file, using provider templates to generate deterministic SQL code.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sqlite3 CLI | system | Database operations | Universal availability, JSON output support |
| jq | system | JSON processing | Standard for shell JSON manipulation |
| ts-morph | existing | TypeScript parsing | Already used for interface extraction |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| gray-matter | existing | YAML frontmatter | Skill metadata generation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sqlite3 CLI | better-sqlite3 MCP | Requires MCP setup, less portable |
| Raw SQL | ORM | Over-engineering for simple CRUD |

**Installation:**
No new dependencies required - uses existing stack.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── jsx.ts                    # Add State, Operation exports
├── ir/nodes.ts               # Add StateDocumentNode, StateNode, OperationNode
├── parser/transformer.ts     # Add State/Operation handling
├── providers/
│   ├── index.ts              # Provider registry and base types
│   └── sqlite.ts             # SQLite code templates
├── emitter/
│   ├── emitter.ts            # Extend for StateDocument
│   └── state-emitter.ts      # NEW: emit skills from State
└── app/state/
    └── releases.state.tsx    # Example state definition
```

### Pattern 1: Multi-Skill Document Generation
**What:** Single TSX file generates multiple skill files
**When to use:** State component with CRUD + custom operations
**Example:**
```typescript
// Source: Existing SkillDocumentNode pattern
interface StateDocumentNode {
  kind: 'stateDocument';
  name: string;                    // State name (e.g., "releases")
  provider: 'sqlite';              // Provider type
  config: ProviderConfig;          // Provider-specific config
  schema: StateSchema;             // Parsed from TypeScript interface
  operations: OperationNode[];     // Custom operations
}
```

### Pattern 2: Provider Template System
**What:** Abstract code generation through provider-specific templates
**When to use:** Any code generation that varies by storage backend
**Example:**
```typescript
// Source: Based on existing adapter pattern
interface ProviderTemplate {
  generateInit(schema: StateSchema): string;
  generateRead(schema: StateSchema): string;
  generateWrite(schema: StateSchema): string;
  generateDelete(schema: StateSchema): string;
  generateOperation(op: OperationNode, schema: StateSchema): string;
}
```

### Pattern 3: TypeScript-to-SQL Schema Mapping
**What:** Convention-based type mapping from TS interface to SQL columns
**When to use:** State schema inference
**Example:**
```typescript
// From CONTEXT.md decisions
const typeMap = {
  'string': 'TEXT',
  'number': 'INTEGER',
  'boolean': 'INTEGER',  // 0/1
  'Date': 'TEXT',        // ISO format
};

// Nested: config.debug -> config_debug column
function flattenPath(path: string[]): string {
  return path.join('_');
}
```

### Anti-Patterns to Avoid
- **Don't hand-roll SQL escaping:** Use sqlite3 parameterized queries via shell variables
- **Don't generate dynamic SQL:** All SQL should be static with variable substitution
- **Don't mix providers:** Each generated skill is provider-locked (no runtime switching)
- **Don't require MCP:** Generated skills use sqlite3 CLI, not MCP server

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQL escaping | Custom escaping | Shell variable quoting | Shell handles escaping with proper quoting |
| Type mapping | Runtime reflection | Static code generation | Deterministic output, no AI interpretation |
| Schema validation | Runtime checks | Compile-time TypeScript | Fail fast at build time |

**Key insight:** Generated skills should contain static, deterministic code. No AI interpretation at runtime - skills are executable recipes.

## Common Pitfalls

### Pitfall 1: SQL Injection in Generated Code
**What goes wrong:** Shell variable interpolation could allow SQL injection
**Why it happens:** Treating user input as SQL without proper escaping
**How to avoid:** Use sqlite3 parameterized queries pattern:
```bash
# Safe: use printf for escaping
VALUE=$(printf '%s' "$INPUT" | sed "s/'/''/g")
sqlite3 .state/state.db "INSERT INTO releases (version) VALUES ('$VALUE')"
```
**Warning signs:** Raw $VARIABLE in SQL strings without quoting

### Pitfall 2: Missing Database/Table
**What goes wrong:** Skill fails because database or table doesn't exist
**Why it happens:** Init skill not run before CRUD operations
**How to avoid:** Each CRUD skill checks table exists, suggests running init:
```bash
if ! sqlite3 "$DB" "SELECT 1 FROM releases LIMIT 1" 2>/dev/null; then
  echo '{"error": "Table not initialized. Run /releases:init first"}'
  exit 1
fi
```
**Warning signs:** Skills assume table exists without checking

### Pitfall 3: JSON Output Formatting
**What goes wrong:** Invalid JSON breaks command parsing
**Why it happens:** Mixed stdout/stderr, unescaped characters
**How to avoid:** Always use `sqlite3 -json` and pipe through jq for formatting
**Warning signs:** Echo statements mixed with JSON output

### Pitfall 4: Nested Object Flattening Ambiguity
**What goes wrong:** `config.debug` and `config_debug` field collision
**Why it happens:** Underscore used both as separator and valid field character
**How to avoid:** Validate no collision at compile time, reject interfaces with both patterns
**Warning signs:** Interface has both `foo_bar` and `foo: { bar: ... }`

## Code Examples

### Example 1: State Component JSX API
```tsx
// Source: Based on ROADMAP.md design + CONTEXT.md decisions
interface ReleasesState {
  lastVersion: string;
  bumpType: 'major' | 'minor' | 'patch';
  updatedAt: string;
}

export default function ReleasesState() {
  return (
    <State<ReleasesState>
      name="releases"
      provider="sqlite"
      config={{ database: ".state/state.db" }}
    >
      <Operation name="record">
        {`
        UPDATE releases SET
          lastVersion = '$version',
          bumpType = '$bump_type',
          updatedAt = datetime('now')
        WHERE rowid = 1
        `}
      </Operation>
    </State>
  );
}
```

### Example 2: Generated Init Skill
```markdown
---
name: releases.init
description: Initialize releases state table. Run once before using releases state.
allowed-tools:
  - Bash(sqlite3:*)
  - Bash(mkdir:*)
---

# Initialize Releases State

Create the SQLite table for releases state.

## Process

```bash
mkdir -p .state
sqlite3 .state/state.db <<'SQL'
CREATE TABLE IF NOT EXISTS releases (
  lastVersion TEXT DEFAULT '',
  bumpType TEXT DEFAULT 'patch',
  updatedAt TEXT DEFAULT ''
);
INSERT OR IGNORE INTO releases (rowid) VALUES (1);
SQL
echo '{"status": "initialized", "table": "releases"}'
```
```

### Example 3: Generated Read Skill
```markdown
---
name: releases.read
description: Read releases state. Returns current state as JSON.
allowed-tools:
  - Bash(sqlite3:*)
---

# Read Releases State

Read the current releases state from SQLite.

## Arguments

- `--field {name}`: Optional field to read (e.g., `lastVersion`)

## Process

```bash
DB=".state/state.db"

# Parse arguments
FIELD=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --field) FIELD="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Check table exists
if ! sqlite3 "$DB" "SELECT 1 FROM releases LIMIT 1" 2>/dev/null; then
  echo '{"error": "State not initialized. Run /releases:init first"}'
  exit 1
fi

# Read state
if [ -z "$FIELD" ]; then
  sqlite3 -json "$DB" "SELECT * FROM releases WHERE rowid = 1" | jq '.[0]'
else
  sqlite3 -json "$DB" "SELECT $FIELD FROM releases WHERE rowid = 1" | jq ".[0].$FIELD"
fi
```
```

### Example 4: Generated Write Skill
```markdown
---
name: releases.write
description: Write to releases state. Updates fields in state.
allowed-tools:
  - Bash(sqlite3:*)
---

# Write Releases State

Update releases state fields in SQLite.

## Arguments

- `--field {name}`: Field to update (e.g., `lastVersion`)
- `--value {val}`: Value to set

## Process

```bash
DB=".state/state.db"

# Parse arguments
FIELD=""
VALUE=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --field) FIELD="$2"; shift 2 ;;
    --value) VALUE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Validate
if [ -z "$FIELD" ] || [ -z "$VALUE" ]; then
  echo '{"error": "Both --field and --value required"}'
  exit 1
fi

# Check table exists
if ! sqlite3 "$DB" "SELECT 1 FROM releases LIMIT 1" 2>/dev/null; then
  echo '{"error": "State not initialized. Run /releases:init first"}'
  exit 1
fi

# Escape value for SQL
SAFE_VALUE=$(printf '%s' "$VALUE" | sed "s/'/''/g")

# Update and return new state
sqlite3 "$DB" "UPDATE releases SET $FIELD = '$SAFE_VALUE' WHERE rowid = 1"
sqlite3 -json "$DB" "SELECT * FROM releases WHERE rowid = 1" | jq '.[0]'
```
```

### Example 5: Custom Operation Skill
```markdown
---
name: releases.record
description: Record a new release version with bump type.
allowed-tools:
  - Bash(sqlite3:*)
---

# Record Release

Update version and bump type in a single operation.

## Arguments

- `--version {ver}`: Version string (e.g., "1.2.3")
- `--bump-type {type}`: Bump type (major|minor|patch)

## Process

```bash
DB=".state/state.db"

# Parse arguments
VERSION=""
BUMP_TYPE=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --version) VERSION="$2"; shift 2 ;;
    --bump-type) BUMP_TYPE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Validate
if [ -z "$VERSION" ]; then
  echo '{"error": "--version required"}'
  exit 1
fi

# Default bump type
if [ -z "$BUMP_TYPE" ]; then
  BUMP_TYPE="patch"
fi

# Escape values
SAFE_VERSION=$(printf '%s' "$VERSION" | sed "s/'/''/g")
SAFE_BUMP=$(printf '%s' "$BUMP_TYPE" | sed "s/'/''/g")

# Execute custom SQL from Operation body
sqlite3 "$DB" "UPDATE releases SET lastVersion = '$SAFE_VERSION', bumpType = '$SAFE_BUMP', updatedAt = datetime('now') WHERE rowid = 1"
sqlite3 -json "$DB" "SELECT * FROM releases WHERE rowid = 1" | jq '.[0]'
```
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic state skills | Scoped per-state skills | Phase 19 | Provider-specific code baked in |
| MCP-based state | CLI-based skills | Phase 19 | No MCP dependency for basic state |
| AI interprets operations | Deterministic code | Phase 19 | Reliable, predictable execution |

**Deprecated/outdated:**
- `/react-agentic:state-read`: Replaced by scoped skills like `/releases:read`
- `<ReadState>` / `<WriteState>` components: Replaced by skill invocations in prose

## Open Questions

1. **Operation argument inference**
   - What we know: CONTEXT.md says "Args inferred from TypeScript interface fields used in body"
   - What's unclear: How exactly to parse SQL body for $variable references
   - Recommendation: Use simple regex pattern `/\$([a-z_]+)/gi` to extract arguments

2. **Main init command orchestration**
   - What we know: CONTEXT.md mentions "auto-generate a main init command that orchestrates all state init skills"
   - What's unclear: How to collect all State definitions across TSX files for orchestration
   - Recommendation: Generate `/init:all` command if multiple state files exist, or document manual orchestration

3. **Enum type handling**
   - What we know: TypeScript literal unions like `'major' | 'minor' | 'patch'`
   - What's unclear: Whether to generate CHECK constraints or validate in bash
   - Recommendation: Generate CHECK constraint in CREATE TABLE, bash validation as backup

## Sources

### Primary (HIGH confidence)
- CONTEXT.md - User decisions constraining this phase
- Existing codebase analysis (nodes.ts, transformer.ts, emitter.ts, jsx.ts)
- STATE.md - Prior implementation decisions (v1.6 state system patterns)

### Secondary (MEDIUM confidence)
- ROADMAP.md - Phase 19 success criteria and component API design

### Tertiary (LOW confidence)
- SQLite CLI documentation patterns (based on training data, not verified)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing dependencies only
- Architecture: HIGH - Follows established patterns from Skill/MCP phases
- Pitfalls: MEDIUM - SQL security patterns based on general knowledge

**Research date:** 2026-01-22
**Valid until:** ~30 days (stable domain, no external dependencies)

---

## Implementation Guidance for Planner

### Plan 1: IR and JSX Type Extensions
Focus areas:
- `StateDocumentNode` - new document type (like SkillDocumentNode)
- `StateNode` - represents parsed State component
- `OperationNode` - represents custom Operation
- `StateSchema` - parsed TypeScript interface with flattened fields
- JSX component stubs: `State<T>`, `Operation`

### Plan 2: Provider Templates (SQLite Only)
Focus areas:
- Base `ProviderTemplate` interface
- `SQLiteProvider` implementation with:
  - `generateInit()` - CREATE TABLE with type mappings
  - `generateRead()` - SELECT with optional field filter
  - `generateWrite()` - UPDATE with field/value
  - `generateDelete()` - DELETE (optional, may omit for single-row state)
  - `generateOperation()` - Custom SQL execution
- SQL escaping helper functions

### Plan 3: State Parser and Transformer
Focus areas:
- `transformState()` - parse State component props
- `transformOperation()` - parse Operation children
- Schema extraction from generic type parameter `<State<TSchema>>`
- Type flattening logic (nested objects -> underscore columns)
- Config extraction (database path)

### Plan 4: Emitter and CLI Multi-Skill Output
Focus areas:
- `emitState()` - orchestrate multi-skill generation
- Build command routing for `*.state.tsx` files
- Output to `.claude/skills/{state}.{op}.md` pattern
- Handle Operation children for custom skill generation
