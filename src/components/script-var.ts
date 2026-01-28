/**
 * Script Variable System for Hybrid Runtime
 *
 * ScriptVar is a branded type that tracks JSON variable paths at compile time.
 * The proxy pattern captures property access for jq expression generation.
 *
 * Usage:
 * const ctx = useScriptVar<MyType>('CTX');
 * // ctx.error becomes $(echo "$CTX" | jq -r '.error')
 * // ctx.user.name becomes $(echo "$CTX" | jq -r '.user.name')
 */

// ============================================================================
// Branded Types
// ============================================================================

/**
 * Brand symbol for compile-time type safety
 * Prevents accidental mixing of ScriptVar with regular values
 */
declare const __scriptVarBrand: unique symbol;

/**
 * Internal ScriptVar metadata interface
 */
interface ScriptVarMeta<T> {
  readonly [__scriptVarBrand]: T;
  /** Shell variable name (e.g., 'CTX') */
  readonly __varName: string;
  /** Property access path (e.g., ['user', 'name']) */
  readonly __path: readonly string[];
}

/**
 * Base ScriptVar type - branded string intersection
 *
 * By intersecting with `string`, ScriptVar becomes assignable to:
 * - string (for comparisons like `ctx.status === 'SUCCESS'`)
 * - ReactNode (for JSX interpolation like `{ctx.message}`)
 *
 * The brand ensures type safety while allowing ergonomic usage in JSX.
 * At runtime, the proxy's toString() returns the jq expression.
 */
export type ScriptVar<T> = string & ScriptVarMeta<T>;

/**
 * ScriptVarProxy enables deep property access tracking
 * Each property access returns a new proxy with extended path
 *
 * @example
 * const ctx = useScriptVar<{user: {name: string}}>('CTX');
 * ctx.__path // []
 * ctx.user.__path // ['user']
 * ctx.user.name.__path // ['user', 'name']
 *
 * // Works in JSX:
 * <p>Hello, {ctx.user.name}</p>
 *
 * // Works in comparisons:
 * if (ctx.status === 'SUCCESS') { ... }
 */
export type ScriptVarProxy<T> = ScriptVar<T> & {
  readonly [K in keyof T]: T[K] extends object
    ? ScriptVarProxy<T[K]>
    : ScriptVar<T[K]>;
};

// ============================================================================
// Internal Proxy Creation
// ============================================================================

/**
 * Special symbols for ScriptVar identification
 */
const SCRIPT_VAR_MARKER = Symbol.for('react-agentic:script-var');

/**
 * Create a ScriptVarProxy that tracks property access paths
 *
 * Uses ES6 Proxy to intercept property access and build path arrays.
 * Each nested access returns a new proxy with the extended path.
 *
 * @param varName - Shell variable name
 * @param path - Current property path (starts empty)
 * @returns Proxy that tracks all property accesses
 */
function createScriptVarProxy<T>(varName: string, path: string[]): ScriptVarProxy<T> {
  const target = {
    __varName: varName,
    __path: path,
    [SCRIPT_VAR_MARKER]: true,
  };

  return new Proxy(target as unknown as ScriptVarProxy<T>, {
    get(_target, prop: string | symbol) {
      // Handle known properties
      if (prop === '__varName') return varName;
      if (prop === '__path') return path;
      if (prop === SCRIPT_VAR_MARKER) return true;

      // Handle symbol properties (like Symbol.toStringTag)
      if (typeof prop === 'symbol') return undefined;

      // Create nested proxy for property access
      return createScriptVarProxy<unknown>(varName, [...path, prop]);
    },
  });
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Create a typed script variable reference
 *
 * This hook-style function creates a compile-time reference to a shell variable
 * that will be populated at runtime by a RuntimeFn call.
 *
 * The returned proxy tracks property access paths, which the transformer
 * converts to jq expressions for shell execution.
 *
 * @param name - Shell variable name (should be UPPER_SNAKE_CASE)
 * @returns ScriptVarProxy that tracks property access
 *
 * @example
 * interface Context {
 *   error?: string;
 *   data: { count: number };
 * }
 *
 * const ctx = useScriptVar<Context>('CTX');
 *
 * // In JSX:
 * <If condition={ctx.error}>...</If>
 * // Emits: **If $(echo "$CTX" | jq -r '.error'):**
 *
 * <p>Count: {ctx.data.count}</p>
 * // Emits: Count: $(echo "$CTX" | jq -r '.data.count')
 */
export function useScriptVar<T>(name: string): ScriptVarProxy<T> {
  return createScriptVarProxy<T>(name, []);
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a ScriptVar proxy
 *
 * Used by transformers to detect when to generate jq expressions
 * instead of literal values.
 *
 * @param value - Value to check
 * @returns true if value is a ScriptVar proxy
 */
export function isScriptVar(value: unknown): value is ScriptVar<unknown> {
  if (!value || typeof value !== 'object') return false;
  return (value as Record<symbol, unknown>)[SCRIPT_VAR_MARKER] === true;
}

/**
 * Extract ScriptVar metadata from a proxy
 *
 * @param scriptVar - ScriptVar proxy
 * @returns Object with varName and path
 */
export function getScriptVarInfo(scriptVar: ScriptVar<unknown>): {
  varName: string;
  path: readonly string[];
} {
  return {
    varName: scriptVar.__varName,
    path: scriptVar.__path,
  };
}

// ============================================================================
// jq Expression Generation
// ============================================================================

/**
 * Convert ScriptVar to jq shell expression
 *
 * @param scriptVar - ScriptVar proxy
 * @returns Shell command string like $(echo "$VAR" | jq -r '.path')
 *
 * @example
 * toJqExpression(ctx.user.name)
 * // Returns: $(echo "$CTX" | jq -r '.user.name')
 */
export function toJqExpression(scriptVar: ScriptVar<unknown>): string {
  const { varName, path } = getScriptVarInfo(scriptVar);
  const jqPath = path.length === 0 ? '.' : '.' + path.join('.');
  return `$(echo "$${varName}" | jq -r '${jqPath}')`;
}

/**
 * Convert ScriptVar to raw jq path expression (without shell wrapper)
 *
 * @param scriptVar - ScriptVar proxy
 * @returns jq path string like '.user.name'
 */
export function toJqPath(scriptVar: ScriptVar<unknown>): string {
  const { path } = getScriptVarInfo(scriptVar);
  return path.length === 0 ? '.' : '.' + path.join('.');
}

// ============================================================================
// Utility Types for Component Props
// ============================================================================

/**
 * Allow a value OR its ScriptVar equivalent
 *
 * Use for component props that should accept runtime interpolation.
 * This enables props to accept either static values or ScriptVar references.
 *
 * @example
 * interface MyProps {
 *   count: OrScriptVar<number>;  // Accepts 5 or ctx.count
 *   name: OrScriptVar<string>;   // Accepts "hello" or ctx.name
 * }
 */
export type OrScriptVar<T> = T | ScriptVar<T> | ScriptVarProxy<T>;

/**
 * Transform object type so each property accepts ScriptVar
 *
 * Use for complex props like RuntimeFn args where each property
 * can be either a static value or a ScriptVar reference.
 *
 * @example
 * interface Args { x: number; y: string; }
 * type FlexibleArgs = AllowScriptVars<Args>;
 * // { x: number | ScriptVar<number>; y: string | ScriptVar<string>; }
 */
export type AllowScriptVars<T> = T extends object
  ? { [K in keyof T]: OrScriptVar<T[K]> }
  : OrScriptVar<T>;
