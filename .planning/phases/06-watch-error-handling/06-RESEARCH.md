# Phase 6: Watch & Error Handling - Research

**Researched:** 2026-01-21
**Domain:** CLI watch mode, file system events, error formatting
**Confidence:** HIGH

## Summary

This phase adds production-ready CLI features: watch mode with auto-rebuild, dry run mode for previewing output, and TypeScript-style error messages with source locations. The standard approach uses chokidar v5 for file watching (ESM-only, Node 20+), manual debouncing with a simple timeout pattern, and ts-morph's built-in position APIs for error location extraction.

The existing CLI infrastructure (Commander.js, picocolors, globby) integrates cleanly with these additions. Error formatting follows the TypeScript compiler's established pattern: `file:line:col - error: message` with code snippet and caret underline.

**Primary recommendation:** Use chokidar v5 with manual debounce (150-250ms), ts-morph's `getLineAndColumnAtPos()` for error positions, and `console.clear()` for terminal refresh between rebuilds.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chokidar | ^5.0.0 | File system watching | Industry standard, cross-platform, ESM-native |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| picocolors | ^1.1.1 | Terminal colors | Error messages, status output (already present) |
| ts-morph | ^27.0.2 | Source position APIs | Extract line/column for error locations (already present) |
| globby | ^16.1.0 | Pattern matching | Watch pattern expansion (already present) |
| commander | ^14.0.2 | CLI framework | --watch and --dry-run options (already present) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| chokidar | Node.js native `fs.watch` | Less reliable cross-platform, no event normalization |
| chokidar | nodemon | Too opinionated, designed for restarting processes |
| manual debounce | lodash.debounce | Extra dependency for one function |

**Installation:**
```bash
npm install chokidar
```

## Architecture Patterns

### Recommended Project Structure
```
src/cli/
  commands/
    build.ts          # Modified: add --watch and --dry-run options
  output.ts           # Modified: add error formatting, dry-run output, build tree
  watcher.ts          # NEW: File watching with debounce logic
  errors.ts           # NEW: Error types and formatting utilities
```

### Pattern 1: Debounced File Watcher
**What:** Wrap chokidar events with a debounce to batch rapid file changes
**When to use:** Always for watch mode - editors save multiple times, IDEs trigger many events
**Example:**
```typescript
// Source: https://github.com/paulmillr/chokidar
import chokidar from 'chokidar';

function createWatcher(
  patterns: string[],
  onRebuild: (changedFiles: string[]) => Promise<void>,
  debounceMs = 200
) {
  let timeout: NodeJS.Timeout | null = null;
  let pending: Set<string> = new Set();

  const watcher = chokidar.watch(patterns, {
    ignoreInitial: true,  // Don't emit on startup - we do full build first
    awaitWriteFinish: {
      stabilityThreshold: 100,  // Wait for file writes to complete
      pollInterval: 50,
    },
  });

  watcher.on('all', (event, filePath) => {
    if (event === 'add' || event === 'change' || event === 'unlink') {
      pending.add(filePath);

      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const files = Array.from(pending);
        pending.clear();
        await onRebuild(files);
      }, debounceMs);
    }
  });

  return watcher;
}
```

### Pattern 2: Error Position Extraction
**What:** Extract file:line:column from ts-morph node for error context
**When to use:** Any thrown error during transformation
**Example:**
```typescript
// Source: https://github.com/dsherret/ts-morph/issues/801
import { Node, SourceFile } from 'ts-morph';

interface SourceLocation {
  file: string;
  line: number;
  column: number;
}

function getNodeLocation(node: Node): SourceLocation {
  const sourceFile = node.getSourceFile();
  const { line, column } = sourceFile.getLineAndColumnAtPos(node.getStart());
  return {
    file: sourceFile.getFilePath(),
    line,
    column,
  };
}
```

### Pattern 3: TypeScript-Style Error Formatting
**What:** Format errors like tsc output with code snippet and caret
**When to use:** All transpilation errors shown to users
**Example:**
```typescript
// Source: TypeScript compiler output format
function formatError(
  file: string,
  line: number,
  column: number,
  message: string,
  sourceCode: string
): string {
  const lines = sourceCode.split('\n');
  const errorLine = lines[line - 1] || '';
  const caret = ' '.repeat(column - 1) + '^';

  return [
    `${file}:${line}:${column} - error: ${message}`,
    '',
    `  ${line} | ${errorLine}`,
    `    | ${caret}`,
  ].join('\n');
}
```

