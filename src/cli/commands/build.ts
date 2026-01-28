/**
 * Build Command - Transpile TSX command files to Markdown
 */
import { Command } from 'commander';
import { globby } from 'globby';
import { writeFile, mkdir, copyFile, readFile } from 'fs/promises';
import path from 'path';
import { Node } from 'ts-morph';
import type { Project } from 'ts-morph';
import {
  createProject,
  findRootJsxElement,
  transform,
  emit,
  emitAgent,
  emitSkill,
  emitSkillFile,
  emitSettings,
  mergeSettings,
  getAttributeValue,
  resolveTypeImport,
  extractInterfaceProperties,
  extractPromptPlaceholders,
} from '../../index.js';
import type { DocumentNode, AgentDocumentNode, SkillDocumentNode, MCPConfigDocumentNode, StateDocumentNode } from '../../index.js';
import { emitState, generateMainInitSkill } from '../../emitter/state-emitter.js';
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

// V3 imports
import { buildV3File, hasV3Imports } from '../../v3/cli/build-v3.js';
import { bundleSingleEntryRuntime } from '../../v3/emitter/index.js';
import type { RuntimeFileInfo } from '../../v3/emitter/index.js';

interface BuildOptions {
  out: string;
  dryRun?: boolean;
  watch?: boolean;
  v3?: boolean;
  runtimeOut?: string;
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

