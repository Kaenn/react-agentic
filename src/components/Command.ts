/**
 * Command Component - Compile-time JSX component
 *
 * This component is compile-time only - it's transformed by the transpiler
 * and never executed at runtime. It exists to provide TypeScript type checking.
 */

import type { ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Command argument definition
 * Used for commands that accept arguments via the skill system
 */
export interface CommandArgument {
  /** Argument name */
  name: string;
  /** Description of the argument */
  description: string;
  /** Whether the argument is required (default: false) */
  required?: boolean;
}

/**
 * Context available in Command render props pattern
 * All values resolved at compile time, static in output
 */
export interface CommandContext {
  /** Command name from props */
  name: string;
  /** Command description from props */
  description: string;
  /** Skill name if invoked via skill (undefined otherwise) */
  skill?: string;
  /** Subfolder for output path (e.g., "gsd" → .claude/commands/gsd/my-cmd.md) */
  folder?: string;
  /** Resolved output path (e.g., .claude/commands/my-cmd.md) */
  outputPath: string;
  /** Source TSX file path */
  sourcePath: string;
}

/**
 * Props for the Command component
 */
export interface CommandProps {
  /** Command name (used in frontmatter) */
  name: string;
  /** Command description (used in frontmatter) */
  description: string;
  /** Optional argument hint (maps to argument-hint in frontmatter) */
  argumentHint?: string;
  /** Optional agent name (maps to agent in frontmatter) */
  agent?: string;
  /** Optional list of allowed tools (maps to allowed-tools in frontmatter) */
  allowedTools?: string[];
  /** Subfolder for output path (e.g., "gsd" → .claude/commands/gsd/my-cmd.md) */
  folder?: string;
  /** Arguments array (maps to arguments in frontmatter) */
  arguments?: CommandArgument[];
  /**
   * Command body content - either regular JSX or render props function
   * Render props: (ctx: CommandContext) => ReactNode
   */
  children?: ReactNode | ((ctx: CommandContext) => ReactNode);
}

// ============================================================================
// Component
// ============================================================================

/**
 * Command component - creates a Claude Code command with frontmatter
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 *
 * @example
 * <Command name="my-command" description="Does something useful">
 *   <p>Command instructions here</p>
 * </Command>
 */
export function Command(_props: CommandProps): null {
  return null;
}
