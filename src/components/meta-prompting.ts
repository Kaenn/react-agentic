/**
 * Meta-prompting components for context composition
 */

/**
 * Props for ReadFile component
 */
export interface ReadFileProps {
  /** File path relative to project root */
  path: string;
  /** Shell variable name to store content (required) */
  as: string;
  /** If true, suppress errors for missing files */
  optional?: boolean;
}

/**
 * Read a single file into a shell variable at runtime
 * Emits bash: VAR=$(cat path) or VAR=$(cat path 2>/dev/null) for optional
 *
 * @example Required file
 * ```tsx
 * <ReadFile path=".planning/STATE.md" as="STATE_CONTENT" />
 * // Emits: STATE_CONTENT=$(cat .planning/STATE.md)
 * ```
 *
 * @example Optional file
 * ```tsx
 * <ReadFile path=".planning/CONTEXT.md" as="CONTEXT" optional />
 * // Emits: CONTEXT=$(cat .planning/CONTEXT.md 2>/dev/null)
 * ```
 */
export function ReadFile(_props: ReadFileProps): null {
  return null;
}
