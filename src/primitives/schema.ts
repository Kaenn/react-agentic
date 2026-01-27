/**
 * Schema-based declarations for react-agentic
 *
 * Provides compile-time helpers for declaring variables, files, and context
 * with TypeScript type safety.
 */

import type { VariableRef } from './variables.js';

// ============================================================================
// Variable Schema
// ============================================================================

/**
 * Definition for a single variable in defineVars schema
 */
export interface VarDef {
  /** TypeScript type hint (compile-time only) */
  type?: 'string' | 'number' | 'boolean';
  /** Default value if not assigned */
  default?: string | number | boolean;
}

/**
 * Schema type for defineVars - maps names to VarDef
 */
export type VarSchema = Record<string, VarDef | undefined>;

/**
 * Infer TypeScript type from VarDef
 */
type InferVarType<T extends VarDef | undefined> = T extends { type: 'number' }
  ? number
  : T extends { type: 'boolean' }
    ? boolean
    : string;

/**
 * Output type from defineVars - maps schema keys to VariableRefs
 */
export type VarsFromSchema<T extends VarSchema> = {
  [K in keyof T]: VariableRef<InferVarType<T[K]>>;
};

/**
 * Declare multiple shell variables from a schema
 *
 * This is a compile-time helper that creates VariableRef objects.
 * The actual assignment is specified on <Assign> where you emit it.
 *
 * @param schema - Object mapping variable names to VarDef options
 * @returns Object with VariableRef for each schema key
 *
 * @example Basic usage
 * const vars = defineVars({
 *   PHASE: { type: 'string' },
 *   MODEL_PROFILE: { default: 'balanced' },
 *   DEBUG: { type: 'boolean' },
 * });
 *
 * // Use in JSX:
 * <Assign var={vars.PHASE} bash={`echo $PHASE_NUMBER`} />
 * <If test={`[ "${vars.MODEL_PROFILE.ref}" = "quality" ]`}>
 *
 * @example Replaces multiple useVariable calls
 * // Before:
 * const phase = useVariable('PHASE');
 * const model = useVariable('MODEL_PROFILE');
 * const debug = useVariable('DEBUG');
 *
 * // After:
 * const vars = defineVars({
 *   PHASE: {},
 *   MODEL_PROFILE: { default: 'balanced' },
 *   DEBUG: { type: 'boolean' },
 * });
 */
export function defineVars<T extends VarSchema>(schema: T): VarsFromSchema<T> {
  const result: Record<string, VariableRef> = {};

  for (const key of Object.keys(schema)) {
    result[key] = { name: key, ref: key };
  }

  return result as VarsFromSchema<T>;
}

// ============================================================================
// File Schema
// ============================================================================

/**
 * Definition for a single file in defineFiles schema
 */
export interface FileDef {
  /** File path - static string or function using vars */
  path: string | ((vars: Record<string, string>) => string);
  /** Whether file must exist (default: true) */
  required?: boolean;
}

/**
 * Schema type for defineFiles - maps names to FileDef
 */
export type FileSchema = Record<string, FileDef>;

/**
 * Reference to a file defined in schema
 */
export interface FileRef {
  /** Variable name for content (e.g., "STATE_CONTENT") */
  varName: string;
  /** Original key from schema (e.g., "state") */
  key: string;
  /** File path (may contain variable references) */
  path: string;
  /** Whether file is required */
  required: boolean;
}

/**
 * Output type from defineFiles - maps schema keys to FileRefs
 */
export type FilesFromSchema<T extends FileSchema> = {
  [K in keyof T]: FileRef;
} & {
  /** Get all FileRefs as array (for ReadFiles component) */
  _refs: FileRef[];
};

