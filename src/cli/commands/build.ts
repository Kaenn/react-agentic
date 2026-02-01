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
import { resolveConfig, type CLIConfigOverrides } from '../config.js';
import { DEFAULT_WATCH_PATTERN, EXIT_CODES } from '../../constants.js';

// Build imports
import { buildRuntimeFile, hasRuntimeImports } from '../runtime-build.js';
import { bundleSingleEntryRuntime, bundleCodeSplit } from '../../emitter/index.js';
import type { RuntimeFileInfo } from '../../emitter/index.js';

interface BuildOptions {
  out: string;
  runtimeOut: string;
  codeSplit: boolean;
  minify: boolean;
  dryRun?: boolean;
  watch?: boolean;
  config?: Partial<import('../config.js').ReactAgenticConfig>;
}

/**
 * Result of processing a single file
 */
interface ProcessFileResult {
  result: BuildResult;
  runtimeFileInfo: RuntimeFileInfo | null;
  runtimePath: string;
}

/**
 * Process a single TSX file and return build results
 */
async function processFile(
  inputFile: string,
  project: Project,
  options: BuildOptions
): Promise<ProcessFileResult> {
  // Parse file
  const sourceFile = project.addSourceFileAtPath(inputFile);

  // Build runtime file
  const buildResult = await buildRuntimeFile(sourceFile, project, {
    commandsOut: options.out,
    runtimeOut: options.runtimeOut,
    dryRun: options.dryRun,
    config: options.config,
  });

  // Log warnings
  for (const warning of buildResult.warnings) {
    logWarning(warning);
  }

  return {
    result: {
      inputFile,
      outputPath: buildResult.markdownPath,
      content: buildResult.markdown,
      size: Buffer.byteLength(buildResult.markdown, 'utf8'),
    },
    runtimeFileInfo: buildResult.runtimeFileInfo,
    runtimePath: buildResult.runtimePath,
  };
}

/**
 * Process all TSX files and collect results
 */
async function processFiles(
  tsxFiles: string[],
  project: Project,
  options: BuildOptions
): Promise<{ results: BuildResult[]; runtimeFiles: RuntimeFileInfo[]; runtimePath: string; errorCount: number }> {
  const results: BuildResult[] = [];
  const runtimeFiles: RuntimeFileInfo[] = [];
  let runtimePath = '';
  let errorCount = 0;

  for (const inputFile of tsxFiles) {
    try {
      const processed = await processFile(inputFile, project, options);
      results.push(processed.result);

      if (processed.runtimeFileInfo) {
        runtimeFiles.push(processed.runtimeFileInfo);
        runtimePath = processed.runtimePath;
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

  return { results, runtimeFiles, runtimePath, errorCount };
}

/**
 * Bundle runtime files and add results to the results array
 */
async function bundleRuntimes(
  runtimeFiles: RuntimeFileInfo[],
  runtimePath: string,
  options: BuildOptions,
  results: BuildResult[]
): Promise<void> {
  if (runtimeFiles.length === 0) {
    return;
  }

  const runtimeOutDir = options.runtimeOut;

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

/**
 * Write build results to disk
 */
async function writeResults(results: BuildResult[]): Promise<void> {
  for (const result of results) {
    if (result.skipWrite) continue;

    const outputDir = path.dirname(result.outputPath);
    await mkdir(outputDir, { recursive: true });
    await writeFile(result.outputPath, result.content, 'utf-8');
    logSuccess(result.inputFile, result.outputPath);
  }
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

  // Process all files
  const { results, runtimeFiles, runtimePath, errorCount } = await processFiles(
    tsxFiles,
    project,
    options
  );

  // Bundle runtimes
  await bundleRuntimes(runtimeFiles, runtimePath, options, results);

  // Write files (unless dry-run)
  if (!options.dryRun) {
    await writeResults(results);
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
  .option('-o, --out <dir>', 'Output directory (default: .claude/commands)')
  .option('-d, --dry-run', 'Preview output without writing files')
  .option('-w, --watch', 'Watch for changes and rebuild automatically')
  .option('--runtime-out <dir>', 'Runtime output directory (default: .claude/runtime)')
  .option('--code-split', 'Split runtime into per-namespace modules')
  .option('--minify', 'Minify runtime bundles')
  .action(async (patterns: string[], cliOptions: CLIConfigOverrides & { dryRun?: boolean; watch?: boolean }) => {
    // Resolve config: defaults → config file → CLI flags
    const config = await resolveConfig(cliOptions);

    const options: BuildOptions = {
      out: config.outputDir,
      runtimeOut: config.runtimeDir,
      codeSplit: config.codeSplit,
      minify: config.minify,
      dryRun: cliOptions.dryRun,
      watch: cliOptions.watch,
      config,
    };

    // Disallow --dry-run with --watch (validate early before expensive operations)
    if (options.watch && options.dryRun) {
      console.error('Cannot use --dry-run with --watch');
      process.exit(EXIT_CODES.VALIDATION_ERROR);
    }

    // Default to src/app/**/*.tsx in watch mode if no patterns provided
    if (patterns.length === 0) {
      if (options.watch) {
        patterns = [DEFAULT_WATCH_PATTERN];
      } else {
        console.error(`No patterns provided. Specify glob patterns or use --watch for default ${DEFAULT_WATCH_PATTERN}`);
        process.exit(EXIT_CODES.VALIDATION_ERROR);
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
      process.exit(EXIT_CODES.SUCCESS);
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
        process.exit(EXIT_CODES.SUCCESS);
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
      process.exit(EXIT_CODES.BUILD_ERROR);
    }
  });
