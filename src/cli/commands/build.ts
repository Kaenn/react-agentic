/**
 * Build Command - Transpile TSX command files to Markdown
 */
import { Command } from 'commander';
import { globby } from 'globby';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { createProject, findRootJsxElement, transform, emit } from '../../index.js';
import { logSuccess, logError, logInfo, logSummary, logWarning } from '../output.js';

interface BuildOptions {
  out: string;
}

export const buildCommand = new Command('build')
  .description('Transpile TSX command files to Markdown')
  .argument('<patterns...>', 'Glob patterns for TSX files (e.g., src/**/*.tsx)')
  .option('-o, --out <dir>', 'Output directory', '.claude/commands')
  .action(async (patterns: string[], options: BuildOptions) => {
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

    logInfo(`Found ${tsxFiles.length} file(s) to process\n`);

    // Ensure output directory exists
    await mkdir(options.out, { recursive: true });

    // Create ts-morph project once
    const project = createProject();

    let successCount = 0;
    let errorCount = 0;

    for (const inputFile of tsxFiles) {
      try {
        // Parse file
        const sourceFile = project.addSourceFileAtPath(inputFile);

        // Find root JSX
        const root = findRootJsxElement(sourceFile);
        if (!root) {
          throw new Error('No JSX element found in file');
        }

        // Transform to IR
        const doc = transform(root);

        // Emit to Markdown
        const markdown = emit(doc);

        // Determine output path
        const basename = path.basename(inputFile, '.tsx');
        const outputPath = path.join(options.out, `${basename}.md`);

        // Write output
        await writeFile(outputPath, markdown, 'utf-8');

        logSuccess(inputFile, outputPath);
        successCount++;
      } catch (error) {
        errorCount++;
        const message = error instanceof Error ? error.message : String(error);
        logError(inputFile, message);
      }
    }

    // Summary
    logSummary(successCount, errorCount);

    // Exit with error code if any failures
    if (errorCount > 0) {
      process.exit(1);
    }
  });
