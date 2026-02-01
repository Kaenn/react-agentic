/**
 * Configuration loading and merging for react-agentic
 *
 * Priority (highest to lowest):
 * 1. CLI flags
 * 2. react-agentic.config.json
 * 3. Built-in defaults
 */
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { DEFAULT_OUTPUT_DIR, DEFAULT_RUNTIME_DIR } from '../constants.js';

/**
 * Configuration options for react-agentic builds
 */
export interface ReactAgenticConfig {
  /** Output directory for markdown files (default: .claude/commands) */
  outputDir: string;
  /** Output directory for runtime bundles (default: .claude/runtime) */
  runtimeDir: string;
  /** Minify runtime bundles (default: false) */
  minify: boolean;
  /** Split runtime into per-namespace modules (default: false) */
  codeSplit: boolean;
  /** Directory for agent definition files (default: ~/.claude/agents/) */
  agentsDir: string;
}

/**
 * Built-in default configuration
 */
export const DEFAULT_CONFIG: ReactAgenticConfig = {
  outputDir: DEFAULT_OUTPUT_DIR,
  runtimeDir: DEFAULT_RUNTIME_DIR,
  minify: false,
  codeSplit: false,
  agentsDir: '~/.claude/agents/',
};

const CONFIG_FILENAME = 'react-agentic.config.json';

/**
 * Load configuration from react-agentic.config.json if it exists
 * Returns partial config (only fields present in file)
 */
export async function loadConfigFile(cwd: string = process.cwd()): Promise<Partial<ReactAgenticConfig>> {
  const configPath = path.join(cwd, CONFIG_FILENAME);

  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const content = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content);

    // Validate and extract known fields only
    const config: Partial<ReactAgenticConfig> = {};

    if (typeof parsed.outputDir === 'string') {
      config.outputDir = parsed.outputDir;
    }
    if (typeof parsed.runtimeDir === 'string') {
      config.runtimeDir = parsed.runtimeDir;
    }
    if (typeof parsed.minify === 'boolean') {
      config.minify = parsed.minify;
    }
    if (typeof parsed.codeSplit === 'boolean') {
      config.codeSplit = parsed.codeSplit;
    }
    if (typeof parsed.agentsDir === 'string') {
      config.agentsDir = parsed.agentsDir;
    }

    return config;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load ${CONFIG_FILENAME}: ${message}`);
  }
}

/**
 * CLI options that can override config
 */
export interface CLIConfigOverrides {
  out?: string;
  runtimeOut?: string;
  minify?: boolean;
  codeSplit?: boolean;
  agentsDir?: string;
}

/**
 * Configuration validation errors
 */
export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Validate configuration for common issues
 *
 * Checks:
 * - Output directories are not the same (would cause conflicts)
 * - Paths don't contain problematic characters
 */
function validateConfig(config: ReactAgenticConfig): void {
  // Normalize paths for comparison
  const normalizedOutput = path.normalize(config.outputDir);
  const normalizedRuntime = path.normalize(config.runtimeDir);

  // Check for output directory conflicts
  if (normalizedOutput === normalizedRuntime) {
    throw new ConfigValidationError(
      `outputDir and runtimeDir cannot be the same: ${config.outputDir}`
    );
  }

  // Check if one is a parent of the other (would cause nested writes)
  if (normalizedRuntime.startsWith(normalizedOutput + path.sep)) {
    throw new ConfigValidationError(
      `runtimeDir (${config.runtimeDir}) cannot be inside outputDir (${config.outputDir})`
    );
  }
  if (normalizedOutput.startsWith(normalizedRuntime + path.sep)) {
    throw new ConfigValidationError(
      `outputDir (${config.outputDir}) cannot be inside runtimeDir (${config.runtimeDir})`
    );
  }
}

/**
 * Derive runtime directory from output directory
 * Replaces 'commands' with 'runtime' in the path
 */
function deriveRuntimeDir(outputDir: string): string {
  // If outputDir contains 'commands', replace with 'runtime'
  if (outputDir.includes('commands')) {
    return outputDir.replace(/commands/g, 'runtime');
  }
  // Otherwise, use sibling 'runtime' directory
  return path.join(path.dirname(outputDir), 'runtime');
}

/**
 * Resolve final configuration by merging:
 * defaults → config file → CLI flags
 *
 * When --out is specified but --runtime-out is not, the runtime directory
 * is derived from the output directory (replacing 'commands' with 'runtime').
 *
 * @throws {ConfigValidationError} if configuration is invalid
 */
export async function resolveConfig(
  cliOptions: CLIConfigOverrides,
  cwd: string = process.cwd()
): Promise<ReactAgenticConfig> {
  // Load config file (if exists)
  const fileConfig = await loadConfigFile(cwd);

  // Resolve output directory first
  const outputDir = cliOptions.out ?? fileConfig.outputDir ?? DEFAULT_CONFIG.outputDir;

  // Resolve runtime directory:
  // 1. Explicit CLI flag takes precedence
  // 2. Config file setting
  // 3. If --out was specified, derive from it
  // 4. Fall back to default
  let runtimeDir: string;
  if (cliOptions.runtimeOut) {
    runtimeDir = cliOptions.runtimeOut;
  } else if (fileConfig.runtimeDir) {
    runtimeDir = fileConfig.runtimeDir;
  } else if (cliOptions.out) {
    // Derive from custom output directory
    runtimeDir = deriveRuntimeDir(outputDir);
  } else {
    runtimeDir = DEFAULT_CONFIG.runtimeDir;
  }

  const config: ReactAgenticConfig = {
    outputDir,
    runtimeDir,
    minify: cliOptions.minify ?? fileConfig.minify ?? DEFAULT_CONFIG.minify,
    codeSplit: cliOptions.codeSplit ?? fileConfig.codeSplit ?? DEFAULT_CONFIG.codeSplit,
    agentsDir: cliOptions.agentsDir ?? fileConfig.agentsDir ?? DEFAULT_CONFIG.agentsDir,
  };

  // Validate the merged config
  validateConfig(config);

  return config;
}