/**
 * Declare file contracts with paths and requirements
 *
 * This is a compile-time helper that creates FileRef objects for use
 * with the <ReadFiles> component.
 *
 * @param schema - Object mapping file names to FileDef options
 * @returns Object with FileRef for each schema key, plus _refs array
 *
 * @example Basic usage
 * const files = defineFiles({
 *   state: { path: '.planning/STATE.md', required: true },
 *   requirements: { path: '.planning/REQUIREMENTS.md', required: false },
 * });
 *
 * // Use with ReadFiles:
 * <ReadFiles files={files} />
 *
 * // Access individual file content variable:
 * <If test={`[ -n "${files.state.varName}" ]`}>
 *
 * @example Dynamic paths using variables
 * const files = defineFiles({
 *   context: {
 *     path: (v) => `${v.PHASE_DIR}/*-CONTEXT.md`,
 *     required: false,
 *   },
 * });
 */
export function defineFiles<T extends FileSchema>(schema: T): FilesFromSchema<T> {
  const result: Record<string, FileRef> = {};
  const refs: FileRef[] = [];

  for (const key of Object.keys(schema)) {
    const def = schema[key];
    // Convert key to UPPER_SNAKE_CASE variable name + _CONTENT suffix
    const varName = key.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase() + '_CONTENT';

    // Resolve path - if function, mark for runtime resolution
    const pathValue = typeof def.path === 'function'
      ? def.path({}) // Placeholder - actual resolution happens at transform time
      : def.path;

    const fileRef: FileRef = {
      varName,
      key,
      path: pathValue,
      required: def.required !== false, // Default true
    };

    result[key] = fileRef;
    refs.push(fileRef);
  }

  return {
    ...result,
    _refs: refs,
  } as FilesFromSchema<T>;
}

// ============================================================================
// Context Schema
// ============================================================================

/**
 * Agent reference for defineContext
 */
export interface AgentDef {
  /** Path to agent markdown file */
  path: string;
  /** Optional model override */
  model?: string;
}

/**
 * Definition for defineContext
 */
export interface ContextDef {
  /** Agent definitions */
  agents?: Record<string, string | AgentDef>;
  /** Variable definitions (from defineVars) */
  vars?: VarsFromSchema<VarSchema>;
  /** File definitions (from defineFiles) */
  files?: FilesFromSchema<FileSchema>;
}

/**
 * Output type from defineContext
 */
export interface Context {
  /** Resolved agent references */
  agents: Record<string, { path: string; model?: string }>;
  /** Variable refs (passthrough from defineVars) */
  vars: VarsFromSchema<VarSchema>;
  /** File refs (passthrough from defineFiles) */
  files: FilesFromSchema<FileSchema>;
}

/**
 * Create unified context for Command or Agent
 *
 * Combines agents, variables, and files into a single context object.
 * This is a compile-time helper - the context is available for
 * use in the component body.
 *
 * @param def - Context definition with agents, vars, and files
 * @returns Unified context object
 *
 * @example Basic usage
 * const ctx = defineContext({
 *   agents: {
 *     researcher: '~/.claude/agents/gsd-phase-researcher.md',
 *     planner: { path: '~/.claude/agents/gsd-planner.md', model: 'sonnet' },
 *   },
 *   vars: defineVars({
 *     PHASE: { type: 'string' },
 *     MODEL_PROFILE: { default: 'balanced' },
 *   }),
 *   files: defineFiles({
 *     state: { path: '.planning/STATE.md', required: true },
 *   }),
 * });
 *
 * <Command name="my-cmd" context={ctx}>
 *   <Assign var={ctx.vars.PHASE} bash={`...`} />
 *   <ReadFiles files={ctx.files} />
 *   <SpawnAgent agent={ctx.agents.researcher} ... />
 * </Command>
 */
export function defineContext(def: ContextDef): Context {
  // Normalize agents
  const agents: Record<string, { path: string; model?: string }> = {};
  if (def.agents) {
    for (const [key, value] of Object.entries(def.agents)) {
      if (typeof value === 'string') {
        agents[key] = { path: value };
      } else {
        agents[key] = value;
      }
    }
  }

  return {
    agents,
    vars: def.vars || ({} as unknown as VarsFromSchema<VarSchema>),
    files: def.files || ({ _refs: [] } as unknown as FilesFromSchema<FileSchema>),
  };
}
