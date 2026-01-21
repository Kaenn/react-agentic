# Phase 4: CLI Interface - Research

**Researched:** 2026-01-21
**Domain:** Node.js CLI development with argument parsing, glob patterns, and terminal output
**Confidence:** HIGH

## Summary

This phase builds the CLI interface for react-agentic, enabling users to run `react-agentic build src/**/*.tsx` and output Markdown files to `.claude/commands/`. The CLI must handle glob pattern expansion, colored terminal output (respecting NO_COLOR), and standard `--help`/`--version` flags.

The Node.js CLI ecosystem has matured significantly. Commander.js remains the de facto standard for argument parsing with built-in help generation and TypeScript support. For glob pattern expansion, globby provides the most user-friendly API with automatic .gitignore respect. For terminal colors, picocolors is the modern choice: 14x smaller than chalk, 2x faster, zero dependencies, and NO_COLOR compliant.

The existing codebase has a complete Parse -> Transform -> Emit pipeline (parser.ts, transformer.ts, emitter.ts) that accepts file paths. The CLI's job is to: (1) parse CLI arguments, (2) expand glob patterns to file paths, (3) run each file through the transpilation pipeline, and (4) write output to `.claude/commands/{name}.md`.

**Primary recommendation:** Use Commander.js for argument parsing with a `build` subcommand, globby for pattern expansion, and picocolors for colored output. Structure the CLI as `src/cli/index.ts` (entry point), `src/cli/commands/build.ts` (build command), and `src/cli/output.ts` (terminal output utilities).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | ^14.0.0 | CLI argument parsing, subcommands, help generation | Most popular Node.js CLI framework, excellent TypeScript support, auto-generates help |
| globby | ^14.0.0 | Glob pattern expansion | User-friendly fast-glob wrapper, automatic .gitignore support, ESM native |
| picocolors | ^1.1.1 | Terminal color output | 14x smaller than chalk, NO_COLOR compliant, zero deps, TypeScript included |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fs/promises | (builtin) | Async file operations | Reading TSX files, writing Markdown output |
| path | (builtin) | Path manipulation | Output path construction, basename extraction |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| commander | yargs | Yargs is more flexible but more verbose; Commander's declarative API is cleaner for simple CLIs |
| commander | Node.js parseArgs | Built-in but minimal; no subcommands, no auto-help; good for scripts, not full CLIs |
| globby | fast-glob | Fast-glob is faster but lacks .gitignore integration; globby is ~10-20% slower but more ergonomic |
| picocolors | chalk | Chalk is more feature-rich (256 colors, TrueColor) but 14x larger; picocolors covers 99% of CLI needs |

**Installation:**
```bash
npm install commander globby picocolors
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli/
│   ├── index.ts         # CLI entry point, Commander setup
│   ├── commands/
│   │   └── build.ts     # Build command handler
│   └── output.ts        # Terminal output utilities (colors, logging)
├── ir/                  # (exists)
├── parser/              # (exists)
├── emitter/             # (exists)
└── index.ts             # Library entry point (unchanged)
```

### Pattern 1: Commander.js Program Setup
**What:** ESM-compatible CLI entry point with Commander
**When to use:** Main CLI entry file
**Example:**
```typescript
// Source: github.com/tj/commander.js
#!/usr/bin/env node
import { Command } from 'commander';
import { buildCommand } from './commands/build.js';

const program = new Command();

program
  .name('react-agentic')
  .description('Compile-time safety for Claude Code commands')
  .version('0.1.0');  // Read from package.json in practice

program.addCommand(buildCommand);

program.parse();
```

### Pattern 2: Subcommand with Variadic Arguments
**What:** Build command accepting glob patterns
**When to use:** Processing multiple input files
**Example:**
```typescript
// Source: github.com/tj/commander.js
import { Command } from 'commander';

export const buildCommand = new Command('build')
  .description('Transpile TSX files to Markdown')
  .argument('<patterns...>', 'Glob patterns for TSX files')
  .option('-o, --out <dir>', 'Output directory', '.claude/commands')
  .option('--dry-run', 'Print output without writing files')
  .action(async (patterns: string[], options) => {
    // patterns is string[] from variadic argument
    // options.out, options.dryRun are parsed flags
  });
```

### Pattern 3: Glob Pattern Expansion
**What:** Expand glob patterns to file paths with .gitignore respect
**When to use:** Processing user-provided glob patterns
**Example:**
```typescript
// Source: github.com/sindresorhus/globby
import { globby } from 'globby';

async function expandPatterns(patterns: string[]): Promise<string[]> {
  const files = await globby(patterns, {
    expandDirectories: false,
    gitignore: true,          // Respect .gitignore
    onlyFiles: true,
  });

  // Filter to only .tsx files
  return files.filter(f => f.endsWith('.tsx'));
}
```