    // When using input prop instead of prompt, validation is handled differently:
    // - Object literal: check if properties match interface (done at transform time)
    // - Variable ref: runtime validation only
    // Only validate prompt-based SpawnAgent calls
    if (!child.prompt) {
      continue; // Skip validation for input-based SpawnAgent
    }

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
 * Process a skill document into build outputs
 */
function processSkill(
  doc: SkillDocumentNode,
  inputFile: string
): BuildResult[] {
  const skillName = doc.frontmatter.name;
  const skillDir = `.claude/skills/${skillName}`;
  const inputDir = path.dirname(inputFile);

  const results: BuildResult[] = [];

  // 1. Generate SKILL.md
  const skillMd = emitSkill(doc);
  const skillMdResult: BuildResult = {
    inputFile,
    outputPath: `${skillDir}/SKILL.md`,
    content: skillMd,
    size: Buffer.byteLength(skillMd, 'utf8'),
  };

  // Attach statics to SKILL.md result (processed during write phase)
  if (doc.statics.length > 0) {
    skillMdResult.statics = doc.statics.map(s => ({
      src: path.resolve(inputDir, s.src),
      dest: `${skillDir}/${s.dest || path.basename(s.src)}`,
    }));
  }

  results.push(skillMdResult);

  // 2. Generate SkillFiles
  for (const file of doc.files) {
    const content = emitSkillFile(file);
    results.push({
      inputFile,
      outputPath: `${skillDir}/${file.name}`,
      content,
      size: Buffer.byteLength(content, 'utf8'),
    });
  }

  return results;
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
  const mcpConfigs: { inputFile: string; doc: MCPConfigDocumentNode }[] = [];
  const allStateNames: string[] = [];
  const v3RuntimeFiles: RuntimeFileInfo[] = [];  // Collect V3 runtime info for single-entry bundling
  let v3RuntimePath = '';  // Track the runtime output path
  let errorCount = 0;

  // Phase 1: Process all files and collect results
  for (const inputFile of tsxFiles) {
    try {
      // Parse file
      const sourceFile = project.addSourceFileAtPath(inputFile);

      // Check for V3 mode (explicit flag or auto-detect)
      const fileContent = sourceFile.getFullText();
      const useV3 = options.v3 || hasV3Imports(fileContent);

      // V3 build path
      if (useV3) {
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

        // Collect runtime file info for single-entry bundling
        if (v3Result.runtimeFileInfo) {
          v3RuntimeFiles.push(v3Result.runtimeFileInfo);
          v3RuntimePath = v3Result.runtimePath;  // All V3 files share the same path
        }

        // Log warnings
        for (const warning of v3Result.warnings) {
          logWarning(warning);
        }

        continue; // Skip v1 processing
      }

      // V1 build path
      // Find root JSX
      const root = findRootJsxElement(sourceFile);
      if (!root) {
        throw new Error('No JSX element found in file');
      }

      // Transform to IR (pass sourceFile for error location context)
      const doc = transform(root, sourceFile);

      // Determine output path and emit based on document type
      const basename = path.basename(inputFile, '.tsx');

      if (doc.kind === 'skillDocument') {
        // Skill: multi-file output to .claude/skills/{name}/
        const skillResults = processSkill(doc, inputFile);
        results.push(...skillResults);
      } else if (doc.kind === 'agentDocument') {
        // Agent: emit with GSD format (pass sourceFile for structured_returns)
        const markdown = emitAgent(doc, sourceFile);

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
        const outputPath = path.join(agentDir, `${basename}.md`);

        results.push({
          inputFile,
          outputPath,
          content: markdown,
          size: Buffer.byteLength(markdown, 'utf8'),
        });
      } else if (doc.kind === 'mcpConfigDocument') {
        // MCP config: collect servers for batch merge at end
        mcpConfigs.push({
          inputFile,
          doc,
        });
        // Don't add to results - settings.json handled separately after loop
      } else if (doc.kind === 'document') {
        // Command: emit with standard format, use --out option
        const markdown = emit(doc);
        const outputPath = path.join(options.out, `${basename}.md`);

        // Run validation pass for documents with SpawnAgent
        const validationErrors = validateSpawnAgents(doc, sourceFile);
        for (const valError of validationErrors) {
          errorCount++;
          console.error(formatCrossFileError(valError));
        }
        // Note: Validation errors are logged but build continues (warning mode)
        // To make validation blocking, add: if (validationErrors.length > 0) continue;

        results.push({
          inputFile,
          outputPath,
          content: markdown,
          size: Buffer.byteLength(markdown, 'utf8'),
        });
      } else if (doc.kind === 'stateDocument') {
        // State: multi-file output to .claude/skills/{skill-name}/SKILL.md
        const stateDoc = doc as StateDocumentNode;
        const result = await emitState(stateDoc);

        // Track state name for main init generation
        allStateNames.push(result.stateName);

        // Write all skill files as directories (Claude Code expects skill directories)
        for (const skill of result.skills) {
          // Convert "task-state.init.md" to "task-state.init/SKILL.md"
          const skillName = skill.filename.replace(/\.md$/, '');
          const skillPath = `.claude/skills/${skillName}/SKILL.md`;
          results.push({
            inputFile,
            outputPath: skillPath,
            content: skill.content,
            size: Buffer.byteLength(skill.content, 'utf8'),
          });
        }
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

  // Generate main init skill if any states were processed
  if (allStateNames.length > 0) {
    const mainInit = generateMainInitSkill(allStateNames);
    // Convert "init.all.md" to "init.all/SKILL.md"
    const skillName = mainInit.filename.replace(/\.md$/, '');
    results.push({
      inputFile: 'generated',
      outputPath: `.claude/skills/${skillName}/SKILL.md`,
      content: mainInit.content,
      size: Buffer.byteLength(mainInit.content, 'utf8'),
    });
  }

  // Bundle all V3 runtimes using single-entry approach (deduplicates shared code)
  if (v3RuntimeFiles.length > 0) {
    const bundleResult = await bundleSingleEntryRuntime({
      runtimeFiles: v3RuntimeFiles,
      outputPath: v3RuntimePath,
    });

    results.push({
      inputFile: `${v3RuntimeFiles.length} V3 file(s)`,
      outputPath: v3RuntimePath,
      content: bundleResult.content,
      size: Buffer.byteLength(bundleResult.content, 'utf8'),
    });

    // Log any bundle warnings
    for (const warning of bundleResult.warnings) {
      logWarning(warning);
    }
  }

  // Merge all MCP configs into settings.json
  if (mcpConfigs.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allServers: Record<string, any> = {};

    for (const { doc } of mcpConfigs) {
      const servers = emitSettings(doc);
      Object.assign(allServers, servers);
    }

    if (!options.dryRun) {
      await mergeSettings('.mcp.json', allServers);
    }

    // Log success for MCP configs
    for (const { inputFile } of mcpConfigs) {
      logSuccess(inputFile, '.mcp.json');
    }

    // Add to results for tree display (file already written by mergeSettings)
    const settingsContent = JSON.stringify(allServers, null, 2);
    results.push({
      inputFile: mcpConfigs.map(c => c.inputFile).join(', '),
      outputPath: '.mcp.json',
      content: settingsContent,
      size: Buffer.byteLength(settingsContent, 'utf8'),
      skipWrite: true,  // Already written by mergeSettings
    });
  }

  // Phase 2: Write files (unless dry-run) and display tree
  if (!options.dryRun) {
    // Write all files (ensure directory exists per-file since Agents may have different paths)
    for (const result of results) {
      // Skip files already written (e.g., settings.json handled by mergeSettings)
      if (result.skipWrite) continue;

      const outputDir = path.dirname(result.outputPath);
      await mkdir(outputDir, { recursive: true });
      await writeFile(result.outputPath, result.content, 'utf-8');
      logSuccess(result.inputFile, result.outputPath);

      // Copy static files if present (skills only)
      if (result.statics) {
        for (const staticFile of result.statics) {
          const destDir = path.dirname(staticFile.dest);
          await mkdir(destDir, { recursive: true });
          await copyFile(staticFile.src, staticFile.dest);
          logSuccess(staticFile.src, staticFile.dest);
        }
      }
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
  .option('--v3', 'Use V3 hybrid runtime mode (TypeScript functions + Markdown)')
  .option('--runtime-out <dir>', 'Runtime output directory for V3 mode', '.claude/runtime')
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
