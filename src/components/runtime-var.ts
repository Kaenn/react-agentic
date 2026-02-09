/**
 * Runtime Variable System for Hybrid Runtime
 *
 * RuntimeVar is a branded type that tracks JSON variable paths at compile time.
 * The proxy pattern captures property access for shell variable syntax generation.
 *
 * Usage:
 * const ctx = useRuntimeVar<MyType>('CTX');
 * // ctx.error becomes $CTX.error
 * // ctx.user.name becomes $CTX.user.name
 */

// ============================================================================
// Branded Types
// ============================================================================

/**
 * Brand symbol for compile-time type safety
 * Prevents accidental mixing of RuntimeVar with regular values
 */
declare const __runtimeVarBrand: unique symbol;

/**
 * Internal RuntimeVar metadata interface
 */
interface RuntimeVarMeta<T> {
  readonly [__runtimeVarBrand]: T;
  /** Shell variable name (e.g., 'CTX') */
  readonly __varName: string;
  /** Property access path (e.g., ['user', 'name']) */
  readonly __path: readonly string[];
}

/**
 * Base RuntimeVar type - branded string intersection
 *
 * By intersecting with `string`, RuntimeVar becomes assignable to:
 * - string (for comparisons like `ctx.status === 'SUCCESS'`)
 * - ReactNode (for JSX interpolation like `{ctx.message}`)
 *
 * The brand ensures type safety while allowing ergonomic usage in JSX.
 * At compile time, the proxy is transformed to shell variable syntax.
 */
export type RuntimeVar<T> = string & RuntimeVarMeta<T>;

/**
 * VariableRef compatibility interface for RuntimeVarProxy
 * Provides name/ref getters for use with Assign component
 */
interface RuntimeVarRefCompat {
  /** Shell variable name (VariableRef compatibility) */
  readonly name: string;
  /** Same as name - for interpolation (VariableRef compatibility) */
  readonly ref: string;
}

/**
 * Mapped type for property access tracking
 */
type RuntimeVarPropertyAccess<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? RuntimeVarProxy<T[K]>
    : RuntimeVar<T[K]>;
};

/**
 * RuntimeVarProxy enables deep property access tracking
 * Each property access returns a new proxy with extended path
 *
 * Also provides VariableRef compatibility via `name` and `ref` getters,
 * enabling unified usage with both Assign and meta-prompting components.
 *
 * @example
 * const ctx = useRuntimeVar<{user: {name: string}}>('CTX');
 * ctx.__path // []
 * ctx.user.__path // ['user']
 * ctx.user.name.__path // ['user', 'name']
 *
 * // Works in JSX:
 * <p>Hello, {ctx.user.name}</p>
 *
 * // Works in comparisons:
 * if (ctx.status === 'SUCCESS') { ... }
 *
 * // VariableRef compatibility:
 * ctx.name // 'CTX'
 * ctx.ref  // 'CTX'
 */
export type RuntimeVarProxy<T> = RuntimeVar<T> & RuntimeVarRefCompat & RuntimeVarPropertyAccess<T>;

// ============================================================================
// Internal Proxy Creation
// ============================================================================

/**
 * Special symbols for RuntimeVar identification
 */
const RUNTIME_VAR_MARKER = Symbol.for('react-agentic:runtime-var');

/**
 * Create a RuntimeVarProxy that tracks property access paths
 *
 * Uses ES6 Proxy to intercept property access and build path arrays.
 * Each nested access returns a new proxy with the extended path.
 *
 * @param varName - Shell variable name
 * @param path - Current property path (starts empty)
 * @returns Proxy that tracks all property accesses
 */
