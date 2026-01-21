# Project Research Summary

**Project:** react-agentic (TSX-to-Markdown transpiler for Claude Code commands)
**Domain:** Compiler/Transpiler
**Researched:** 2026-01-20
**Confidence:** HIGH

## Executive Summary

This project is a compile-time transformation tool, not a runtime framework. The architecture follows the classic compiler pattern: Parse (TSX via ts-morph) -> Transform (to intermediate representation) -> Generate (Markdown with YAML frontmatter). The critical insight from research is that we parse JSX as data structure, not render it. There is no need for React runtime, jsx-runtime, or virtual DOM.

The recommended approach is a three-phase architecture using ts-morph for TypeScript-aware AST parsing. ts-morph provides clean JSX node traversal (`JsxElement`, `JsxAttribute`, `JsxSpreadAttribute`) without the verbosity of raw TypeScript Compiler API. The transformation should produce an intermediate representation (IR) before emitting Markdown, enabling testable and maintainable code.

Key risks center on ts-morph's node invalidation behavior (old references become invalid after AST manipulation) and the temptation to skip the intermediate representation. Both are mitigated by adopting a read-only traversal pattern from the start. The parser ambiguity between generics (`<T>`) and JSX tags requires clear error messages for users.

## Key Findings

### Recommended Stack

The stack is optimized for AST manipulation and CLI tooling, not runtime React. All versions verified via npm.

**Core technologies:**
- **ts-morph ^27.0.2**: TypeScript AST parsing and traversal - wraps TS Compiler API with ergonomic methods, handles JSX natively
- **commander ^14.0.2**: CLI argument parsing - zero dependencies, simple API, massive adoption
- **chokidar ^5.0.0**: File watching for watch mode - de facto standard, v5 is ESM-only (requires Node 20+)
- **gray-matter ^4.0.3**: YAML frontmatter serialization - battle-tested, bidirectional (parse and stringify)
- **TypeScript ^5.9.3**: Type system and compilation
- **tsx ^4.21.0 / tsup ^8.5.1 / vitest ^4.0.17**: Development tooling (runner, bundler, tests)

