/**
 * JSX component stubs for react-agentic - State types
 *
 * Types and utilities for state management.
 */

/**
 * Reference to a state key created by useStateRef
 * @typeParam TSchema - Type of the state schema (compile-time only)
 */
export interface StateRef<TSchema = unknown> {
  /** State key identifier */
  key: string;
  /** Phantom type marker (compile-time only) */
  _schema?: TSchema;
}

/**
 * Declare a state reference for reading/writing typed state
 *
 * This is a compile-time hook that creates a reference to a state key.
 * The actual state operations happen at runtime via ReadState/WriteState.
 *
 * @typeParam TSchema - TypeScript interface for state shape
 * @param key - State key identifier (e.g., "projectContext")
 * @returns StateRef for use in ReadState/WriteState
 *
 * @example
 * interface ProjectState { name: string; phase: number; }
 * const projectState = useStateRef<ProjectState>("projectContext");
 *
 * // In JSX:
 * <ReadState state={projectState} into={nameVar} field="name" />
 */
export function useStateRef<TSchema = unknown>(key: string): StateRef<TSchema> {
  return { key };
}
