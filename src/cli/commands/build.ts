/**
 * Build Command - Transpile TSX command files to Markdown
 */
import { Command } from 'commander';
import { globby } from 'globby';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { Node } from 'ts-morph';
import type { Project } from 'ts-morph';
import {
  createProject,
  findRootJsxElement,
  transform,
  emit,
  emitAgent,
  getAttributeValue,
  resolveTypeImport,
  extractInterfaceProperties,
  extractPromptPlaceholders,
} from '../../index.js';
import type { DocumentNode, AgentDocumentNode } from '../../index.js';
import type { SourceFile } from 'ts-morph';
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
import { TranspileError, CrossFileError, formatCrossFileError } from '../errors.js';
import { createWatcher } from '../watcher.js';

interface BuildOptions {
  out: string;
  dryRun?: boolean;
  watch?: boolean;
}

/**
 * Validate SpawnAgent nodes against their Agent interfaces
 *
 * Checks:
 * 1. If SpawnAgent has inputType, verify the type can be resolved
 * 2. Verify prompt placeholders cover all required interface properties
 *
 * @param doc - Document node containing potential SpawnAgent children
 * @param sourceFile - Source file for import resolution
 * @returns Array of validation errors
 */
function validateSpawnAgents(
  doc: DocumentNode | AgentDocumentNode,
  sourceFile: SourceFile
): CrossFileError[] {
  const errors: CrossFileError[] = [];

  for (const child of doc.children) {
    if (child.kind !== 'spawnAgent' || !child.inputType) {
      continue;
    }

    const typeName = child.inputType.name;

    // Try to resolve the type import
    const resolved = resolveTypeImport(typeName, sourceFile);
    if (!resolved) {
      // Type not found - create error at SpawnAgent location
      // Note: We can't get node location after transformation, so this requires
      // storing location during transformation or re-parsing
      // For now, create error without precise location
      errors.push(
        new CrossFileError(
          `Cannot resolve type '${typeName}' for SpawnAgent validation`,
          { file: sourceFile.getFilePath(), line: 1, column: 1 },
          undefined,
          sourceFile.getFullText()
        )
      );
      continue;
    }

    // Extract interface properties and prompt placeholders
    const properties = extractInterfaceProperties(resolved.interface);
    const placeholders = extractPromptPlaceholders(child.prompt);

    // Check for missing required properties
    const requiredProps = properties.filter(p => p.required);
    const missing = requiredProps.filter(p => !placeholders.has(p.name));

    if (missing.length > 0) {
      const missingNames = missing.map(p => `'${p.name}'`).join(', ');
      const agentLocation = {
        file: resolved.sourceFile.getFilePath(),
        line: resolved.interface.getStartLineNumber(),
        column: 1,
      };

      errors.push(
        new CrossFileError(
          `SpawnAgent prompt missing required properties: ${missingNames}`,
          { file: sourceFile.getFilePath(), line: 1, column: 1 },
          agentLocation,
          sourceFile.getFullText()
        )
      );
    }
  }

  return errors;
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

      // Determine output path and emit based on document type
      let markdown: string;
      let outputPath: string;
      const basename = path.basename(inputFile, '.tsx');

      if (doc.kind === 'agentDocument') {
        // Agent: emit with GSD format (pass sourceFile for structured_returns)
        markdown = emitAgent(doc, sourceFile);

        // Get folder prop for output path (need to re-parse for this)
        // The folder prop affects output path but is not in frontmatter
        const folder = (Node.isJsxElement(root) || Node.isJsxSelfClosingElement(root))
          ? getAttributeValue(
              Node.isJsxElement(root) ? root.getOpeningElement() : root,
              'folder'
            )
          : undefined;

        // Route to .claude/agents/{folder?}/{basename}.md
        const agentDir = folder
          ? path.join('.claude/agents', folder)
          : '.claude/agents';
        outputPath = path.join(agentDir, `${basename}.md`);
      } else {
        // Command: emit with standard format, use --out option
        markdown = emit(doc);
        outputPath = path.join(options.out, `${basename}.md`);

        // Run validation pass for documents with SpawnAgent
        const validationErrors = validateSpawnAgents(doc, sourceFile);
        for (const valError of validationErrors) {
          errorCount++;
          console.error(formatCrossFileError(valError));
        }
        // Note: Validation errors are logged but build continues (warning mode)
        // To make validation blocking, add: if (validationErrors.length > 0) continue;
      }

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
    // Write all files (ensure directory exists per-file since Agents may have different paths)
    for (const result of results) {
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
