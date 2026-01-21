# Feature Landscape

**Domain:** TSX-to-Markdown Transpiler for Claude Code Commands
**Researched:** 2026-01-20
**Confidence:** HIGH (based on established transpiler/CLI patterns)

## Table Stakes

Features users expect. Missing = product feels incomplete or unusable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **TSX Parsing** | Core function - must parse valid TSX/JSX syntax | Medium | Use @babel/parser with jsx+typescript plugins |
| **YAML Frontmatter Generation** | Output format requirement - Claude Code expects YAML metadata | Low | Props to YAML is straightforward mapping |
| **Markdown Body Output** | Core function - HTML-like elements to Markdown | Medium | h1-h6, p, ul, ol, code, pre, blockquote, links |
| **CLI Interface** | Expected delivery mechanism for dev tools | Low | Standard arg parsing with commander/yargs |
| **Single File Transpilation** | Basic use case - transform one file | Low | `tsxmd input.tsx output.md` |
| **Directory/Glob Processing** | Batch processing expected for multiple commands | Medium | `tsxmd src/**/*.tsx dist/` |
| **Watch Mode** | Standard for dev workflows - auto-rebuild on change | Medium | Use @parcel/watcher or chokidar |
| **Props Spreading Support** | Stated requirement - `{...props}` syntax | Medium | Must resolve spread at transpile time |
| **Component Composition** | Stated requirement - nested components | High | Import resolution, component flattening |
| **Error Messages with Location** | Dev experience necessity - line:column for errors | Low | Babel provides source locations in AST |
| **Exit Codes** | CI/CD integration - non-zero on failure | Trivial | process.exit(1) on errors |
| **Help/Usage Output** | Standard CLI expectation | Trivial | `--help` flag |
| **Version Output** | Standard CLI expectation | Trivial | `--version` flag |

### Table Stakes Rationale

**TSX Parsing**: Without accurate parsing, nothing works. Babel's parser is proven and handles all JSX/TSX syntax including spread operators, fragments, and expressions.

**YAML Frontmatter**: The output format is specified. Claude Code commands require YAML frontmatter for metadata (name, description, allowedTools, etc.).

**Error Messages with Location**: Transpiler errors without line numbers are unusable. Users need `Error at input.tsx:15:3: Invalid prop type` not just `Invalid prop type`. This is universal in compilers (TypeScript, ESLint, Babel all provide this).

**Watch Mode**: Standard in modern dev tools. GraphQL Code Generator, TypeScript, and every build tool supports watch mode. Missing this forces manual rebuilds.

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Dry Run / Preview Mode** | See output without writing files - safer iteration | Low | `--dry-run` prints to stdout |
| **Incremental Compilation** | Only rebuild changed files - faster watch mode | High | Requires dependency tracking, caching |
| **Source Maps** | Debug transpiled output back to TSX source | High | Nice for complex compositions, likely overkill |
| **Config File Support** | Project-level configuration vs CLI flags | Medium | `tsxmd.config.js` or `tsxmd.config.yaml` |
| **Verbose/Quiet Modes** | Control output detail for different contexts | Low | `-v/--verbose`, `-q/--quiet` flags |
| **JSON Output Mode** | Machine-readable output for tooling integration | Low | `--json` flag for parsed command metadata |
| **Custom Element Mapping** | User-defined HTML-to-Markdown transforms | Medium | Plugin-like extensibility |
| **Validation Mode** | Check TSX validity without generating output | Low | `--validate` flag, faster CI checks |
| **Init Command** | Scaffold new command files | Low | `tsxmd init commit-helper` creates template |
| **Colored Output** | Better DX with visual hierarchy | Low | Use chalk/picocolors, respect NO_COLOR |
| **Progress Indicators** | Feedback during batch operations | Low | File counts, spinners for long operations |
| **Import Path Aliasing** | Resolve `@/components` style imports | Medium | TypeScript paths support |
| **Parallel Processing** | Faster batch transpilation | Medium | Worker threads for large command sets |

### Differentiator Rationale

**Dry Run / Preview Mode**: Low cost, high value. Users can iterate on TSX and see output without polluting file system. Standard in code generation tools.

