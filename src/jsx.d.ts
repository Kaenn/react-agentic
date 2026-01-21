/**
 * JSX type definitions for react-agentic
 *
 * Provides type definitions for the Command and Markdown components
 * used in TSX command files.
 */

import type { ReactNode } from 'react';

/**
 * Props for the Command component
 *
 * Creates a Claude Code command with frontmatter containing metadata.
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
 * Props for the Markdown component
 *
 * Passes content through as raw Markdown without transformation.
 */
export interface MarkdownProps {
  /** Raw Markdown content to pass through */
  children?: ReactNode;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      /**
       * Command component - creates a Claude Code command with frontmatter
       *
       * @example
       * <Command name="my-command" description="Does something useful">
       *   <p>Command instructions here</p>
       * </Command>
       */
      Command: CommandProps;

      /**
       * Markdown component - passes content through as raw Markdown
       *
       * @example
       * <Markdown>
       * ## Pre-formatted Section
       *
       * Content that is already in Markdown format.
       * </Markdown>
       */
      Markdown: MarkdownProps;
    }
  }
}