### Pattern 4: Graceful Signal Handling
**What:** Clean shutdown on Ctrl+C with user feedback
**When to use:** Watch mode - persistent process needs clean exit
**Example:**
```typescript
// Source: Node.js signal handling best practices
function setupGracefulShutdown(
  watcher: chokidar.FSWatcher,
  cleanup: () => Promise<void>
) {
  const shutdown = async () => {
    console.log('\nStopping watch...');
    await watcher.close();
    await cleanup();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);   // Ctrl+C
  process.on('SIGTERM', shutdown);  // Docker/process manager
}
```

### Pattern 5: Terminal Clear for Clean Rebuilds
**What:** Clear terminal before each rebuild for fresh output
**When to use:** Watch mode rebuilds (decided in CONTEXT.md)
**Example:**
```typescript
// Source: Node.js console.clear() with TTY check
function clearTerminal(): void {
  // console.clear() is TTY-aware (no-op if not TTY)
  console.clear();
}
```

### Anti-Patterns to Avoid
- **Building reverse dependency graph**: Overkill for this project - just rebuild all matching files on any change. Selective rebuild adds complexity without proportional benefit given the small file counts.
- **Using chokidar's glob patterns directly**: v5 removed glob support - use globby first, then watch resulting file list.
- **awaitWriteFinish with long threshold**: 2000ms default is too slow - use 100ms for responsive rebuilds.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File watching | Custom fs.watch wrapper | chokidar | Cross-platform edge cases, event normalization |
| Source positions | Manual text offset counting | ts-morph `getLineAndColumnAtPos()` | Already handles all edge cases |
| Terminal colors | ANSI escape codes | picocolors (already present) | NO_COLOR support, TTY detection |
| Glob expansion | Manual path iteration | globby (already present) | Gitignore support, patterns |

**Key insight:** The project already has most needed tools. Only chokidar is new.

## Common Pitfalls

### Pitfall 1: Watch Pattern Changes
**What goes wrong:** Files added matching pattern aren't watched because watcher was created with static file list
**Why it happens:** globby returns current matches, new files aren't in the list
**How to avoid:** Use chokidar's directory watching with `ignored` filter, or re-glob periodically
**Warning signs:** "Added new file but it's not rebuilding"

### Pitfall 2: Editor Save Storms
**What goes wrong:** Single save triggers multiple rebuilds
**Why it happens:** Editors like VSCode save in multiple passes (content, then metadata)
**How to avoid:** Use debounce AND `awaitWriteFinish` together
**Warning signs:** "Seeing duplicate build outputs for one save"

### Pitfall 3: Error Position Off-By-One
**What goes wrong:** Error points to wrong character
**Why it happens:** ts-morph uses 1-based lines but 0-based positions internally
**How to avoid:** Use `getLineAndColumnAtPos()` which returns 1-based for both
**Warning signs:** Error caret doesn't align with actual problem

### Pitfall 4: Circular Import During Watch
**What goes wrong:** First build works, rebuild crashes
**Why it happens:** ts-morph Project accumulates source files across rebuilds
**How to avoid:** Create fresh Project instance for each rebuild, or clear source files
**Warning signs:** "Works once, then fails on second build"

### Pitfall 5: Process Exit Without Cleanup
**What goes wrong:** File handles left open, terminal in bad state
**Why it happens:** Hard exit on error without closing watcher
**How to avoid:** Always call `watcher.close()` before exit, use try/finally
**Warning signs:** Resource warnings, need to restart terminal

## Code Examples

Verified patterns from official sources:

### Chokidar Basic Setup
```typescript
// Source: https://github.com/paulmillr/chokidar
import chokidar from 'chokidar';

// Note: v5 removed glob support - use globby first
const files = await globby(['src/**/*.tsx'], { gitignore: true });

const watcher = chokidar.watch(files, {
  persistent: true,        // Keep process running
  ignoreInitial: true,     // Don't fire on startup
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 50,
  },
});

watcher
  .on('change', (path) => console.log(`Changed: ${path}`))
  .on('add', (path) => console.log(`Added: ${path}`))
  .on('unlink', (path) => console.log(`Removed: ${path}`))
  .on('error', (error) => console.error(`Error: ${error}`))
  .on('ready', () => console.log('Watching for changes...'));
```

