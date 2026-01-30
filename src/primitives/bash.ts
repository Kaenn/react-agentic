/**
 * JSX component stubs for react-agentic - Bash code block primitive
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

import type { ReactNode } from 'react';

/**
 * Props for the Bash component
 */
export interface BashProps {
  /** Bash code content */
  children?: ReactNode;
}

/**
 * Bash component - clean syntax for bash code blocks
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime. Emits a fenced bash code block.
 *
 * @example Basic usage
 * <Bash>ls .planning/ 2>/dev/null</Bash>
 * // Output:
 * // ```bash
 * // ls .planning/ 2>/dev/null
 * // ```
 *
 * @example Multi-line
 * <Bash>
 *   PHASE=$(cat .planning/STATE.md | grep "Current Phase")
 *   echo "Phase: $PHASE"
 * </Bash>
 * // Output:
 * // ```bash
 * // PHASE=$(cat .planning/STATE.md | grep "Current Phase")
 * // echo "Phase: $PHASE"
 * // ```
 *
 * Replaces verbose syntax:
 * <pre><code className="language-bash">...</code></pre>
 */
export function Bash(_props: BashProps): null {
  return null;
}
