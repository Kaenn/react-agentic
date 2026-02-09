/**
 * JSX component stubs for react-agentic - Variable primitives
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

/**
 * Reference to a shell variable created by useVariable
 * @typeParam T - Phantom type for value (compile-time only)
 */
export interface VariableRef<T = string> {
  /** Shell variable name (e.g., "PHASE_DIR") */
  name: string;
  /** Same as name - for interpolation in bash strings */
  ref: string;
  /** Phantom type marker (compile-time only) */
  _type?: T;
}

/**
 * Declare a shell variable reference
 *
 * @deprecated Use `useVariable` from 'react-agentic' (exported from components/runtime-var.ts)
 * which provides unified support for both Assign and meta-prompting components.
 *
 * This legacy version only works with Assign component and bash interpolation.
 * The new unified `useVariable` works with Assign, Ref, If, and JSX interpolation.
 *
 * @param name - Shell variable name (e.g., "PHASE_DIR")
 * @returns VariableRef for use in Assign and string interpolation
 *
 * @example
 * // Old pattern (deprecated):
 * import { useVariable } from './primitives/variables.js';
 * const phaseDir = useVariable("PHASE_DIR");
 *
 * // New unified pattern:
 * import { useVariable } from 'react-agentic';
 * const phaseDir = useVariable<string>("PHASE_DIR");
 * // Works with both Assign AND meta-prompting
 */
export function useVariable<T = string>(name: string): VariableRef<T> {
  return { name, ref: name };
}

import type { AssignSource } from './sources.js';
import type { RuntimeFnComponent } from '../components/runtime-fn.js';
import type { RuntimeVarProxy } from '../components/runtime-var.js';

/**
 * Props for the Assign component
 */
export interface AssignProps {
  /** Variable reference from useVariable (supports both VariableRef and RuntimeVarProxy) */
  var: VariableRef | RuntimeVarProxy<unknown>;
  /** Data source - file, bash, value, env, or runtimeFn */
  from: AssignSource | RuntimeFnComponent<any, any>;
  /** For runtimeFn sources: arguments to pass */
  args?: Record<string, unknown>;
  /** Optional comment to emit above the assignment (e.g., "Get phase from roadmap") */
  comment?: string;
}

/**
 * Assign component - emits shell variable assignment
 *
 * This is a compile-time component. It's never executed at runtime.
 * It emits a bash code block with the variable assignment using a source helper.
 *
 * @example bash command
 * import { bash } from 'react-agentic';
 * const phaseDir = useVariable("PHASE_DIR");
 * <Assign var={phaseDir} from={bash(`ls -d .planning/phases/\${PHASE}-* | head -1`)} />
 * // Outputs: PHASE_DIR=$(ls -d .planning/phases/${PHASE}-* | head -1)
 *
 * @example static value
 * import { value } from 'react-agentic';
 * const outputFile = useVariable("OUTPUT_FILE");
 * <Assign var={outputFile} from={value("/tmp/output.md")} />
 * // Outputs: OUTPUT_FILE="/tmp/output.md"
 *
 * @example environment variable
 * import { env } from 'react-agentic';
 * const phase = useVariable("PHASE");
 * <Assign var={phase} from={env("PHASE_NUMBER")} />
 * // Outputs: PHASE=$PHASE_NUMBER
 *
 * @example file content
 * import { file } from 'react-agentic';
 * const stateContent = useVariable("STATE_CONTENT");
 * <Assign var={stateContent} from={file(".planning/STATE.md")} />
 * // Outputs: STATE_CONTENT=$(cat .planning/STATE.md)
 */
export function Assign(_props: AssignProps): null {
  return null;
}

import type { ReactNode } from 'react';

/**
 * Props for the AssignGroup component
 * Groups multiple Assign children into a single bash code block
 */
export interface AssignGroupProps {
  /** Assign children to group together */
  children?: ReactNode;
}

/**
 * AssignGroup component - groups multiple variable assignments into one bash block
 *
 * This is a compile-time component. It collects child Assign components
 * and emits them as a single bash code block with optional comments.
 *
 * @example
 * <AssignGroup>
 *   <Assign var={phaseDesc} bash={`grep -A3 "Phase ${PHASE}:" .planning/ROADMAP.md`} comment="Get phase description" />
 *   <Assign var={requirements} bash={`cat .planning/REQUIREMENTS.md 2>/dev/null`} comment="Get requirements" />
 * </AssignGroup>
 *
 * // Outputs:
 * // ```bash
 * // # Get phase description
 * // PHASE_DESC=$(grep -A3 "Phase ${PHASE}:" .planning/ROADMAP.md)
 * //
 * // # Get requirements
 * // REQUIREMENTS=$(cat .planning/REQUIREMENTS.md 2>/dev/null)
 * // ```
 */
export function AssignGroup(_props: AssignGroupProps): null {
  return null;
}