### Extract Error Location from Node
```typescript
// Source: https://github.com/dsherret/ts-morph/issues/801
import { Node, SourceFile } from 'ts-morph';

function getErrorContext(node: Node): {
  file: string;
  line: number;
  column: number;
  sourceCode: string;
} {
  const sourceFile = node.getSourceFile();
  const { line, column } = sourceFile.getLineAndColumnAtPos(node.getStart());
  const fullText = sourceFile.getFullText();

  return {
    file: sourceFile.getFilePath(),
    line,
    column,
    sourceCode: fullText,
  };
}
```

### Build Tree Output (Next.js Style)
```typescript
// Based on Next.js build output pattern
function printBuildTree(files: { path: string; size: number }[]): void {
  console.log('\nOutput:');

  for (const file of files) {
    const sizeStr = formatBytes(file.size).padStart(8);
    console.log(`  ${pc.cyan(file.path)}${pc.dim(sizeStr)}`);
  }

  console.log('');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

### Dry Run Mode Pattern
```typescript
// Preview output without writing files
interface DryRunResult {
  inputFile: string;
  outputPath: string;
  content: string;
  size: number;
}

async function buildDryRun(files: string[]): Promise<DryRunResult[]> {
  const results: DryRunResult[] = [];

  for (const inputFile of files) {
    // Transform without writing
    const content = await transpile(inputFile);

    results.push({
      inputFile,
      outputPath: getOutputPath(inputFile),
      content,
      size: Buffer.byteLength(content, 'utf8'),
    });
  }

  return results;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| chokidar v4 + globs | chokidar v5 + manual glob | Nov 2025 | Must use globby for pattern expansion |
| CommonJS imports | ESM imports only | chokidar v5 | Aligns with project's ESM-first approach |
| Polling by default | Native fs.watch | Modern chokidar | Better CPU usage, faster events |

**Deprecated/outdated:**
- chokidar glob patterns: Removed in v5, use Node.js `fs/promises.glob()` or globby
- usePolling: Rarely needed now, native watching works cross-platform

## Open Questions

Things that couldn't be fully resolved:

1. **Exact debounce timing**
   - What we know: 200-400ms is common, Claude's discretion per CONTEXT.md
   - What's unclear: Optimal value for this specific use case
   - Recommendation: Start with 200ms, tune based on user feedback

2. **Code snippet context lines**
   - What we know: TypeScript shows 1 line, ESLint shows configurable context
   - What's unclear: User preference (Claude's discretion per CONTEXT.md)
   - Recommendation: Show 1 error line + caret (minimal, familiar)

3. **Watch pattern for new files**
   - What we know: Static file list won't catch new matching files
   - What's unclear: User expectation for new file detection
   - Recommendation: Watch directories, filter by pattern - catches additions

## Sources

### Primary (HIGH confidence)
- [chokidar GitHub README](https://github.com/paulmillr/chokidar) - Full API, v5 changes
- [ts-morph Issue #801](https://github.com/dsherret/ts-morph/issues/801) - getLineAndColumnAtPos() solution
- [ts-morph Issue #679](https://github.com/dsherret/ts-morph/issues/679) - getReferencingSourceFiles() for dependency tracking

### Secondary (MEDIUM confidence)
- [Node.js signal handling patterns](https://dev.to/superiqbal7/graceful-shutdown-in-nodejs-handling-stranger-danger-29jo) - SIGINT/SIGTERM handling
- [Node.js console.clear()](https://www.tutorialspoint.com/nodejs/nodejs_console_clear_method.htm) - TTY-aware clearing

### Tertiary (LOW confidence)
- TypeScript tsc output format - observed behavior, not official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - chokidar is well-documented, ts-morph APIs confirmed
- Architecture: HIGH - patterns verified against official documentation
- Pitfalls: MEDIUM - derived from GitHub issues and common patterns

**Research date:** 2026-01-21
**Valid until:** 2026-02-21 (30 days - stable domain)
