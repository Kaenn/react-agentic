/**
 * Source helper functions for Assign component
 *
 * These functions provide a typed API for specifying data sources in the
 * <Assign from={...}> pattern. Each helper returns a branded object with
 * __sourceType for compile-time discrimination.
 *
 * All functions are compile-time only - they return metadata objects that
 * the transpiler uses to generate the appropriate markdown/bash syntax.
 */

// ============================================================================
// Source Type Interfaces
// ============================================================================

/**
 * File source - reads content from a file path
 *
 * @example
 * <Assign var={state} from={file('.planning/STATE.md')} />
 * // Emits: STATE=$(cat .planning/STATE.md)
 */
export interface FileSource {
  /** Type discriminator */
  __sourceType: 'file';
  /** Path to the file to read */
  path: string;
  /** Whether the file is optional (no error if missing) */
  optional?: boolean;
}

/**
 * Bash command source - captures output from a command
 *
 * @example
 * <Assign var={phaseDir} from={bash('ls -d .planning/phases/${PHASE}-*')} />
 * // Emits: PHASE_DIR=$(ls -d .planning/phases/${PHASE}-*)
 */
export interface BashSource {
  /** Type discriminator */
  __sourceType: 'bash';
  /** Bash command to execute */
  command: string;
}

/**
 * Value source - assigns a static value
 *
 * @example
 * <Assign var={outputFile} from={value('/tmp/output.md')} />
 * // Emits: OUTPUT_FILE=/tmp/output.md
 */
export interface ValueSource {
  /** Type discriminator */
  __sourceType: 'value';
  /** Static value to assign */
  value: string;
  /** Whether to emit raw without quoting (for special values like "$HOME") */
  raw?: boolean;
}

/**
 * Environment variable source - reads from an env var
 *
 * @example
 * <Assign var={phase} from={env('PHASE_NUMBER')} />
 * // Emits: PHASE=$PHASE_NUMBER
 */
export interface EnvSource {
  /** Type discriminator */
  __sourceType: 'env';
  /** Environment variable name to read */
  envVar: string;
}

/**
 * Union of all source types
 * Used in Assign component's from prop
 */
export type AssignSource = FileSource | BashSource | ValueSource | EnvSource;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a file source
 *
 * @param path - Path to the file to read
 * @param options - Optional configuration
 * @param options.optional - Whether the file is optional (no error if missing)
 * @returns FileSource object
 *
 * @example
 * const stateSource = file('.planning/STATE.md');
 * <Assign var={state} from={stateSource} />
 *
 * @example optional file
 * const configSource = file('.config.json', { optional: true });
 * <Assign var={config} from={configSource} />
 */
export function file(path: string, options?: { optional?: boolean }): FileSource {
  return {
    __sourceType: 'file',
    path,
    optional: options?.optional,
  };
}

/**
 * Create a bash command source
 *
 * @param command - Bash command to execute
 * @returns BashSource object
 *
 * @example
 * const phaseDirSource = bash('ls -d .planning/phases/${PHASE}-* | head -1');
 * <Assign var={phaseDir} from={phaseDirSource} />
 */
export function bash(command: string): BashSource {
  return {
    __sourceType: 'bash',
    command,
  };
}

/**
 * Create a value source
 *
 * @param val - Static value to assign
 * @param options - Optional configuration
 * @param options.raw - Whether to emit raw without quoting (for special values)
 * @returns ValueSource object
 *
 * @example
 * const outputSource = value('/tmp/output.md');
 * <Assign var={outputFile} from={outputSource} />
 *
 * @example raw value (no quoting)
 * const homeSource = value('$HOME/projects', { raw: true });
 * <Assign var={projectsDir} from={homeSource} />
 */
export function value(val: string, options?: { raw?: boolean }): ValueSource {
  return {
    __sourceType: 'value',
    value: val,
    raw: options?.raw,
  };
}

/**
 * Create an environment variable source
 *
 * @param varName - Environment variable name to read
 * @returns EnvSource object
 *
 * @example
 * const phaseSource = env('PHASE_NUMBER');
 * <Assign var={phase} from={phaseSource} />
 */
export function env(varName: string): EnvSource {
  return {
    __sourceType: 'env',
    envVar: varName,
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a FileSource
 *
 * @param source - Value to check
 * @returns true if source is a FileSource
 */
export function isFileSource(source: unknown): source is FileSource {
  return (
    typeof source === 'object' &&
    source !== null &&
    (source as FileSource).__sourceType === 'file'
  );
}

/**
 * Check if a value is a BashSource
 *
 * @param source - Value to check
 * @returns true if source is a BashSource
 */
export function isBashSource(source: unknown): source is BashSource {
  return (
    typeof source === 'object' &&
    source !== null &&
    (source as BashSource).__sourceType === 'bash'
  );
}

/**
 * Check if a value is a ValueSource
 *
 * @param source - Value to check
 * @returns true if source is a ValueSource
 */
export function isValueSource(source: unknown): source is ValueSource {
  return (
    typeof source === 'object' &&
    source !== null &&
    (source as ValueSource).__sourceType === 'value'
  );
}

/**
 * Check if a value is an EnvSource
 *
 * @param source - Value to check
 * @returns true if source is an EnvSource
 */
export function isEnvSource(source: unknown): source is EnvSource {
  return (
    typeof source === 'object' &&
    source !== null &&
    (source as EnvSource).__sourceType === 'env'
  );
}

/**
 * Check if a value is any AssignSource
 *
 * @param source - Value to check
 * @returns true if source is an AssignSource
 */
export function isAssignSource(source: unknown): source is AssignSource {
  return (
    isFileSource(source) ||
    isBashSource(source) ||
    isValueSource(source) ||
    isEnvSource(source)
  );
}
