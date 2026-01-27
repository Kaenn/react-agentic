/**
 * JSX component stubs for react-agentic - State writing
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

import type { VariableRef } from '../../primitives/variables.js';
import type { StateRef } from './types.js';

/**
 * Utility type that allows each property to be either the original type or a VariableRef
 * Enables: { key: "string" } OR { key: variableRef }
 */
type AllowVariableRefs<T> = {
  [K in keyof T]?: T[K] | VariableRef<T[K]>;
};

/**
 * Props for the WriteState component
 * Specify exactly one of: field+value OR merge
 * @typeParam TSchema - State schema type for field path validation
 */
export interface WriteStateProps<TSchema = unknown> {
  /** State reference from useStateRef */
  state: StateRef<TSchema>;
  /** Field path for single-field write (e.g., "user.name") */
  field?: string;
  /** Value to write - string literal or VariableRef */
  value?: string | VariableRef;
  /** Partial object for merge write - values can be literals or VariableRefs */
  merge?: AllowVariableRefs<TSchema>;
}

/**
 * WriteState component - writes typed state values to registry
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime. Emits bash JSON write operation.
 *
 * Specify exactly one of: field+value OR merge
 *
 * @typeParam TSchema - State schema type for field path validation
 * @example Write single field (literal value)
 * <WriteState state={projectState} field="name" value="my-project" />
 *
 * @example Write single field (variable reference)
 * const userInput = useVariable("USER_INPUT");
 * <WriteState state={projectState} field="name" value={userInput} />
 *
 * @example Merge partial update
 * <WriteState state={projectState} merge={{ phase: 2, status: "active" }} />
 */
export function WriteState<TSchema = unknown>(_props: WriteStateProps<TSchema>): null {
  return null;
}
