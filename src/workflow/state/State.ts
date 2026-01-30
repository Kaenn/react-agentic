/**
 * JSX component stubs for react-agentic - Scoped State Skills
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

import type { ReactNode } from 'react';

/**
 * SQLite provider configuration
 */
export interface SQLiteConfig {
  /** Database file path (e.g., ".state/state.db") */
  database: string;
}

/**
 * Props for the State component
 * @typeParam TSchema - TypeScript interface defining state shape
 */
export interface StateProps<TSchema = unknown> {
  /** State name - becomes skill prefix (e.g., "releases" -> releases.read) */
  name: string;
  /** Storage provider (only "sqlite" supported currently) */
  provider: 'sqlite';
  /** Provider-specific configuration */
  config: SQLiteConfig;
  /** Operation children */
  children?: ReactNode;
  /** Phantom type marker (compile-time only) */
  _schema?: TSchema;
}

/**
 * Props for the Operation component
 */
export interface OperationProps {
  /** Operation name - becomes skill suffix (e.g., "record" -> releases.record) */
  name: string;
  /** SQL template with $variable placeholders */
  children?: ReactNode;
}

/**
 * State component - defines a scoped state with auto-generated CRUD skills
 *
 * This is a compile-time component transformed by react-agentic.
 * It generates multiple skill files: {name}.init, {name}.read, {name}.write, {name}.delete
 *
 * @typeParam TSchema - TypeScript interface defining state shape (used for SQL schema generation)
 * @example
 * interface ReleasesState {
 *   lastVersion: string;
 *   bumpType: 'major' | 'minor' | 'patch';
 *   updatedAt: string;
 * }
 *
 * export default function ReleasesState() {
 *   return (
 *     <State<ReleasesState>
 *       name="releases"
 *       provider="sqlite"
 *       config={{ database: ".state/state.db" }}
 *     >
 *       <Operation name="record">
 *         {`UPDATE releases SET lastVersion = '$version', bumpType = '$bump_type' WHERE rowid = 1`}
 *       </Operation>
 *     </State>
 *   );
 * }
 */
export function State<TSchema = unknown>(_props: StateProps<TSchema>): null {
  return null;
}

/**
 * Operation component - defines a custom semantic operation on state
 *
 * This is a compile-time component. Must be a child of State.
 * Generates a custom skill at .claude/skills/{state-name}.{operation-name}.md
 *
 * The SQL template in children can use $variable placeholders that become CLI arguments.
 * Arguments are inferred from $variable patterns in the SQL.
 *
 * @example
 * <Operation name="record">
 *   {`UPDATE releases SET lastVersion = '$version', bumpType = '$bump_type' WHERE rowid = 1`}
 * </Operation>
 * // Generates skill with --version and --bump-type arguments
 */
export function Operation(_props: OperationProps): null {
  return null;
}
