/**
 * runtime-fn.ts - V3 with FULL type safety
 *
 * Key changes from v2:
 * 1. ScriptVar is branded to prevent type mismatches
 * 2. runtimeFn captures types and enforces them on Call props
 * 3. useScriptVar returns a properly branded type
 */

// ============================================================================
// Branded Types for Type Safety
// ============================================================================

/**
 * Unique symbol for ScriptVar branding.
 * This ensures ScriptVar<A> is not assignable to ScriptVar<B>.
 */
declare const __scriptVarBrand: unique symbol;

/**
 * A compile-time representation of a runtime variable.
 *
 * The phantom type T ensures type safety:
 * - ScriptVar<string> cannot be assigned to ScriptVar<number>
 * - Output of runtimeFn must match the ScriptVar type
 */
export interface ScriptVar<T> {
  /** Brand to make this type nominal, not structural */
  readonly [__scriptVarBrand]: T;
  /** The shell variable name (uppercase) */
  readonly __varName: string;
  /** Property access path for nested access */
  readonly __path: readonly string[];
}

/**
 * Deep proxy type that allows property access on ScriptVar.
 * Each property access returns a new ScriptVar with extended path.
 */
export type ScriptVarProxy<T> = ScriptVar<T> & {
  readonly [K in keyof T]: T[K] extends object
    ? ScriptVarProxy<T[K]>
    : ScriptVar<T[K]>;
};

// ============================================================================
// useScriptVar Hook
// ============================================================================

/**
 * Declares a typed script variable.
 *
 * @example
 * ```tsx
 * const ctx = useScriptVar<PlanPhaseContext>('ctx');
 * // ctx is ScriptVarProxy<PlanPhaseContext>
 * // ctx.phaseId is ScriptVar<string>
 * // ctx.flags is ScriptVarProxy<Flags>
 * // ctx.flags.gaps is ScriptVar<boolean>
 * ```
 */
export function useScriptVar<T>(name: string): ScriptVarProxy<T> {
  // Runtime: creates a Proxy that tracks property access
  // The actual implementation would be in the compiler runtime
  return createScriptVarProxy<T>(name, []);
}

function createScriptVarProxy<T>(varName: string, path: readonly string[]): ScriptVarProxy<T> {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === '__varName') return varName;
      if (prop === '__path') return path;
      // Return a new proxy with extended path
      return createScriptVarProxy<any>(varName, [...path, prop]);
    },
  };
  return new Proxy({} as ScriptVarProxy<T>, handler);
}

// ============================================================================
// Runtime Function Types
// ============================================================================

/**
 * Signature for runtime functions.
 * All runtime functions are async.
 */
export type RuntimeFunction<TArgs, TReturn> = (args: TArgs) => Promise<TReturn>;

/**
 * Extract the argument type from a runtime function.
 */
export type ArgsOf<F> = F extends RuntimeFunction<infer A, any> ? A : never;

/**
 * Extract the return type from a runtime function.
 */
export type ReturnOf<F> = F extends RuntimeFunction<any, infer R> ? R : never;

// ============================================================================
// Call Component Props - Strictly Typed
// ============================================================================

/**
 * Props for Call when function has args and return value.
 */
interface CallPropsWithBoth<TArgs, TReturn> {
  args: TArgs;
  output: ScriptVar<TReturn>;
}

/**
 * Props for Call when function has args but returns void.
 */
interface CallPropsArgsOnly<TArgs> {
  args: TArgs;
  output?: never;
}

/**
 * Props for Call when function has no args but has return value.
 */
interface CallPropsOutputOnly<TReturn> {
  args?: never;
  output: ScriptVar<TReturn>;
}

/**
 * Props for Call when function has no args and returns void.
 */
interface CallPropsNone {
  args?: never;
  output?: never;
}

/**
 * Infer the correct CallProps based on function signature.
 */
