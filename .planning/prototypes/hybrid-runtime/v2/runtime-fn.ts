/**
 * runtime-fn.ts - Type-safe script registration
 *
 * This module provides the `runtimeFn` function that creates
 * typed TSX components from runtime functions.
 */

import type { ScriptVarProxy } from './script-var';

// ============================================================================
// Types
// ============================================================================

/**
 * A runtime function signature.
 * All runtime functions are async and take a single args object.
 */
type RuntimeFunction<TArgs extends object | void, TReturn> =
  TArgs extends void
    ? () => Promise<TReturn>
    : (args: TArgs) => Promise<TReturn>;

/**
 * Props for the generated component when function has args and return.
 */
interface ScriptCallPropsWithArgsAndOutput<TArgs extends object, TReturn> {
  args: TArgs;
  output: ScriptVarProxy<TReturn>;
}

/**
 * Props for the generated component when function has no args but has return.
 */
interface ScriptCallPropsOutputOnly<TReturn> {
  output: ScriptVarProxy<TReturn>;
}

/**
 * Props for the generated component when function has args but no return.
 */
interface ScriptCallPropsArgsOnly<TArgs extends object> {
  args: TArgs;
}

/**
 * Props for the generated component when function has no args and no return.
 */
type ScriptCallPropsEmpty = Record<string, never>;

/**
 * Infer the correct props type based on function signature.
 */
type InferScriptCallProps<TArgs, TReturn> =
  TArgs extends void
    ? TReturn extends void
      ? ScriptCallPropsEmpty
      : ScriptCallPropsOutputOnly<TReturn>
    : TReturn extends void
      ? ScriptCallPropsArgsOnly<TArgs & object>
      : ScriptCallPropsWithArgsAndOutput<TArgs & object, TReturn>;

/**
 * The return type of fromRuntime - a component with a .Call property.
 */
interface FromRuntimeResult<TArgs, TReturn> {
  /**
   * Component form: <Init.Call args={...} output={...} />
   */
  Call: (props: InferScriptCallProps<TArgs, TReturn>) => JSX.Element;

  /**
   * Function name for debugging/logging.
   */
  readonly fnName: string;

  /**
   * Runtime file path.
   */
  readonly runtime: string;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a typed TSX component from a runtime function.
 *
 * @example
 * ```tsx
 * // In runtime file
 * export async function init(args: { arguments: string }): Promise<Context> {
 *   // implementation
 * }
 *
 * // In TSX file
 * import { init } from './runtime';
 * const Init = runtimeFn(init);
 *
 * // Usage - fully typed!
 * <Init.Call args={{ arguments: "$ARGUMENTS" }} output={ctx} />
 * ```
 */
export function runtimeFn<TArgs extends object | void, TReturn>(
  fn: RuntimeFunction<TArgs, TReturn>,
  options?: { runtime?: string }
): FromRuntimeResult<TArgs, TReturn> {
  const fnName = fn.name;
  const runtime = options?.runtime ?? inferRuntimePath();

  // Create the Call component
  const Call = (props: InferScriptCallProps<TArgs, TReturn>): JSX.Element => {
    // This is a compile-time representation
    // The actual JSX.Element will be created by the compiler
    return {
      type: 'Script',
      props: {
        fn: fnName,
        runtime,
        args: 'args' in props ? props.args : undefined,
        output: 'output' in props ? props.output : undefined,
      },
    } as unknown as JSX.Element;
  };

  return {
    Call,
    fnName,
    runtime,
  };
}

/**
 * Infer the runtime path from the call stack.
 * In real implementation, this would use import.meta or similar.
 */
function inferRuntimePath(): string {
  // Placeholder - real implementation would derive from file path
  return 'auto-detected';
}

// ============================================================================
// Compile-time Transformation
// ============================================================================

/**
 * At compile time, the TSX compiler transforms:
 *
 * ```tsx
 * <Init.Call args={{ arguments: "$ARGUMENTS" }} output={ctx} />
 * ```
 *
 * Into this IR node:
 *
 * ```typescript
 * {
 *   type: 'ScriptCall',
 *   fn: 'init',
 *   runtime: 'plan-phase.runtime.js',
 *   args: { arguments: '$ARGUMENTS' },
 *   output: { varName: 'ctx', path: [] }
 * }
 * ```
 *
 * Which emits this markdown:
 *
 * ```markdown
 * ```bash
 * CTX=$(node .claude/runtime/plan-phase.runtime.js init '{"arguments":"'"$ARGUMENTS"'"}')
 * ```
 * ```
 */

// ============================================================================
// Type Helpers for Complex Scenarios
// ============================================================================

/**
 * For runtime functions that might fail, wrap the return type.
 */
export type RuntimeResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Extract the success data type from a RuntimeResult.
 */
export type ExtractData<T> = T extends RuntimeResult<infer D> ? D : T;

/**
 * Helper to create a runtimeFn with explicit types when inference fails.
 */
export function runtimeFnTyped<TArgs extends object, TReturn>(
  fn: (args: TArgs) => Promise<TReturn>,
  options?: { runtime?: string }
): FromRuntimeResult<TArgs, TReturn> {
  return runtimeFn(fn, options);
}

// ============================================================================
// Usage Examples (for documentation)
// ============================================================================

/*
// Example 1: Function with args and return
async function init(args: { arguments: string }): Promise<Context> { ... }
const Init = runtimeFn(init);
<Init.Call args={{ arguments: "$ARGUMENTS" }} output={ctx} />

// Example 2: Function with no args
async function getTimestamp(): Promise<string> { ... }
const GetTimestamp = runtimeFn(getTimestamp);
<GetTimestamp.Call output={timestamp} />

// Example 3: Function with no return (side effect only)
async function archivePlans(args: { dir: string }): Promise<void> { ... }
const ArchivePlans = runtimeFn(archivePlans);
<ArchivePlans.Call args={{ dir: ctx.phaseDir }} />

// Example 4: Accessing script var properties (compile-time only)
const ctx = useScriptVar<Context>('ctx');
// ctx.phaseId is typed as string at compile time
// At emit time, it becomes: $(echo "$CTX" | jq -r '.phaseId')
*/
