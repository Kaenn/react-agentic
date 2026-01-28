/**
 * V3 Control Flow Components
 *
 * These components provide typed control flow for V3 commands:
 * - If: Conditional based on ScriptVar (not shell test strings)
 * - Loop: Bounded iteration with max count
 * - Break: Exit current loop
 * - Return: Exit command early
 *
 * Key difference from v1: conditions are ScriptVar<boolean> expressions,
 * not shell test strings. This enables proper TypeScript type checking.
 */

import type { ScriptVar, ScriptVarProxy, OrScriptVar } from './script-var.js';

// ============================================================================
// V3 Condition Types
// ============================================================================

/**
 * V3 condition can be:
 * - ScriptVar<boolean> (direct reference)
 * - ScriptVar<T> (truthy check - undefined/null/empty string = false)
 * - Boolean expression combining ScriptVars
 * - undefined (from optional property access - treated as falsy)
 *
 * The transformer parses these to V3Condition IR nodes.
 */
export type V3Condition<T = unknown> = ScriptVar<T> | ScriptVarProxy<T> | boolean | undefined;

// ============================================================================
// If Component
// ============================================================================

/**
 * Props for V3 If component
 *
 * Unlike v1 If which takes a `test: string` shell expression,
 * V3 If takes a `condition: ScriptVar` for type-safe conditions.
 */
export interface V3IfProps {
  /**
   * Condition to evaluate
   *
   * Can be:
   * - ScriptVar<boolean> for direct boolean check
   * - ScriptVar<T> for truthy check (falsy = false, truthy = true)
   *
   * @example
   * <V3If condition={ctx.error}>...</V3If>
   * // Emits: **If $(echo "$CTX" | jq -r '.error'):**
   *
   * @example
   * <V3If condition={ctx.flags.verbose}>...</V3If>
   * // Emits: **If $(echo "$CTX" | jq -r '.flags.verbose') = "true":**
   */
  condition: V3Condition;

  /** Content to render when condition is true */
  children?: React.ReactNode;
}

/**
 * V3 Conditional block
 *
 * Renders children only if condition is truthy.
 * Works with ScriptVar for type-safe runtime checks.
 *
 * @example
 * const ctx = useRuntimeVar<{ error?: string }>('CTX');
 *
 * <V3If condition={ctx.error}>
 *   <p>Error occurred: {ctx.error}</p>
 * </V3If>
 */
export function V3If(_props: V3IfProps): null {
  // Compile-time only - transformer handles actual logic
  return null;
}

// Alias for cleaner imports
export { V3If as If };

// ============================================================================
// Else Component
// ============================================================================

/**
 * Props for V3 Else component
 */
export interface V3ElseProps {
  /** Content to render when preceding If condition is false */
  children?: React.ReactNode;
}

/**
 * V3 Else block - must follow V3If as sibling
 *
 * @example
 * <V3If condition={ctx.success}>
 *   <p>Operation succeeded</p>
 * </V3If>
 * <V3Else>
 *   <p>Operation failed</p>
 * </V3Else>
 */
export function V3Else(_props: V3ElseProps): null {
  // Compile-time only
  return null;
}

export { V3Else as Else };

// ============================================================================
// Loop Component
// ============================================================================

/**
 * Props for V3 Loop component
 *
 * V3 Loop is bounded iteration, not array iteration like v1.
 * It executes up to `max` times, with optional counter variable.
 */
export interface V3LoopProps {
  /**
   * Maximum number of iterations
   *
   * Required for V3 loops to prevent infinite loops.
   * Claude will stop after this many iterations.
   * Accepts static number or ScriptVar<number> for runtime resolution.
   */
  max: OrScriptVar<number>;

  /**
   * Optional counter variable
   *
   * If provided, stores the current iteration number (0-indexed).
   * Useful for conditional logic based on iteration count.
   *
   * @example
   * const i = useRuntimeVar<number>('I');
   * <V3Loop max={5} counter={i}>
   *   <p>Iteration: {i}</p>
   * </V3Loop>
   */
  counter?: ScriptVarProxy<number>;

  /** Loop body content */
  children?: React.ReactNode;
}

/**
 * V3 Bounded loop
 *
 * Executes children up to `max` times.
 * Use Break to exit early, Return to exit the entire command.
 *
 * @example
 * <V3Loop max={10}>
 *   <RuntimeFn.Call args={{}} output={result} />
 *   <V3If condition={result.done}>
 *     <Break />
 *   </V3If>
 * </V3Loop>
 */
export function V3Loop(_props: V3LoopProps): null {
  // Compile-time only
  return null;
}

export { V3Loop as Loop };

// ============================================================================
// Break Component
// ============================================================================

/**
 * Props for Break component
 */
export interface BreakProps {
  /** Optional message to display when breaking. Accepts static string or ScriptVar. */
  message?: OrScriptVar<string>;
}

/**
 * Exit the current loop early
 *
 * Only valid inside a Loop component.
 * Execution continues after the Loop.
 *
 * @example
 * <V3Loop max={10}>
 *   <RuntimeFn.Call args={{}} output={result} />
 *   <V3If condition={result.error}>
 *     <Break message="Error encountered, stopping retry loop" />
 *   </V3If>
 * </V3Loop>
 */
export function Break(_props: BreakProps): null {
  // Compile-time only
  return null;
}

// ============================================================================
// Return Component
// ============================================================================

/**
 * Standard return status values
 */
export type ReturnStatus = 'SUCCESS' | 'BLOCKED' | 'NOT_FOUND' | 'ERROR' | 'CHECKPOINT';

/**
 * Props for Return component
 */
export interface ReturnProps {
  /**
   * Optional status to return
   *
   * Used when the command needs to indicate success/failure
   * to a parent orchestrator. Accepts static status or ScriptVar.
   */
  status?: OrScriptVar<ReturnStatus>;

  /** Optional message to display when returning. Accepts static string or ScriptVar. */
  message?: OrScriptVar<string>;
}

/**
 * Exit the command early
 *
 * Stops execution of the entire command.
 * Use for early exit conditions or error handling.
 *
 * @example
 * <V3If condition={ctx.alreadyExists}>
 *   <Return status="SUCCESS" message="Already initialized, nothing to do" />
 * </V3If>
 *
 * @example
 * <V3If condition={ctx.criticalError}>
 *   <Return status="ERROR" message="Cannot continue due to error" />
 * </V3If>
 */
export function Return(_props: ReturnProps): null {
  // Compile-time only
  return null;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Marker symbols for V3 control components
 */
export const V3_IF_MARKER = Symbol.for('react-agentic:v3-if');
export const V3_ELSE_MARKER = Symbol.for('react-agentic:v3-else');
export const V3_LOOP_MARKER = Symbol.for('react-agentic:v3-loop');
export const V3_BREAK_MARKER = Symbol.for('react-agentic:v3-break');
export const V3_RETURN_MARKER = Symbol.for('react-agentic:v3-return');

// Add markers to components
Object.defineProperty(V3If, V3_IF_MARKER, { value: true });
Object.defineProperty(V3Else, V3_ELSE_MARKER, { value: true });
Object.defineProperty(V3Loop, V3_LOOP_MARKER, { value: true });
Object.defineProperty(Break, V3_BREAK_MARKER, { value: true });
Object.defineProperty(Return, V3_RETURN_MARKER, { value: true });
