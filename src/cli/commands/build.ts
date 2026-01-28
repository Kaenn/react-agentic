/**
 * Build Command - Transpile TSX command files to Markdown
 */
import { Command } from 'commander';
import { globby } from 'globby';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import type { Project } from 'ts-morph';
import { createProject } from '../../parser/utils/project.js';
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

// Build imports
import { buildV3File, hasV3Imports } from '../../v3/cli/build-v3.js';
import { bundleSingleEntryRuntime, bundleCodeSplit } from '../../v3/emitter/index.js';
import type { RuntimeFileInfo } from '../../v3/emitter/index.js';

interface BuildOptions {
  out: string;
  dryRun?: boolean;
  watch?: boolean;
  runtimeOut?: string;
  codeSplit?: boolean;
  minify?: boolean;
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
  const runtimeFiles: RuntimeFileInfo[] = [];
  let runtimePath = '';
  let errorCount = 0;

  // Process all files
  for (const inputFile of tsxFiles) {
    try {
      // Parse file
      const sourceFile = project.addSourceFileAtPath(inputFile);

      // Check if file uses V3 features (useScriptVar, runtimeFn)
      const fileContent = sourceFile.getFullText();
      const isV3 = hasV3Imports(fileContent);

      if (!isV3) {
        // Skip non-V3 files with warning
        logWarning(`Skipping ${inputFile}: V1 files are no longer supported. Please migrate to V3.`);
        continue;
      }

      // Build V3 file
      const v3Result = await buildV3File(sourceFile, project, {
        commandsOut: options.out,
        runtimeOut: options.runtimeOut || '.claude/runtime',
        dryRun: options.dryRun,
      });

      // Add markdown result
      results.push({
        inputFile,
        outputPath: v3Result.markdownPath,
        content: v3Result.markdown,
        size: Buffer.byteLength(v3Result.markdown, 'utf8'),
      });

      // Collect runtime file info for bundling
      if (v3Result.runtimeFileInfo) {
        runtimeFiles.push(v3Result.runtimeFileInfo);
        runtimePath = v3Result.runtimePath;
      }

      // Log warnings
      for (const warning of v3Result.warnings) {
        logWarning(warning);
      }
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

  // Bundle all runtimes
  if (runtimeFiles.length > 0) {
    const runtimeOutDir = options.runtimeOut || '.claude/runtime';

    if (options.codeSplit) {
      // Code-split mode: generate dispatcher + per-namespace modules
      const bundleResult = await bundleCodeSplit({
        runtimeFiles,
        outputDir: runtimeOutDir,
        minify: options.minify,
      });

      // Add dispatcher
      results.push({
        inputFile: `${runtimeFiles.length} file(s) (dispatcher)`,
        outputPath: path.join(runtimeOutDir, 'runtime.js'),
        content: bundleResult.dispatcherContent,
        size: Buffer.byteLength(bundleResult.dispatcherContent, 'utf8'),
      });

      // Add each namespace module
      for (const [namespace, content] of bundleResult.moduleContents) {
        results.push({
          inputFile: `${namespace} module`,
          outputPath: path.join(runtimeOutDir, `${namespace}.js`),
          content,
          size: Buffer.byteLength(content, 'utf8'),
        });
      }

      // Log any bundle warnings
      for (const warning of bundleResult.warnings) {
        logWarning(warning);
      }
    } else {
      // Single-entry mode (default): one bundled runtime.js
      const bundleResult = await bundleSingleEntryRuntime({
        runtimeFiles,
        outputPath: runtimePath,
        minify: options.minify,
      });

      results.push({
        inputFile: `${runtimeFiles.length} file(s)`,
        outputPath: runtimePath,
        content: bundleResult.content,
        size: Buffer.byteLength(bundleResult.content, 'utf8'),
      });

      // Log any bundle warnings
      for (const warning of bundleResult.warnings) {
        logWarning(warning);
      }
    }
  }

  // Write files (unless dry-run)
  if (!options.dryRun) {
    for (const result of results) {
      if (result.skipWrite) continue;

      const outputDir = path.dirname(result.outputPath);
      await mkdir(outputDir, { recursive: true });
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
  .argument('[patterns...]', 'Glob patterns for TSX files (e.g., src/**/*.tsx)')
  .option('-o, --out <dir>', 'Output directory', '.claude/commands')
  .option('-d, --dry-run', 'Preview output without writing files')
  .option('-w, --watch', 'Watch for changes and rebuild automatically')
  .option('--runtime-out <dir>', 'Runtime output directory', '.claude/runtime')
  .option('--code-split', 'Split runtime into per-namespace modules')
  .option('--minify', 'Minify runtime bundles')
  .action(async (patterns: string[], options: BuildOptions) => {
    // Disallow --dry-run with --watch
    if (options.watch && options.dryRun) {
      console.error('Cannot use --dry-run with --watch');
      process.exit(1);
    }

    // Default to src/app/**/*.tsx in watch mode if no patterns provided
    if (patterns.length === 0) {
      if (options.watch) {
        patterns = ['src/app/**/*.tsx'];
      } else {
        console.error('No patterns provided. Specify glob patterns or use --watch for default src/app/**/*.tsx');
        process.exit(1);
      }
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
