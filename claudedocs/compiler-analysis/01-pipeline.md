# Build Pipeline

The compiler's build pipeline orchestrates TSX-to-Markdown transformation with dual output generation.

## Goal

Transform TSX command/agent files into Claude Code artifacts:
- Markdown files for Claude to execute
- Optional runtime.js bundles for TypeScript function execution

## Why

Design choices explained:

- **Single ts-morph Project**: Type resolution requires project-wide context. Creating a Project per file would lose cross-file import resolution and repeat expensive tsconfig.json parsing.

- **Bundling at end**: Runtime files are collected during per-file processing but bundled in a separate pass. This allows esbuild to deduplicate shared code across all commands.

- **Dual output (Markdown + runtime.js)**: Markdown provides human-readable prose for Claude, while runtime.js handles complex TypeScript logic that can't be expressed in prose.

- **No incremental builds**: Full rebuild on each change keeps the pipeline simple. With esbuild's speed and small project sizes, incremental complexity isn't worth the maintenance cost.

## Entry Point

**File:** `src/cli/commands/build.ts`

The CLI uses Commander.js with the following interface:

```
react-agentic build [patterns...] [options]

Options:
  -o, --out <dir>        Markdown output directory (default: .claude/commands)
  -d, --dry-run          Preview without writing
  -w, --watch            Watch mode with auto-rebuild
  --runtime-out <dir>    Runtime output directory (default: .claude/runtime)
  --code-split           Split runtime into per-namespace modules
  --minify               Minify runtime bundles
```

## Build Flow

### 1. Configuration Resolution

```
CLI flags → config file → defaults
```

Config sources (in priority order):
- CLI flags (highest)
- `react-agentic.config.json`
- Built-in defaults (lowest)

### 2. File Discovery

Uses `globby` for pattern expansion with gitignore awareness:

```typescript
const files = await globby(patterns, {
  onlyFiles: true,
  gitignore: true,
});
const tsxFiles = files.filter((f) => f.endsWith('.tsx'));
```

### 3. ts-morph Project

A single `ts-morph` Project instance is created once and reused across all files:

```typescript
const project = createProject();  // From parser/utils/project.ts
```

Why single instance:
- Type resolution works across files
- Import resolution needs project context
- Expensive to create (reads tsconfig.json)

### 4. Per-File Processing

Each file goes through `buildRuntimeFile()`:

```
SourceFile
    ↓
createRuntimeContext()          # Initialize transform state
    ↓
extractRuntimeVarDeclarations() # Find useRuntimeVar calls
extractRuntimeFnDeclarations()  # Find runtimeFn wrappers
extractLocalComponentDeclarations() # Find local TSX components
    ↓
findRuntimeRootElement()        # Locate <Command> or <Agent>
    ↓
transformRuntimeCommand() or    # Transform to IR
transformAgent()
    ↓
emitDocument() or emitAgent()   # Emit to Markdown
    ↓
Collect RuntimeFileInfo         # For later bundling
```

### 5. Runtime Bundling

After all files are processed, runtime files are bundled together:

**Single-Entry Mode (default):**
- Generates one unified `runtime.js`
- esbuild bundles all `.runtime.ts` files together
- Shared code automatically deduplicated

**Code-Split Mode (`--code-split`):**
- Generates `runtime.js` (dispatcher) + `{namespace}.js` per command
- On-demand module loading for faster startup
- Each namespace independently tree-shaken

### 6. Output Writing

```typescript
for (const result of results) {
  const outputDir = path.dirname(result.outputPath);
  await mkdir(outputDir, { recursive: true });
  await writeFile(result.outputPath, result.content, 'utf-8');
}
```

## Watch Mode

When `--watch` is specified:

1. Initial build runs for all files
2. Watcher monitors for file changes
3. On change:
   - Clear stale source files from project
   - Re-add changed files for fresh parse
   - Re-run build for all files

```typescript
const watcher = createWatcher(tsxFiles, async (changedFiles) => {
  for (const file of changedFiles) {
    const existing = project.getSourceFile(file);
    if (existing) {
      project.removeSourceFile(existing);
    }
  }
  await runBuild(tsxFiles, options, project, true);
});
```

## Error Handling

Errors propagate with source location information:

- **Transform errors**: Created via `ctx.createError(message, node)` which attaches file path and line number
- **Config errors**: Thrown during `loadConfigFile()` if JSON is malformed
- **File errors**: Standard Node.js errors for missing files, permissions

In watch mode, errors for individual files are logged but don't stop the watcher. The build continues for other files.

## Output Structure

```
.claude/
├── commands/
│   ├── my-command.md       # From src/app/my-command.tsx
│   └── gsd/                # Subfolder from Command metadata
│       └── plan-phase.md
├── agents/
│   └── researcher.md       # From src/app/researcher.tsx (Agent root)
└── runtime/
    └── runtime.js          # Bundled TypeScript functions
```

## Key Files

| File | Purpose |
|------|---------|
| `src/cli/commands/build.ts` | CLI command and orchestration |
| `src/cli/runtime-build.ts` | Per-file transformation pipeline |
| `src/cli/watcher.ts` | File watching for dev mode |
| `src/cli/config.ts` | Configuration resolution |
| `src/emitter/esbuild-bundler.ts` | Runtime bundling with esbuild |