**Config File Support**: Reduces CLI verbosity, enables project-specific defaults. Standard pattern (ESLint, Prettier, TypeScript all use config files).

**Validation Mode**: Faster feedback loop - check syntax without full transpilation. Useful in CI where you want fast failure.

**Colored Output**: Modern CLI expectation. Should respect `NO_COLOR` env var per [no-color.org](https://no-color.org) standard.

**Incremental Compilation**: Valuable for large command sets but complex to implement correctly. TypeScript's own incremental mode has reported issues. Consider as post-MVP enhancement.

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Runtime JSX Execution** | Overcomplicates - we need static transpilation, not React rendering | Static AST transformation only |
| **Full React Component Support** | Scope creep - arbitrary React components can't transpile to Markdown | Support only Command + HTML-like elements |
| **Browser-Based Transpilation** | Wrong platform - this is a CLI/build tool | Node.js only |
| **Dynamic Prop Values** | Can't evaluate at transpile time - `allowedTools={getTools()}` | Require static/literal values in props |
| **Conditional Rendering** | `{showSection && <p>...</p>}` creates non-deterministic output | Support only static JSX structure |
| **Plugin System** | Premature abstraction - stabilize core first | Hardcoded transforms, consider plugins post-1.0 |
| **GUI/Visual Editor** | Different product entirely | Stay focused on CLI |
| **Real-Time Preview Server** | Over-engineering for command authoring | Watch mode + external Markdown preview |
| **Bundling/Minification** | Irrelevant for Markdown output | Output readable Markdown |
| **Hot Module Replacement** | Web dev pattern, not applicable | Simple watch + rebuild |
| **TypeScript Type Checking** | Babel strips types, doesn't check them | Users run tsc separately if needed |
| **Import of Non-Command Components** | Scope limitation - only Command components produce output | Error on non-Command default exports |

### Anti-Feature Rationale

**Runtime JSX Execution**: This transpiler converts JSX syntax to Markdown. It does NOT render React components. The JSX is a convenient authoring format, not a runtime. Trying to support actual React execution would require a full React runtime and make the tool vastly more complex.

**Dynamic Prop Values**: If `allowedTools={computeTools()}`, we can't know the value at transpile time. This must be a static analysis tool. Require literal arrays: `allowedTools={['Bash', 'Read']}`.

**Conditional Rendering**: `{condition && <section>...</section>}` creates output that varies based on runtime state. This transpiler produces deterministic output from static JSX. Support only unconditional JSX.

**Plugin System**: Classic premature abstraction. Build the core well, understand real extension needs through usage, then consider plugins. Starting with plugins adds complexity without knowing what extensibility is actually needed.

## Feature Dependencies

```
                   +------------------+
                   |   TSX Parsing    |
                   | (@babel/parser)  |
                   +--------+---------+
                            |
              +-------------+-------------+
              |                           |
    +---------v---------+     +-----------v-----------+
    |  Props Extraction |     |   AST Traversal       |
    |  (frontmatter)    |     |   (body content)      |
    +---------+---------+     +-----------+-----------+
              |                           |
              |                 +---------+---------+
              |                 |                   |
              |       +---------v------+  +--------v---------+
              |       | Element Mapping|  | Component Import |
              |       | (HTML -> MD)   |  |   Resolution     |
              |       +-------+--------+  +--------+---------+
              |               |                    |
              |               +----------+---------+
              |                          |
    +---------v--------------------------v---------+
    |           Markdown Generation                |
    |    (YAML frontmatter + MD body)              |
    +----------------------+-----------------------+
                           |
         +-----------------+------------------+
         |                 |                  |
   +-----v-----+    +------v------+    +------v------+
   | File Write|    | Watch Mode  |    | Dry Run     |
   +-----------+    +-------------+    +-------------+
```

### Dependency Details

| Feature | Depends On | Blocks |
|---------|------------|--------|
| TSX Parsing | None (foundation) | Everything |
| Props Extraction | TSX Parsing | Frontmatter Generation |
| AST Traversal | TSX Parsing | Element Mapping, Component Resolution |
| Element Mapping | AST Traversal | Markdown Generation |
| Component Import Resolution | AST Traversal, File System Access | Component Composition |
| YAML Frontmatter Generation | Props Extraction | File Output |
| Markdown Body Generation | Element Mapping | File Output |
| File Write | Markdown Generation | Watch Mode |
| Watch Mode | File Write, File System Watcher | None |
| Dry Run | Markdown Generation | None (parallel to File Write) |
| Validation Mode | TSX Parsing | None |
| Config File Support | None (CLI enhancement) | None |
| Incremental Compilation | Watch Mode, Dependency Tracking | None |

### Critical Path for MVP

1. **TSX Parsing** - Foundation
2. **Props Extraction** - Get Command props for frontmatter
3. **Element Mapping** - Convert HTML-like to Markdown
4. **Markdown Generation** - Assemble output
5. **File Write** - Save output
6. **CLI Interface** - User interaction

Watch mode and other enhancements can follow once core transpilation works.

## MVP Recommendation

For MVP, prioritize these table stakes:

1. **TSX Parsing** with Babel (jsx + typescript plugins)
2. **Props to YAML Frontmatter** conversion
3. **HTML Elements to Markdown** (h1-h6, p, ul, ol, code, pre, blockquote, a, strong, em)
4. **Props Spreading** (resolve `{...baseProps}` at transpile time)
5. **Single File CLI** (`tsxmd input.tsx -o output.md`)
6. **Error Messages with Line Numbers**
7. **Help/Version Flags**

### Defer to Post-MVP

- **Watch Mode**: Medium complexity, not critical for initial validation
- **Directory/Glob Processing**: Can use shell expansion initially (`tsxmd *.tsx`)
- **Component Composition**: High complexity, validate core first
- **Config File Support**: CLI flags sufficient for MVP
- **Incremental Compilation**: Optimization, not core functionality

### MVP Success Criteria

The MVP is successful when:
```bash
# This works
tsxmd src/commands/CommitHelper.tsx -o dist/commit-helper.md

# Output is correct Claude Code command format
cat dist/commit-helper.md
---
name: commit-helper
description: Helps create git commits
allowedTools:
  - Bash
  - Read
---

## Objective
Analyze staged changes
```

## Sources

### Transpiler/Parser Research
- [Babel Plugin Handbook](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md) - Visitor pattern, AST traversal
- [jsx-ast-utils](https://github.com/jsx-eslint/jsx-ast-utils) - JSX AST utilities for analysis
- [MDX Compiler](https://mdxjs.com/packages/mdx/) - Related domain: JSX in Markdown

### CLI Tool Patterns
- [Heroku CLI Style Guide](https://devcenter.heroku.com/articles/cli-style-guide) - CLI design best practices
- [Better CLI: Colors and Formatting](https://bettercli.org/design/using-colors-in-cli/) - Output formatting patterns
- [Ubuntu CLI Verbosity Levels](https://discourse.ubuntu.com/t/cli-verbosity-levels/26973) - Verbosity modes

### Watch Mode / Code Generation
- [GraphQL Code Generator](https://the-guild.dev/graphql/codegen/docs/getting-started/development-workflow) - Watch mode implementation patterns
- [tsx (TypeScript Execute)](https://github.com/esm-dev/tsx) - Fast TSX execution with watch mode

### Configuration Formats
- [JSON vs YAML vs TOML 2026](https://dev.to/jsontoall_tools/json-vs-yaml-vs-toml-which-configuration-format-should-you-use-in-2026-1hlb) - Config format comparison

### Frontmatter Parsing
- [VitePress Frontmatter](https://vitepress.dev/guide/frontmatter) - YAML frontmatter in static site generators
- [gray-matter](https://github.com/jonschlinkert/gray-matter) - Standard frontmatter parsing library

### Error Handling
- [Salesforce CLI Line Numbers Issue](https://github.com/forcedotcom/cli/issues/356) - Importance of error location in CLI tools

### Dry Run / Validation
- [Wolverine Code Generation](https://wolverinefx.net/guide/codegen) - Preview mode for code generation
