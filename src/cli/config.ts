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
}

/**
 * Built-in default configuration
 */
export const DEFAULT_CONFIG: ReactAgenticConfig = {
  outputDir: '.claude/commands',
  runtimeDir: '.claude/runtime',
  minify: false,
  codeSplit: false,
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
}

/**
 * Resolve final configuration by merging:
 * defaults → config file → CLI flags
 */
export async function resolveConfig(
  cliOptions: CLIConfigOverrides,
  cwd: string = process.cwd()
): Promise<ReactAgenticConfig> {
  // Load config file (if exists)
  const fileConfig = await loadConfigFile(cwd);

  // Merge: defaults → file → CLI
  return {
    outputDir: cliOptions.out ?? fileConfig.outputDir ?? DEFAULT_CONFIG.outputDir,
    runtimeDir: cliOptions.runtimeOut ?? fileConfig.runtimeDir ?? DEFAULT_CONFIG.runtimeDir,
    minify: cliOptions.minify ?? fileConfig.minify ?? DEFAULT_CONFIG.minify,
    codeSplit: cliOptions.codeSplit ?? fileConfig.codeSplit ?? DEFAULT_CONFIG.codeSplit,
  };
}
