/**
 * JSX component stubs for react-agentic
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
  /** Optional list of allowed tools (maps to allowed-tools in frontmatter) */
  allowedTools?: string[];
  /** Command body content */
  children?: ReactNode;
}

/**
 * Props for the Agent component
 */
export interface AgentProps {
  /** Agent name (used in frontmatter and Task() spawning) */
  name: string;
  /** Agent description (used in frontmatter) */
  description: string;
  /** Space-separated tool names (optional) */
  tools?: string;
  /** Terminal color for agent output (optional) */
  color?: string;
  /** Subfolder for output path (optional) - determines namespaced agent name */
  folder?: string;
  /** Agent body content */
  children?: ReactNode;
}

/**
 * Props for the Markdown component
 */
export interface MarkdownProps {
  /** Raw Markdown content to pass through */
  children?: ReactNode;
}

/**
 * Props for the XmlBlock component
 */
export interface XmlBlockProps {
  /** XML tag name for the block */
  name: string;
  /** Block content */
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

/**
 * Agent component - creates a Claude Code agent with frontmatter
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 *
 * @example
 * <Agent name="researcher" description="Research topics" tools="Read Grep Glob" color="cyan">
 *   <h1>Role</h1>
 *   <p>You are a researcher that finds information using code analysis tools.</p>
 * </Agent>
 */
export function Agent(_props: AgentProps): null {
  return null;
}

/**
 * Markdown component - passes content through as raw Markdown
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 *
 * @example
 * <Markdown>
 * ## Pre-formatted Section
 *
 * Content that is already in Markdown format.
 * </Markdown>
 */
export function Markdown(_props: MarkdownProps): null {
  return null;
}

/**
 * XmlBlock component - creates a named XML block
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 *
 * @example
 * <XmlBlock name="instructions">
 *   <p>Content inside the block</p>
 * </XmlBlock>
 *
 * Outputs:
 * <instructions>
 * Content inside the block
 * </instructions>
 */
export function XmlBlock(_props: XmlBlockProps): null {
  return null;
}
