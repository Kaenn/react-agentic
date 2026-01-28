/**
 * AskUser Component for Hybrid Runtime
 *
 * Prompts the user with a question and stores the response
 * in a ScriptVar for subsequent logic.
 *
 * Emits as Claude Code's AskUserQuestion tool syntax.
 */

import type { ScriptVar, ScriptVarProxy, OrScriptVar } from './script-var.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Option in the AskUser question
 */
export interface AskUserOption {
  /** Internal value stored in output variable */
  value: string;
  /** Display label shown to user */
  label: string;
  /** Optional description for the option */
  description?: string;
}

/**
 * Props for AskUser component
 */
export interface AskUserProps {
  /**
   * Question to ask the user
   *
   * Should be clear and specific, ending with a question mark.
   * Accepts static string or ScriptVar for runtime interpolation.
   *
   * @example "Which database should we use?"
   */
  question: OrScriptVar<string>;

  /**
   * Available options for the user to choose from
   *
   * Must have 2-4 options. User can always select "Other" to provide custom input.
   * Accepts static array or ScriptVar<AskUserOption[]> for runtime resolution.
   *
   * @example
   * options={[
   *   { value: 'postgres', label: 'PostgreSQL', description: 'Recommended for production' },
   *   { value: 'sqlite', label: 'SQLite', description: 'Good for development' },
   * ]}
   */
  options: AskUserOption[] | ScriptVar<AskUserOption[]> | ScriptVarProxy<AskUserOption[]>;

  /**
   * ScriptVar to store the user's response
   *
   * Will contain the `value` from the selected option,
   * or custom text if user selected "Other".
   */
  output: ScriptVarProxy<string>;

  /**
   * Optional header/chip label (max 12 chars)
   *
   * Short label displayed as a chip/tag above the question.
   * Accepts static string or ScriptVar.
   *
   * @example "Database"
   */
  header?: OrScriptVar<string>;

  /**
   * Allow multiple selections
   *
   * When true, user can select multiple options.
   * Output will contain comma-separated values.
   * Accepts static boolean or ScriptVar.
   *
   * @default false
   */
  multiSelect?: OrScriptVar<boolean>;
}

/**
 * Ask the user a question and store their response
 *
 * Emits as Claude Code's AskUserQuestion tool invocation.
 * The response is stored in the output ScriptVar for use
 * in subsequent If conditions or interpolation.
 *
 * @example
 * const dbChoice = useRuntimeVar<string>('DB_CHOICE');
 *
 * <AskUser
 *   question="Which database should we use?"
 *   header="Database"
 *   options={[
 *     { value: 'postgres', label: 'PostgreSQL (Recommended)', description: 'Best for production' },
 *     { value: 'sqlite', label: 'SQLite', description: 'Good for development' },
 *   ]}
 *   output={dbChoice}
 * />
 *
 * <If condition={dbChoice === 'postgres'}>
 *   <p>Setting up PostgreSQL...</p>
 * </If>
 */
export function AskUser(_props: AskUserProps): null {
  // Compile-time only - transformer handles emission
  return null;
}

// ============================================================================
// Type Guard
// ============================================================================

/**
 * Marker symbol for AskUser component
 */
export const ASK_USER_MARKER = Symbol.for('react-agentic:ask-user');

// Add marker to component
Object.defineProperty(AskUser, ASK_USER_MARKER, { value: true });