**What NOT to use:** React/react-dom, jsx-runtime, Babel (ts-morph is purpose-built), yargs (16 dependencies vs commander's 0), marked/markdown-it (we generate, not parse).

### Expected Features

**Must have (table stakes):**
- TSX parsing with full JSX syntax support
- YAML frontmatter generation from Command props
- HTML elements to Markdown (h1-h6, p, ul, ol, code, pre, blockquote, a)
- Props spreading support (`{...props}` at transpile time)
- Single file and directory/glob processing
- Watch mode with file monitoring
- Error messages with source location (line:column)
- CLI with help/version flags and proper exit codes

**Should have (differentiators):**
- Dry run/preview mode (`--dry-run`)
- Verbose/quiet output modes
- Validation mode (check without generating)
- Config file support (`tsxmd.config.js`)
- Colored terminal output (respecting NO_COLOR)

**Defer (v2+):**
- Incremental compilation (complex dependency tracking)
- Source maps (overkill for command files)
- Plugin system (premature abstraction)
- Component composition beyond simple nesting

**Anti-features (do not build):**
- Runtime JSX execution
- Dynamic prop values (`allowedTools={getTools()}`)
- Conditional rendering (`{condition && <section/>}`)
- Browser-based transpilation
- Full React component support

### Architecture Approach

Classic three-phase compiler: Parse -> Transform -> Generate, with an intermediate representation (IR) between TSX AST and Markdown output. The IR enables testing each phase independently and allows future output formats.

**Major components:**
1. **Parser Layer (ts-morph)** - Convert TSX to AST, uses `Project`, `SourceFile`, `JsxElement` types
2. **AST Transformer** - Visitor pattern traversal, converts JSX nodes to IR nodes (HeadingNode, ParagraphNode, XmlBlockNode, etc.)
3. **Code Generator/Emitter** - Tree-walking emitter producing Markdown strings with YAML frontmatter
4. **CLI Interface** - commander-based CLI with watch mode via chokidar
5. **File Orchestrator** - Glob patterns, file routing, output path resolution

**Key pattern:** Read-only AST traversal. Complete all AST reads in a single pass, produce IR, then emit. Never interleave reading and manipulation.

### Critical Pitfalls

1. **Direct AST-to-output generation** - Skip intermediate representation and tangle parsing with output. Prevent by designing IR types first, implementing elements second.

2. **ts-morph node invalidation** - Old node references become invalid after manipulation. Prevent by read-only traversal pattern; extract all data in single pass.

3. **getType() vs getTypeNode() confusion** - Returns computed type vs AST node. Use ts-ast-viewer.com to understand node structure.

4. **Generics vs JSX parser ambiguity** - `<T>` is ambiguous. Document `<T,>` workaround, provide clear error messages.

5. **Watch mode without debouncing** - Multiple events per save. Use chokidar's `awaitWriteFinish` option plus 250-500ms debounce.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Core Pipeline
**Rationale:** Foundation must be solid before adding features. IR pattern prevents early architectural mistakes.
**Delivers:** Working transpiler for simple TSX (h1, p, br elements only)
**Addresses:** TSX parsing, basic element mapping, Markdown generation
**Avoids:** Direct AST-to-output (Pitfall 1), node invalidation (Pitfall 2)

Build order:
1. IR type definitions
2. Markdown emitter (test with hand-crafted IR)
3. Basic JSX transformer
4. Parser integration (ts-morph setup)

### Phase 2: Element Coverage
**Rationale:** Full element support enables real command authoring. Frontmatter is the primary differentiator.
**Delivers:** Complete element handling for Claude Code command format
**Uses:** ts-morph for props extraction, gray-matter for YAML
**Implements:** Transformer layer (all visitors), Frontmatter generator

Build order:
1. Command props -> YAML frontmatter
2. Text formatting (b, i, code, a)
3. Lists (ul, ol, li with nesting)
4. Named blocks (div[name] -> XML blocks)
5. Raw markdown passthrough

### Phase 3: CLI and Watch Mode
**Rationale:** User-facing interface after core transpilation works. Independent of internals.
**Delivers:** Usable CLI tool with file watching
**Uses:** commander, chokidar
**Implements:** CLI interface, File orchestrator

Build order:
1. Basic CLI (single file)
2. Directory mode (glob patterns)
3. Watch mode (with debouncing)
4. Error formatting with source location

### Phase 4: Polish and Advanced Features
**Rationale:** Enhancements after core is stable. Props spreading is medium complexity.
**Delivers:** Production-ready transpiler
**Addresses:** Props spreading, component composition, validation mode, config files

Build order:
1. Props spreading support
2. Dry run mode
3. Validation mode
4. Config file support

### Phase Ordering Rationale

- **IR first, elements second:** Architecture research strongly recommends intermediate representation. Testing emitter in isolation before transformer enables faster iteration.
- **Frontmatter before elements:** Primary differentiator. Validate output format early.
- **CLI after core:** CLI is independent layer. Can be developed in parallel once Phase 1 completes.
- **Spreading last:** Requires understanding literal vs runtime values. Defer until core patterns established.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Props spreading static analysis limitations need validation with real TSX patterns
- **Phase 4:** Component composition patterns may have edge cases not covered in research

Phases with standard patterns (skip research-phase):
- **Phase 1:** Classic compiler architecture, well-documented ts-morph APIs
- **Phase 3:** Standard CLI patterns, chokidar is well-documented

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified via npm, well-established libraries |
| Features | HIGH | Based on established transpiler/CLI patterns |
| Architecture | HIGH | Classic compiler pattern, verified ts-morph APIs |
| Pitfalls | HIGH | Verified against ts-morph docs and GitHub issues |

**Overall confidence:** HIGH

### Gaps to Address

- **Props spreading edge cases:** Research indicates static analysis cannot see runtime spread values. Need to define exactly which patterns are supported vs rejected.
- **Component composition depth:** How deeply nested components should be supported? Need test cases during Phase 2.
- **JSX whitespace handling:** Rules are subtle. Build explicit test suite early in Phase 2.

## Sources

### Primary (HIGH confidence)
- ts-morph Official Documentation (https://ts-morph.com/)
- TypeScript JSX Documentation (https://www.typescriptlang.org/docs/handbook/jsx.html)
- chokidar GitHub (https://github.com/paulmillr/chokidar)
- gray-matter GitHub (https://github.com/jonschlinkert/gray-matter)
- npm registry (version verification for all packages)

### Secondary (MEDIUM confidence)
- Strumenta: How to Write a Transpiler (https://tomassetti.me/how-to-write-a-transpiler/)
- ts-morph GitHub issues (#240 JSX generation, #897 formatting)
- Babel Plugin Handbook (visitor pattern)

### Tertiary (LOW confidence)
- Various compiler design resources (Crafting Interpreters)
- Community forum discussions on JSX AST handling

---
*Research completed: 2026-01-20*
*Ready for roadmap: yes*
