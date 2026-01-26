/**
 * JSX component stubs for react-agentic - Semantic wrapper components
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

import type { ReactNode } from 'react';

// ============================================================================
// ExecutionContext
// ============================================================================

/**
 * Props for the ExecutionContext component
 */
export interface ExecutionContextProps {
  /** File paths to include in execution context */
  paths: string[];
  /** Prefix for paths (defaults to '@') */
  prefix?: string;
  /** Optional additional content inside execution_context block */
  children?: ReactNode;
}

/**
 * ExecutionContext component - emits <execution_context> XML with file paths
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 *
 * @example
 * <ExecutionContext
 *   paths={[
 *     "/Users/user/.claude/workflow.md",
 *     "/Users/user/.claude/templates/summary.md"
 *   ]}
 * />
 *
 * Outputs:
 * <execution_context>
 * @/Users/user/.claude/workflow.md
 * @/Users/user/.claude/templates/summary.md
 * </execution_context>
 *
 * @example
 * <ExecutionContext
 *   paths={["~/docs/guide.md"]}
 *   prefix="$"
 * >
 *   <Markdown>See these files for context.</Markdown>
 * </ExecutionContext>
 *
 * Outputs:
 * <execution_context>
 * $/Users/user/docs/guide.md
 * See these files for context.
 * </execution_context>
 */
export function ExecutionContext(_props: ExecutionContextProps): null {
  return null;
}

// ============================================================================
// SuccessCriteria
// ============================================================================

/**
 * Single success criteria item
 */
export interface SuccessCriteriaItem {
  /** Criteria description text */
  text: string;
  /** Whether item is initially checked (defaults to false) */
  checked?: boolean;
}

/**
 * Props for the SuccessCriteria component
 */
export interface SuccessCriteriaProps {
  /** Checklist items - can be strings or objects with checked state */
  items: (string | SuccessCriteriaItem)[];
}

/**
 * SuccessCriteria component - emits <success_criteria> XML with checkbox list
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 *
 * @example
 * <SuccessCriteria
 *   items={[
 *     "All tests passing",
 *     "Documentation updated",
 *     "Code reviewed"
 *   ]}
 * />
 *
 * Outputs:
 * <success_criteria>
 * - [ ] All tests passing
 * - [ ] Documentation updated
 * - [ ] Code reviewed
 * </success_criteria>
 *
 * @example
 * <SuccessCriteria
 *   items={[
 *     { text: "Setup complete", checked: true },
 *     { text: "Tests passing", checked: false }
 *   ]}
 * />
 *
 * Outputs:
 * <success_criteria>
 * - [x] Setup complete
 * - [ ] Tests passing
 * </success_criteria>
 */
export function SuccessCriteria(_props: SuccessCriteriaProps): null {
  return null;
}

// ============================================================================
// XmlSection
// ============================================================================

/**
 * Props for the XmlSection component
 */
export interface XmlSectionProps {
  /** XML tag name (e.g., 'objective', 'verification', 'notes') */
  name: string;
  /** Content to wrap in XML tags */
  children: ReactNode;
}

/**
 * XmlSection component - emits custom XML tags wrapping content
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 *
 * Generic wrapper for custom XML sections not covered by specific components.
 *
 * @example
 * <XmlSection name="objective">
 *   <Markdown>Implement authentication system</Markdown>
 * </XmlSection>
 *
 * Outputs:
 * <objective>
 * Implement authentication system
 * </objective>
 *
 * @example
 * <XmlSection name="verification">
 *   <List items={["Run tests", "Check logs", "Verify output"]} />
 * </XmlSection>
 *
 * Outputs:
 * <verification>
 * - Run tests
 * - Check logs
 * - Verify output
 * </verification>
 */
export function XmlSection(_props: XmlSectionProps): null {
  return null;
}
