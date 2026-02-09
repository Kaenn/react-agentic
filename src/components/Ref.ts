/**
 * Ref Component for Reference Printing
 *
 * The Ref component enables explicit reference printing in markdown output.
 * It renders RuntimeVar as shell variable syntax and RuntimeFn as function
 * name or call syntax.
 *
 * @example
 * // RuntimeVar reference
 * <Ref value={ctx.status} />  // Emits: $CTX.status
 *
 * // RuntimeFn name
 * <Ref value={myFn} />  // Emits: myFn
 *
 * // RuntimeFn call syntax
 * <Ref value={myFn} call />  // Emits: myFn()
 */

import type { RuntimeVar, RuntimeVarProxy } from './runtime-var.js';
import type { RuntimeFnComponent } from './runtime-fn.js';

// ============================================================================
// Marker Symbol
// ============================================================================

/**
 * Symbol for identifying Ref components during transformation
 */
export const REF_MARKER = Symbol.for('react-agentic:ref');

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the Ref component
 *
 * @param value - RuntimeVar or RuntimeFn to render as reference
 * @param call - For RuntimeFn, render with call syntax (parens)
 */
export interface RefProps {
  /** RuntimeVar or RuntimeFn to render */
  value: RuntimeVar<unknown> | RuntimeVarProxy<unknown> | RuntimeFnComponent<any, any>;
  /** For RuntimeFn, render with call syntax (default: false) */
  call?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Ref component for explicit variable/function reference rendering
 *
 * Renders RuntimeVar as shell variable syntax ($VAR.path)
 * Renders RuntimeFn as function name or call syntax
 *
 * This is a compile-time only component - it gets transformed during build.
 * The actual rendering is handled by the transformer in runtime-dispatch.ts.
 *
 * @example
 * // RuntimeVar reference
 * <Ref value={ctx.status} />  // Emits: $CTX.status
 * <Ref value={ctx} />         // Emits: $CTX
 *
 * // RuntimeFn name
 * <Ref value={myFn} />  // Emits: myFn
 *
 * // RuntimeFn call syntax
 * <Ref value={myFn} call />  // Emits: myFn()
 *
 * // RuntimeFn properties
 * <Ref value={myFn.input} />   // Emits parameter names: "args"
 * <Ref value={myFn.output} />  // Emits: "unknown" (placeholder)
 *
 * @param props - RefProps with value and optional call flag
 * @returns null (compile-time only)
 */
export function Ref(_props: RefProps): null {
  // Compile-time only - transformed during build
  // This function is never called at runtime
  return null;
}
