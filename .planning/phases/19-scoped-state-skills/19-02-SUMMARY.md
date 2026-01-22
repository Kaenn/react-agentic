---
phase: 19
plan: 02
subsystem: providers
tags: [sqlite, provider-template, code-generation, skills]

dependency-graph:
  requires:
    - 19-01 (StateSchema, OperationNode types)
  provides:
    - ProviderTemplate interface
    - Provider registry (registerProvider, getProvider)
    - SQLiteProvider implementation
  affects:
    - 19-03 (transformer uses schema for provider)
    - 19-04 (emitter uses provider to generate skills)

tech-stack:
  added: []
  patterns:
    - provider-registry: Map-based registry with auto-registration on import
    - template-method: Provider interface with 5 generate methods
    - sql-escaping: Double single quotes pattern for SQL injection prevention

key-files:
  created:
    - src/providers/index.ts
    - src/providers/sqlite.ts
  modified: []

decisions:
  - key: provider-registry-pattern
    choice: Map-based registry with registerProvider/getProvider
    rationale: Simple, extensible for future providers (localfile, supabase)
  - key: sql-escaping-approach
    choice: Double single quotes in SQL strings
    rationale: Standard SQL escaping, works with bash variable interpolation
  - key: json-output-format
    choice: sqlite3 -json piped through jq
    rationale: Claude can parse JSON reliably, jq formats nicely

metrics:
  duration: 3m 17s
  completed: 2026-01-22
---

# Phase 19 Plan 02: Provider Template System Summary

**One-liner:** ProviderTemplate interface with SQLiteProvider generating bash/sqlite3 CRUD skills with SQL escaping and JSON output

## What Was Built

### Provider Base Types (src/providers/index.ts)

1. **GeneratedSkill** - Output container:
   - `filename`: Skill filename (e.g., "releases.read.md")
   - `content`: Full markdown content

2. **ProviderContext** - Input for generators:
   - `stateName`: State name (e.g., "releases")
   - `database`: Database path from config
   - `schema`: Parsed StateSchema with flattened fields

3. **ProviderTemplate** - Interface contract:
   - `name`: Provider identifier
   - `generateInit()`: Creates schema/table
   - `generateRead()`: SELECT with optional field filter
   - `generateWrite()`: UPDATE field with value
   - `generateDelete()`: Reset state to defaults
   - `generateOperation()`: Custom operation skill

4. **Provider Registry**:
   - `registerProvider(provider)`: Register a provider by name
   - `getProvider(name)`: Get provider (throws if unknown)

### SQLite Provider (src/providers/sqlite.ts)

Full implementation generating bash/sqlite3 skills:

1. **Helper Functions**:
   - `escapeSql()`: Doubles single quotes for SQL strings
   - `toCliFlag()`: Converts arg_name to --arg-name
   - `toShellVar()`: Converts arg_name to ARG_NAME
   - `frontmatter()`: Generates YAML frontmatter
   - `argParser()`: Generates bash argument parsing
   - `tableCheck()`: Generates table existence check

2. **Generated Skills Pattern**:
   - Proper YAML frontmatter with allowed-tools
   - Markdown documentation with Arguments and Process sections
   - Bash code blocks with sqlite3 commands
   - JSON output via `sqlite3 -json | jq '.[0]'`
   - SQL escaping via `sed "s/'/''/g"`
   - Table existence checks with helpful error messages

3. **Custom Operation Support**:
   - Extracts args from operation.args
   - Generates CLI argument parsing
   - Replaces $arg with escaped shell variables
   - Generates per-arg escaping code

## Deviations from Plan

**Note:** Plan 02's artifacts were already committed during Plan 01's documentation commit (2f941dd). This was discovered during execution - the files existed and matched the plan specification exactly. Summary created to document completion.

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| provider-registry-pattern | Map-based with auto-registration | Simple, extensible, self-registering on import |
| sql-escaping-approach | Double single quotes | Standard SQL escaping, bash-compatible |
| json-output-format | sqlite3 -json + jq | Reliable parsing, nice formatting |
| cli-arg-format | --kebab-case | Standard CLI convention |
| table-check-pattern | SELECT 1 LIMIT 1 | Fast, reliable existence check |

## Commits

| Hash | Description |
|------|-------------|
| 2f941dd | feat(19-01): Provider files included in Plan 01 docs commit |

## Next Phase Readiness

Ready for 19-03: State transformer to parse State TSX and generate StateDocumentNode.

### Verified Working

- TypeScript compiles without errors in providers/
- ProviderTemplate interface with 5 generate methods
- Provider registry with registerProvider and getProvider
- SQLiteProvider implements all methods
- Generated skills use sqlite3 CLI with JSON output
- SQL escaping prevents injection
- Argument parsing for custom operations
- Table existence checks with helpful error messages
