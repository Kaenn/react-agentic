/**
 * Control Flow Components
 *
 * These components provide typed control flow for commands:
 * - If: Conditional based on ScriptVar (not shell test strings)
 * - Else: Paired with If for else blocks
 * - Loop: Bounded iteration with max count
 * - Break: Exit current loop
 * - Return: Exit command early
 *
 * Key difference from v1: conditions are ScriptVar<boolean> expressions,
 * not shell test strings. This enables proper TypeScript type checking.
 */

import type { ScriptVar, ScriptVarProxy, OrScriptVar } from './script-var.js';

// ============================================================================
// Condition Types
// ============================================================================

/**
 * Condition can be:
 * - ScriptVar<boolean> (direct reference)
 * - ScriptVar<T> (truthy check - undefined/null/empty string = false)
 * - Boolean expression combining ScriptVars
 * - undefined (from optional property access - treated as falsy)
 *
 * The transformer parses these to Condition IR nodes.
 */
export type Condition<T = unknown> = ScriptVar<T> | ScriptVarProxy<T> | boolean | undefined;

// ============================================================================
// If Component
// ============================================================================

/**
 * Props for If component
 *
 * Takes a `condition: ScriptVar` for type-safe conditions.
 */
export interface IfProps {
  /**
   * Condition to evaluate
   *
   * Can be:
   * - ScriptVar<boolean> for direct boolean check
   * - ScriptVar<T> for truthy check (falsy = false, truthy = true)
   *
   * @example
   * <If condition={ctx.error}>...</If>
   * // Emits: **If $(echo "$CTX" | jq -r '.error'):**
   *
   * @example
   * <If condition={ctx.flags.verbose}>...</If>
   * // Emits: **If $(echo "$CTX" | jq -r '.flags.verbose') = "true":**
   */
  condition: Condition;

  /** Content to render when condition is true */
  children?: React.ReactNode;
}

/**
 * Conditional block
 *
 * Renders children only if condition is truthy.
 * Works with ScriptVar for type-safe runtime checks.
 *
 * @example
 * const ctx = useScriptVar<{ error?: string }>('CTX');
 *
 * <If condition={ctx.error}>
 *   <p>Error occurred: {ctx.error}</p>
 * </If>
 */
export function If(_props: IfProps): null {
  // Compile-time only - transformer handles actual logic
  return null;
}

// ============================================================================
// Else Component
// ============================================================================

/**
 * Props for Else component
 */
export interface ElseProps {
  /** Content to render when preceding If condition is false */
  children?: React.ReactNode;
}

/**
 * Else block - must follow If as sibling
 *
 * @example
 * <If condition={ctx.success}>
 *   <p>Operation succeeded</p>
 * </If>
 * <Else>
 *   <p>Operation failed</p>
 * </Else>
 */
export function Else(_props: ElseProps): null {
  // Compile-time only
  return null;
}

// ============================================================================
// Loop Component
// ============================================================================

/**
 * Props for Loop component
 *
 * Loop is bounded iteration, not array iteration.
 * It executes up to `max` times, with optional counter variable.
 */
export interface LoopProps {
  /**
   * Maximum number of iterations
   *
   * Required for loops to prevent infinite loops.
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
   * const i = useScriptVar<number>('I');
   * <Loop max={5} counter={i}>
   *   <p>Iteration: {i}</p>
   * </Loop>
   */
  counter?: ScriptVarProxy<number>;

  /** Loop body content */
  children?: React.ReactNode;
}

/**
 * Bounded loop
 *
 * Executes children up to `max` times.
 * Use Break to exit early, Return to exit the entire command.
 *
 * @example
 * <Loop max={10}>
 *   <RuntimeFn.Call args={{}} output={result} />
 *   <If condition={result.done}>
 *     <Break />
 *   </If>
 * </Loop>
 */
export function Loop(_props: LoopProps): null {
  // Compile-time only
  return null;
}

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
 * <Loop max={10}>
 *   <RuntimeFn.Call args={{}} output={result} />
 *   <If condition={result.error}>
 *     <Break message="Error encountered, stopping retry loop" />
 *   </If>
 * </Loop>
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
 * <If condition={ctx.alreadyExists}>
 *   <Return status="SUCCESS" message="Already initialized, nothing to do" />
 * </If>
 *
 * @example
 * <If condition={ctx.criticalError}>
 *   <Return status="ERROR" message="Cannot continue due to error" />
 * </If>
 */
export function Return(_props: ReturnProps): null {
  // Compile-time only
  return null;
}

// ============================================================================
// Type Guards (Markers)
// ============================================================================

/**
 * Marker symbols for control components
 */
export const IF_MARKER = Symbol.for('react-agentic:if');
export const ELSE_MARKER = Symbol.for('react-agentic:else');
export const LOOP_MARKER = Symbol.for('react-agentic:loop');
export const BREAK_MARKER = Symbol.for('react-agentic:break');
export const RETURN_MARKER = Symbol.for('react-agentic:return');

// Add markers to components
Object.defineProperty(If, IF_MARKER, { value: true });
Object.defineProperty(Else, ELSE_MARKER, { value: true });
Object.defineProperty(Loop, LOOP_MARKER, { value: true });
Object.defineProperty(Break, BREAK_MARKER, { value: true });
Object.defineProperty(Return, RETURN_MARKER, { value: true });
