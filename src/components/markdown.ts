/**
 * Markdown Primitives - Compile-time JSX components
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

import type { ReactNode } from 'react';

// ============================================================================
// Markdown Component
// ============================================================================

/**
 * Props for the Markdown component
 */
export interface MarkdownProps {
  /** Raw Markdown content to pass through */
  children?: ReactNode;
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

// ============================================================================
// XmlBlock Component
// ============================================================================

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

// ============================================================================
// Indent Component
// ============================================================================

/**
 * Props for the Indent component
 */
export interface IndentProps {
  /** Number of spaces to indent (default: 2) */
  spaces?: number;
  /** Block content to indent */
  children?: ReactNode;
}

/**
 * Indent component - indents content by a specified number of spaces
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 *
 * @example
 * <Indent spaces={4}>
 *   This content will be indented by 4 spaces.
 *   Each line gets the same indentation.
 * </Indent>
 *
 * Outputs:
 *     This content will be indented by 4 spaces.
 *     Each line gets the same indentation.
 */
export function Indent(_props: IndentProps): null {
  return null;
}
