/**
 * Build Command - Transpile TSX command files to Markdown
 */
import { Command } from 'commander';
import { globby } from 'globby';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import type { Project } from 'ts-morph';
import { createProject, findRootJsxElement, transform, emit } from '../../index.js';
import {
  logSuccess,
  logError,
  logInfo,
  logSummary,
  logWarning,
  logBuildTree,
  logTranspileError,
  BuildResult,
} from '../output.js';
import { TranspileError } from '../errors.js';
import { createWatcher } from '../watcher.js';

interface BuildOptions {
  out: string;
  dryRun?: boolean;
  watch?: boolean;
}

/**
 * Run a build cycle for the given files
 * Returns counts for summary reporting
 */
async function runBuild(
  tsxFiles: string[],
  options: BuildOptions,
  project: Project,
  clearScreen: boolean
): Promise<{ successCount: number; errorCount: number }> {
  if (clearScreen) {
    console.clear();
  }

  const results: BuildResult[] = [];
  let errorCount = 0;

  // Phase 1: Process all files and collect results
  for (const inputFile of tsxFiles) {
    try {
      // Parse file
      const sourceFile = project.addSourceFileAtPath(inputFile);

      // Find root JSX
      const root = findRootJsxElement(sourceFile);
      if (!root) {
        throw new Error('No JSX element found in file');
      }

      // Transform to IR (pass sourceFile for error location context)
      const doc = transform(root, sourceFile);

      // Emit to Markdown
      const markdown = emit(doc);

      // Determine output path
      const basename = path.basename(inputFile, '.tsx');
      const outputPath = path.join(options.out, `${basename}.md`);

      // Collect result
      results.push({
        inputFile,
        outputPath,
        content: markdown,
        size: Buffer.byteLength(markdown, 'utf8'),
      });
    } catch (error) {
      errorCount++;
      if (error instanceof TranspileError) {
        logTranspileError(error);
      } else {
        const message = error instanceof Error ? error.message : String(error);
        logError(inputFile, message);
      }
    }
  }

  // Phase 2: Write files (unless dry-run) and display tree
  if (!options.dryRun) {
    // Ensure output directory exists
    await mkdir(options.out, { recursive: true });

    // Write all files
    for (const result of results) {
      await writeFile(result.outputPath, result.content, 'utf-8');
      logSuccess(result.inputFile, result.outputPath);
    }
  }

  // Show build tree
  if (results.length > 0) {
    console.log('');
    logBuildTree(results, options.dryRun ?? false);
  }

  // Summary
  logSummary(results.length, errorCount);

  return { successCount: results.length, errorCount };
}

export const buildCommand = new Command('build')
  .description('Transpile TSX command files to Markdown')
  .argument('<patterns...>', 'Glob patterns for TSX files (e.g., src/**/*.tsx)')
  .option('-o, --out <dir>', 'Output directory', '.claude/commands')
  .option('-d, --dry-run', 'Preview output without writing files')
  .option('-w, --watch', 'Watch for changes and rebuild automatically')
  .action(async (patterns: string[], options: BuildOptions) => {
    // Disallow --dry-run with --watch
    if (options.watch && options.dryRun) {
      console.error('Cannot use --dry-run with --watch');
      process.exit(1);
    }

    // Expand glob patterns
    const files = await globby(patterns, {
      onlyFiles: true,
      gitignore: true,
    });

    // Filter to .tsx files only
    const tsxFiles = files.filter((f) => f.endsWith('.tsx'));

    if (tsxFiles.length === 0) {
      logWarning('No .tsx files found matching patterns');
      process.exit(0);
    }

    // Create ts-morph project once
    const project = createProject();

    if (options.watch) {
      // Watch mode
      logInfo(`Watching ${tsxFiles.length} file(s) for changes...\n`);

      // Initial build
      await runBuild(tsxFiles, options, project, false);

      // Setup watcher
      const watcher = createWatcher(tsxFiles, async (changedFiles) => {
        logInfo(`\nFile changed: ${changedFiles.join(', ')}`);

        // Clear stale source files and re-add for fresh parse
        for (const file of changedFiles) {
          const existing = project.getSourceFile(file);
          if (existing) {
            project.removeSourceFile(existing);
          }
        }

        await runBuild(tsxFiles, options, project, true);
      });

      // Graceful shutdown
      const shutdown = async () => {
        console.log('\nStopping watch...');
        await watcher.close();
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

      // Keep process running (watcher keeps event loop alive)
      return;
    }

    // Non-watch mode: single build
    logInfo(`Found ${tsxFiles.length} file(s) to process\n`);
    const { errorCount } = await runBuild(tsxFiles, options, project, false);

    // Exit with error code if any failures
    if (errorCount > 0) {
      process.exit(1);
    }
  });