type InferCallProps<TArgs, TReturn> =
  [TArgs] extends [void]
    ? [TReturn] extends [void]
      ? CallPropsNone
      : CallPropsOutputOnly<TReturn>
    : [TReturn] extends [void]
      ? CallPropsArgsOnly<TArgs>
      : CallPropsWithBoth<TArgs, TReturn>;

// ============================================================================
// RuntimeFn Result Type
// ============================================================================

/**
 * JSX Element placeholder (would be provided by react-agentic).
 */
interface JSXElement {
  type: string;
  props: Record<string, unknown>;
}

/**
 * The result of calling runtimeFn().
 * Contains a strictly typed Call component.
 */
export interface RuntimeFnComponent<TArgs, TReturn> {
  /**
   * Call the runtime function as a component.
   *
   * Props are strictly typed based on the original function:
   * - args must match function's parameter type exactly
   * - output must be a ScriptVar matching function's return type
   */
  Call: (props: InferCallProps<TArgs, TReturn>) => JSXElement;

  /** Function name for debugging */
  readonly fnName: string;
}

// ============================================================================
// runtimeFn Implementation
// ============================================================================

/**
 * Creates a typed component from a runtime function.
 *
 * The returned component enforces:
 * 1. args prop must match the function's parameter type
 * 2. output prop must be ScriptVar<ReturnType>
 *
 * @example
 * ```tsx
 * // Runtime function with typed signature
 * async function init(args: { arguments: string }): Promise<Context> {
 *   return { phaseId: "01", ... };
 * }
 *
 * // Create typed component
 * const Init = runtimeFn(init);
 *
 * // These type-check correctly:
 * const ctx = useScriptVar<Context>('ctx');
 * <Init.Call args={{ arguments: "$ARGS" }} output={ctx} />  // ✅
 *
 * // These produce TypeScript errors:
 * <Init.Call args={{ wrong: "key" }} output={ctx} />       // ❌ 'wrong' not in args
 * <Init.Call args={{ arguments: 123 }} output={ctx} />     // ❌ number not string
 *
 * const wrongCtx = useScriptVar<string>('wrong');
 * <Init.Call args={{ arguments: "$ARGS" }} output={wrongCtx} />  // ❌ ScriptVar<string> ≠ ScriptVar<Context>
 * ```
 */
export function runtimeFn<TArgs, TReturn>(
  fn: RuntimeFunction<TArgs, TReturn>
): RuntimeFnComponent<TArgs, TReturn> {
  const fnName = fn.name;

  const Call = (props: InferCallProps<TArgs, TReturn>): JSXElement => {
    // This is compile-time only - the actual element creation
    // would be handled by the TSX compiler
    return {
      type: 'Script',
      props: {
        fn: fnName,
        args: (props as any).args,
        output: (props as any).output,
      },
    };
  };

  return {
    Call,
    fnName,
  };
}

// ============================================================================
// Type Tests (these would fail compilation if types are wrong)
// ============================================================================

// Uncomment to verify type safety:

/*
// Test function
async function testFn(args: { name: string; count: number }): Promise<{ result: boolean }> {
  return { result: true };
}

const TestFn = runtimeFn(testFn);

// ✅ Correct usage
const correctOutput = useScriptVar<{ result: boolean }>('out');
TestFn.Call({ args: { name: "test", count: 5 }, output: correctOutput });

// ❌ Wrong args key - should error
// TestFn.Call({ args: { wrong: "key", count: 5 }, output: correctOutput });

// ❌ Wrong args type - should error
// TestFn.Call({ args: { name: 123, count: 5 }, output: correctOutput });

// ❌ Wrong output type - should error
const wrongOutput = useScriptVar<string>('wrong');
// TestFn.Call({ args: { name: "test", count: 5 }, output: wrongOutput });

// ❌ Missing required arg - should error
// TestFn.Call({ args: { name: "test" }, output: correctOutput });
*/
