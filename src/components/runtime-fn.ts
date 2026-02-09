/**
 * Runtime Function System for Hybrid Runtime
 *
 * RuntimeFn wraps TypeScript functions for extraction to runtime.js.
 * Each wrapped function gets a `.Call` component for JSX invocation.
 *
 * Usage:
 * // Define function
 * async function init(args: InitArgs): Promise<InitResult> { ... }
 *
 * // Wrap for compile-time
 * const Init = runtimeFn(init);
 *
 * // Use in JSX
 * <Init.Call args={{ x: "1" }} output={ctx} />
 *
 * // Emits: CTX=$(node runtime.js init '{"x":"1"}')
 */

import type { RuntimeVarProxy, AllowRuntimeVars } from './runtime-var.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Async function that can be wrapped as a RuntimeFn
 * Must be a named async function for extraction
 */
export type RuntimeFunction<TArgs extends object, TReturn> = (
  args: TArgs
) => Promise<TReturn>;

/**
 * Props for the .Call component
 *
 * @param args - Arguments to pass to the function (each can be static or RuntimeVar)
 * @param output - RuntimeVar to store the result (must match TReturn type)
 */
export interface RuntimeCallProps<TArgs extends object, TReturn> {
  /** Arguments passed to the runtime function. Each property can be static or RuntimeVar. */
  args: AllowRuntimeVars<TArgs>;
  /** RuntimeVar to store the function result */
  output: RuntimeVarProxy<TReturn>;
}

/**
 * The .Call component type
 * This is what users invoke in JSX
 */
export type RuntimeCallComponent<TArgs extends object, TReturn> = (
  props: RuntimeCallProps<TArgs, TReturn>
) => null;

/**
 * Wrapper returned by runtimeFn()
 * Contains the .Call component and metadata for extraction
 */
export interface RuntimeFnComponent<TArgs extends object, TReturn> {
  /** JSX component for invoking the function */
  Call: RuntimeCallComponent<TArgs, TReturn>;
  /** Original function name for extraction */
  readonly fnName: string;
  /** Original function reference for extraction */
  readonly fn: RuntimeFunction<TArgs, TReturn>;
  /** Marker for type guard */
  readonly __isRuntimeFn: true;

  // Reference properties for printing
  /** Function identifier name (e.g., "initProject") */
  readonly name: string;
  /** Function call syntax with parens (e.g., "initProject()") */
  readonly call: string;
  /** Comma-separated parameter names from function signature */
  readonly input: string;
  /** Output type as JSON schema string (placeholder - requires compile-time extraction) */
  readonly output: string;
}

// ============================================================================
// Internal Symbols
// ============================================================================

/**
 * Symbol for identifying RuntimeFn wrappers
 */
const RUNTIME_FN_MARKER = Symbol.for('react-agentic:runtime-fn');

/**
 * Registry of all runtime functions for extraction
 * Maps function name -> function reference
 */
const runtimeFnRegistry = new Map<string, RuntimeFunction<object, unknown>>();

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Extract parameter names from a function
 *
 * Uses function.toString() to get source and parses parameter names.
 * Strips type annotations to get just the names.
 *
 * @param fn - Function to extract parameter names from
 * @returns Comma-separated parameter names, or empty string if none
 *
 * @example
 * async function foo(args: Args) { ... }
 * // Returns: "args"
 *
 * async function bar(a: string, b: number) { ... }
 * // Returns: "a, b"
 */
function extractParameterNames(fn: Function): string {
  const fnStr = fn.toString();
  const match = fnStr.match(/\(([^)]*)\)/);
  if (!match || !match[1].trim()) return '';

  // Extract parameter names, stripping types and default values
  const params = match[1].split(',').map(p => {
    // Get everything before : (type annotation) or = (default value)
    const name = p.trim().split(/[:\s=]/)[0];
    return name.trim();
  }).filter(Boolean);

  return params.join(', ');
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Wrap a TypeScript function for runtime extraction
 *
 * The wrapped function:
 * 1. Gets extracted to runtime.js during build
 * 2. Provides a .Call component for JSX invocation
 * 3. Maintains full type safety between args/output
 *
 * @param fn - Async function to wrap
 * @returns RuntimeFnComponent with .Call and metadata
 *
 * @example
 * // Define the function
 * interface InitArgs { projectPath: string }
 * interface InitResult { success: boolean; error?: string }
 *
 * async function initProject(args: InitArgs): Promise<InitResult> {
 *   const exists = await checkPath(args.projectPath);
 *   return exists
 *     ? { success: true }
 *     : { success: false, error: 'Path not found' };
 * }
 *
 * // Wrap for JSX use
 * const Init = runtimeFn(initProject);
 *
 * // Use in Command
 * export default (
 *   <Command name="setup">
 *     {() => {
 *       const result = useRuntimeVar<InitResult>('RESULT');
 *       return (
 *         <>
 *           <Init.Call args={{ projectPath: "." }} output={result} />
 *           <If condition={result.error}>
 *             <p>Error: {result.error}</p>
 *           </If>
 *         </>
 *       );
 *     }}
 *   </Command>
 * );
 */
export function runtimeFn<TArgs extends object, TReturn>(
  fn: RuntimeFunction<TArgs, TReturn>
): RuntimeFnComponent<TArgs, TReturn> {
  // Get function name (required for extraction)
  const fnName = fn.name;
  if (!fnName) {
    throw new Error(
      'runtimeFn requires a named function. Anonymous functions cannot be extracted to runtime.js.'
    );
  }

  // Register for extraction
  runtimeFnRegistry.set(fnName, fn as RuntimeFunction<object, unknown>);

  // Create the Call component stub (compile-time only)
  const Call: RuntimeCallComponent<TArgs, TReturn> = (_props) => {
    // This function is never actually called at runtime
    // It exists only for TypeScript type checking
    return null;
  };

  // Create wrapper with marker and reference properties
  const wrapper = {
    Call,
    fnName,
    fn,
    __isRuntimeFn: true as const,
    [RUNTIME_FN_MARKER]: true,
    // Reference properties for printing
    name: fnName,
    call: `${fnName}()`,
    input: extractParameterNames(fn),
    output: 'unknown', // Type extraction requires compile-time type analysis
  };

  return wrapper;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a RuntimeFn wrapper
 *
 * @param value - Value to check
 * @returns true if value is a RuntimeFnComponent
 */
export function isRuntimeFn(value: unknown): value is RuntimeFnComponent<object, unknown> {
  if (!value || typeof value !== 'object') return false;
  return (value as Record<string, unknown>).__isRuntimeFn === true;
}

// ============================================================================
// Registry Access (for emitter)
// ============================================================================

/**
 * Get all registered runtime functions
 *
 * Used by the runtime emitter to extract functions to runtime.js
 *
 * @returns Map of function name -> function
 */
export function getRuntimeFnRegistry(): Map<string, RuntimeFunction<object, unknown>> {
  return new Map(runtimeFnRegistry);
}

/**
 * Clear the runtime function registry
 *
 * Used between builds to ensure clean state
 */
export function clearRuntimeFnRegistry(): void {
  runtimeFnRegistry.clear();
}

/**
 * Get a specific runtime function by name
 *
 * @param name - Function name
 * @returns Function if found, undefined otherwise
 */
export function getRuntimeFn(name: string): RuntimeFunction<object, unknown> | undefined {
  return runtimeFnRegistry.get(name);
}