### Pattern 4: Colored Output with NO_COLOR Support
**What:** Terminal colors that respect accessibility
**When to use:** All CLI output
**Example:**
```typescript
// Source: github.com/alexeyraspopov/picocolors
import pc from 'picocolors';

// pc.isColorSupported is true when colors work
// Automatically respects NO_COLOR, FORCE_COLOR, CI environments

function logSuccess(file: string, output: string) {
  console.log(`${pc.green('✓')} ${pc.dim(file)} → ${pc.cyan(output)}`);
}

function logError(file: string, message: string) {
  console.error(`${pc.red('✗')} ${pc.dim(file)}: ${message}`);
}

function logSummary(count: number, errors: number) {
  if (errors === 0) {
    console.log(pc.green(`\nBuilt ${count} file(s) successfully`));
  } else {
    console.log(pc.yellow(`\nBuilt ${count} file(s) with ${errors} error(s)`));
  }
}
```

### Pattern 5: Output Path Convention
**What:** Consistent output to `.claude/commands/` directory
**When to use:** Determining output file paths
**Example:**
```typescript
import path from 'path';
import { mkdir } from 'fs/promises';

async function getOutputPath(
  inputFile: string,
  outDir: string
): Promise<string> {
  // Extract command name from filename (my-command.tsx -> my-command.md)
  const basename = path.basename(inputFile, '.tsx');
  const outputPath = path.join(outDir, `${basename}.md`);

  // Ensure output directory exists
  await mkdir(path.dirname(outputPath), { recursive: true });

  return outputPath;
}
```

### Anti-Patterns to Avoid
- **Synchronous file operations:** Always use `fs/promises` for non-blocking I/O
- **Hardcoded colors:** Always check NO_COLOR/use picocolors automatic detection
- **Swallowing errors:** Log file path and error message; don't fail silently
- **Expanding globs manually:** Use globby; shell expansion varies by platform
- **Writing to source directory:** Output should always go to `.claude/commands/`

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Argument parsing | Manual `process.argv` slicing | Commander.js | Handles edge cases (flags, spaces, quotes), auto-help |
| Glob expansion | `fs.readdir` + regex | globby | Cross-platform, .gitignore support, negation patterns |
| Terminal colors | ANSI escape codes | picocolors | NO_COLOR support, TTY detection, cross-platform |
| Version display | Hardcoded string | Read package.json | Stays in sync automatically |
| Help text | Manual console.log | Commander auto-help | Consistent format, always accurate |

**Key insight:** CLI ergonomics (help, errors, colors) seem simple but have platform-specific edge cases. Libraries handle Windows vs Unix, TTY detection, and accessibility standards.

## Common Pitfalls

### Pitfall 1: Shell Glob Expansion vs Application Expansion
**What goes wrong:** On Unix, the shell expands `*.tsx` before passing to Node.js. On Windows, it doesn't.
**Why it happens:** Platform difference in shell behavior.
**How to avoid:** Quote patterns in documentation (`'src/**/*.tsx'`) and accept both expanded arrays and unexpanded patterns.
**Warning signs:** Works on Mac, fails on Windows (or vice versa).

### Pitfall 2: Missing Output Directory
**What goes wrong:** `ENOENT: no such file or directory` when writing to `.claude/commands/`.
**Why it happens:** Directory doesn't exist on first run.
**How to avoid:** Always `mkdir -p` (recursive) before writing files.
**Warning signs:** First build fails, subsequent builds work.

### Pitfall 3: NO_COLOR Not Respected
**What goes wrong:** Colors appear when piped to file or in non-TTY environments.
**Why it happens:** Using raw ANSI codes instead of a library that checks `process.env.NO_COLOR`.
**How to avoid:** Use picocolors; it handles all detection automatically.
**Warning signs:** `command > file.txt` contains `[32m` sequences.

### Pitfall 4: Version Out of Sync
**What goes wrong:** `--version` shows old version after npm publish.
**Why it happens:** Version hardcoded instead of read from package.json.
**How to avoid:** Read version from package.json at runtime.
**Warning signs:** `react-agentic --version` shows different version than `npm ls react-agentic`.

### Pitfall 5: Unclear Error Messages
**What goes wrong:** User sees "Error: Invalid element" with no file/line context.
**Why it happens:** Errors thrown without file path context.
**How to avoid:** Wrap errors with file path before displaying; use structured error objects.
**Warning signs:** Support requests asking "which file has the error?".

### Pitfall 6: ESM Entry Point Shebang
**What goes wrong:** `#!/usr/bin/env node` fails with ESM modules on some systems.
**Why it happens:** Node.js needs to detect ESM context from package.json or file extension.
**How to avoid:** Ensure `package.json` has `"type": "module"` (already set) and CLI file is `.js` extension in dist.
**Warning signs:** "Cannot use import statement outside a module" error on `npx react-agentic`.

## Code Examples

Verified patterns from official sources:

### Complete Build Command Implementation
```typescript
// src/cli/commands/build.ts
import { Command } from 'commander';
import { globby } from 'globby';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import pc from 'picocolors';
import { createProject, parseFile, findRootJsxElement, transform, emit } from '../../index.js';

interface BuildOptions {
  out: string;
  dryRun?: boolean;
}

export const buildCommand = new Command('build')
  .description('Transpile TSX command files to Markdown')
  .argument('<patterns...>', 'Glob patterns for TSX files (e.g., src/**/*.tsx)')
  .option('-o, --out <dir>', 'Output directory', '.claude/commands')
  .option('--dry-run', 'Print output without writing files')
  .action(async (patterns: string[], options: BuildOptions) => {
    const files = await globby(patterns, {
      onlyFiles: true,
      gitignore: true,
    });

    const tsxFiles = files.filter(f => f.endsWith('.tsx'));

    if (tsxFiles.length === 0) {
      console.log(pc.yellow('No .tsx files found matching patterns'));
      process.exit(0);
    }

    console.log(pc.dim(`Found ${tsxFiles.length} file(s) to process\n`));

    let successCount = 0;
    let errorCount = 0;

    // Ensure output directory exists
    await mkdir(options.out, { recursive: true });

    const project = createProject();

    for (const file of tsxFiles) {
      try {
        const sourceFile = project.addSourceFileAtPath(file);
        const root = findRootJsxElement(sourceFile);

        if (!root) {
          throw new Error('No JSX element found in file');
        }

        const doc = transform(root);
        const markdown = emit(doc);

        const outputName = path.basename(file, '.tsx') + '.md';
        const outputPath = path.join(options.out, outputName);

        if (options.dryRun) {
          console.log(pc.cyan(`[dry-run] ${file} → ${outputPath}`));
          console.log(pc.dim(markdown));
        } else {
          await writeFile(outputPath, markdown, 'utf-8');
          console.log(`${pc.green('✓')} ${pc.dim(file)} → ${pc.cyan(outputPath)}`);
        }

        successCount++;
      } catch (error) {
        errorCount++;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`${pc.red('✗')} ${pc.dim(file)}: ${message}`);
      }
    }

    console.log('');
    if (errorCount === 0) {
      console.log(pc.green(`Built ${successCount} file(s) successfully`));
    } else {
      console.log(pc.yellow(`Built ${successCount} file(s) with ${pc.red(errorCount)} error(s)`));
      process.exit(1);
    }
  });
```

### CLI Entry Point with Version from package.json
```typescript
// src/cli/index.ts
#!/usr/bin/env node
import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import { buildCommand } from './commands/build.js';

async function main() {
  // Read version from package.json
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkgPath = path.resolve(__dirname, '../../package.json');
  const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));

  const program = new Command();

  program
    .name('react-agentic')
    .description('Compile-time safety for Claude Code commands')
    .version(pkg.version);

  program.addCommand(buildCommand);

  program.parse();
}

main().catch(console.error);
```

### tsup Configuration for CLI Build
```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'cli/index': 'src/cli/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node18',
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| chalk for colors | picocolors preferred | 2023 | 14x smaller bundle, same API |
| glob package | globby/fast-glob | 2022 | Much faster, better API |
| yargs complexity | Commander simplicity | Ongoing | Commander dominates for simpler CLIs |
| Sync file ops | Async fs/promises | Node.js 14+ | Non-blocking, better performance |

**Deprecated/outdated:**
- colors.js: Had supply chain attack in 2022; don't use
- chalk v4: Use v5+ for ESM; or prefer picocolors
- glob v8 and earlier: Use v10+ for performance; or prefer globby

## Open Questions

Things that couldn't be fully resolved:

1. **Error source locations**
   - What we know: ts-morph nodes have `getStart()` and `getStartLineNumber()` methods
   - What's unclear: Phase 4 doesn't include INFRA-01 (error line numbers) - deferred to Phase 6
   - Recommendation: Basic file-level errors for now; line/column in Phase 6

2. **Exit codes**
   - What we know: Non-zero exit code needed for errors (INFRA-02 is Phase 6)
   - What's unclear: Whether Phase 4 should implement this
   - Recommendation: Implement basic `process.exit(1)` on any error for CI compatibility

## Sources

### Primary (HIGH confidence)
- [Commander.js GitHub](https://github.com/tj/commander.js) - Official docs, ESM patterns, TypeScript examples
- [globby GitHub](https://github.com/sindresorhus/globby) - Official docs, API reference
- [picocolors GitHub](https://github.com/alexeyraspopov/picocolors) - Official docs, NO_COLOR support

### Secondary (MEDIUM confidence)
- [Better Stack Commander Guide](https://betterstack.com/community/guides/scaling-nodejs/commander-explained/) - Comprehensive tutorial
- [LogRocket CLI Colors Guide](https://blog.logrocket.com/using-console-colors-node-js/) - Color library comparison
- [DEV Community CLI Frameworks](https://dev.to/tigawanna/building-and-publishing-npm-packages-with-typescript-multiple-entry-points-tailwind-tsup-and-npm-9e7) - tsup configuration patterns

### Tertiary (LOW confidence)
- General web search results for ecosystem trends - verified against primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Well-established libraries with clear ecosystem consensus
- Architecture: HIGH - Follows Commander.js official patterns and existing project structure
- Pitfalls: MEDIUM - Based on common community issues; some may not apply to this project

**Research date:** 2026-01-21
**Valid until:** 60 days (CLI libraries are stable; patterns unlikely to change)
