/**
 * JSX component stubs for react-agentic - Command workflow
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

import type { ReactNode } from 'react';

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
  /** Command body content */
  children?: ReactNode;
}

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