function createRuntimeVarProxy<T>(varName: string, path: string[]): RuntimeVarProxy<T> {
  const target = {
    __varName: varName,
    __path: path,
    [RUNTIME_VAR_MARKER]: true,
  };

  return new Proxy(target as unknown as RuntimeVarProxy<T>, {
    get(_target, prop: string | symbol) {
      // Handle known properties
      if (prop === '__varName') return varName;
      if (prop === '__path') return path;
      if (prop === RUNTIME_VAR_MARKER) return true;

      // VariableRef compatibility - return varName for name/ref access
      if (prop === 'name' || prop === 'ref') return varName;

      // Handle symbol properties (like Symbol.toStringTag)
      if (typeof prop === 'symbol') return undefined;

      // Create nested proxy for property access
      return createRuntimeVarProxy<unknown>(varName, [...path, prop]);
    },
  });
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Create a typed runtime variable reference
 *
 * This hook-style function creates a compile-time reference to a shell variable
 * that will be populated at runtime by a RuntimeFn call.
 *
 * The returned proxy tracks property access paths, which the transformer
 * converts to shell variable syntax for markdown output.
 *
 * @param name - Shell variable name (should be UPPER_SNAKE_CASE)
 * @returns RuntimeVarProxy that tracks property access
 *
 * @example
 * interface Context {
 *   error?: string;
 *   data: { count: number };
 * }
 *
 * const ctx = useRuntimeVar<Context>('CTX');
 *
 * // In JSX:
 * <If condition={ctx.error}>...</If>
 * // Emits: **If $CTX.error:**
 *
 * <p>Count: {ctx.data.count}</p>
 * // Emits: Count: $CTX.data.count
 */
export function useRuntimeVar<T>(name: string): RuntimeVarProxy<T> {
  return createRuntimeVarProxy<T>(name, []);
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a RuntimeVar proxy
 *
 * Used by transformers to detect when to generate jq expressions
 * instead of literal values.
 *
 * @param value - Value to check
 * @returns true if value is a RuntimeVar proxy
 */
export function isRuntimeVar(value: unknown): value is RuntimeVar<unknown> {
  if (!value || typeof value !== 'object') return false;
  return (value as Record<symbol, unknown>)[RUNTIME_VAR_MARKER] === true;
}

/**
 * Extract RuntimeVar metadata from a proxy
 *
 * @param runtimeVar - RuntimeVar proxy
 * @returns Object with varName and path
 */
export function getRuntimeVarInfo(runtimeVar: RuntimeVar<unknown>): {
  varName: string;
  path: readonly string[];
} {
  return {
    varName: runtimeVar.__varName,
    path: runtimeVar.__path,
  };
}

// ============================================================================
// jq Expression Generation
// ============================================================================

/**
 * Convert RuntimeVar to jq shell expression
 *
 * @param runtimeVar - RuntimeVar proxy
 * @returns Shell command string like $(echo "$VAR" | jq -r '.path')
 *
 * @example
 * toJqExpression(ctx.user.name)
 * // Returns: $(echo "$CTX" | jq -r '.user.name')
 */
export function toJqExpression(runtimeVar: RuntimeVar<unknown>): string {
  const { varName, path } = getRuntimeVarInfo(runtimeVar);
  const jqPath = path.length === 0 ? '.' : '.' + path.join('.');
  return `$(echo "$${varName}" | jq -r '${jqPath}')`;
}

/**
 * Convert RuntimeVar to raw jq path expression (without shell wrapper)
 *
 * @param runtimeVar - RuntimeVar proxy
 * @returns jq path string like '.user.name'
 */
export function toJqPath(runtimeVar: RuntimeVar<unknown>): string {
  const { path } = getRuntimeVarInfo(runtimeVar);
  return path.length === 0 ? '.' : '.' + path.join('.');
}

// ============================================================================
// Utility Types for Component Props
// ============================================================================

/**
 * Allow a value OR its RuntimeVar equivalent
 *
 * Use for component props that should accept runtime interpolation.
 * This enables props to accept either static values or RuntimeVar references.
 *
 * @example
 * interface MyProps {
 *   count: OrRuntimeVar<number>;  // Accepts 5 or ctx.count
 *   name: OrRuntimeVar<string>;   // Accepts "hello" or ctx.name
 * }
 */
export type OrRuntimeVar<T> = T | RuntimeVar<T> | RuntimeVarProxy<T>;

/**
 * Transform object type so each property accepts RuntimeVar
 *
 * Use for complex props like RuntimeFn args where each property
 * can be either a static value or a RuntimeVar reference.
 *
 * @example
 * interface Args { x: number; y: string; }
 * type FlexibleArgs = AllowRuntimeVars<Args>;
 * // { x: number | RuntimeVar<number>; y: string | RuntimeVar<string>; }
 */
export type AllowRuntimeVars<T> = T extends object
  ? { [K in keyof T]: OrRuntimeVar<T[K]> }
  : OrRuntimeVar<T>;

// ============================================================================
// Unified Variable API
// ============================================================================

/**
 * Unified variable hook - creates a typed runtime variable reference
 *
 * This is the recommended way to create variables in react-agentic.
 * It works with both:
 * - Assign component (via name/ref compatibility)
 * - Meta-prompting components (Ref, If, interpolation)
 *
 * @param name - Shell variable name (should be UPPER_SNAKE_CASE)
 * @returns RuntimeVarProxy that tracks property access
 *
 * @example
 * const ctx = useVariable<MyContext>('CTX');
 *
 * // Works with Assign:
 * <Assign var={ctx} from={file('data.json')} />
 *
 * // Works with meta-prompting:
 * <If condition={ctx.error}>...</If>
 * <Ref value={ctx.data} />
 * <p>Status: {ctx.status}</p>
 */
export const useVariable = useRuntimeVar;

