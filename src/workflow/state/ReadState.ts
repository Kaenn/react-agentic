/**
 * JSX component stubs for react-agentic - State reading
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

import type { VariableRef } from '../../primitives/variables.js';
import type { StateRef } from './types.js';

/**
 * Props for the ReadState component
 * @typeParam TSchema - State schema type for field path validation
 */
export interface ReadStateProps<TSchema = unknown> {
  /** State reference from useStateRef */
  state: StateRef<TSchema>;
  /** Variable to store the result */
  into: VariableRef;
  /** Optional: nested field path (e.g., "user.preferences.theme") */
  field?: string;
}

/**
 * ReadState component - reads typed state values from registry
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime. Emits bash JSON read operation.
 *
 * @typeParam TSchema - State schema type for field path validation
 * @example Read entire state
 * const projectState = useStateRef<ProjectState>("projectContext");
 * const stateVar = useVariable("STATE_JSON");
 * <ReadState state={projectState} into={stateVar} />
 *
 * @example Read specific field
 * const nameVar = useVariable("PROJECT_NAME");
 * <ReadState state={projectState} into={nameVar} field="name" />
 *
 * @example Read nested field
 * const themeVar = useVariable("USER_THEME");
 * <ReadState state={projectState} into={themeVar} field="user.preferences.theme" />
 */
export function ReadState<TSchema = unknown>(_props: ReadStateProps<TSchema>): null {
  return null;
}
