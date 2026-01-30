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
 * This is a compile-time hook that creates a reference to a shell variable.
 * The actual assignment is specified on <Assign> where you emit it.
 *
 * @param name - Shell variable name (e.g., "PHASE_DIR")
 * @returns VariableRef for use in Assign and string interpolation
 *
 * @example
 * const phaseDir = useVariable("PHASE_DIR");
 *
 * // In JSX - assignment specified at emission point:
 * <Assign var={phaseDir} bash={`ls -d .planning/phases/\${PHASE}-* 2>/dev/null | head -1`} />
 *
 * // For interpolation:
 * <If test={`[ -z ${phaseDir.ref} ]`}>
 */
export function useVariable<T = string>(name: string): VariableRef<T> {
  return { name, ref: name };
}

/**
 * Props for the Assign component
 * Specify exactly one of: bash, value, or env
 */
export interface AssignProps {
  /** Variable reference from useVariable */
  var: VariableRef;
  /** Bash command to capture output: VAR=$(command) */
  bash?: string;
  /** Static value: VAR=value (quoted if contains spaces) */
  value?: string;
  /** Environment variable to read: VAR=$ENV_VAR */
  env?: string;
  /** Optional comment to emit above the assignment (e.g., "Get phase from roadmap") */
  comment?: string;
}

/**
 * Assign component - emits shell variable assignment
 *
 * This is a compile-time component. It's never executed at runtime.
 * It emits a bash code block with the variable assignment.
 *
 * @example bash command
 * const phaseDir = useVariable("PHASE_DIR");
 * <Assign var={phaseDir} bash={`ls -d .planning/phases/\${PHASE}-* | head -1`} />
 * // Outputs: PHASE_DIR=$(ls -d .planning/phases/${PHASE}-* | head -1)
 *
 * @example static value
 * const outputFile = useVariable("OUTPUT_FILE");
 * <Assign var={outputFile} value="/tmp/output.md" />
 * // Outputs: OUTPUT_FILE=/tmp/output.md
 *
 * @example environment variable
 * const phase = useVariable("PHASE");
 * <Assign var={phase} env="PHASE_NUMBER" />
 * // Outputs: PHASE=$PHASE_NUMBER
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
