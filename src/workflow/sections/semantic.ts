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

// ============================================================================
// OfferNext
// ============================================================================

/**
 * Route definition for OfferNext
 */
export interface OfferNextRoute {
  name: string;
  description?: string;
  path: string;
}

/**
 * Props for the OfferNext component
 */
export interface OfferNextProps {
  routes: OfferNextRoute[];
}

/**
 * OfferNext component - emits route navigation section
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 *
 * @example
 * <OfferNext routes={[
 *   { name: "Execute", description: "Run the plan", path: "/gsd:execute-phase" },
 *   { name: "Revise", path: "/gsd:plan-phase --revise" }
 * ]} />
 *
 * Outputs:
 * <offer_next>
 * - **Execute**: Run the plan
 *   `/gsd:execute-phase`
 * - **Revise**
 *   `/gsd:plan-phase --revise`
 * </offer_next>
 */
export function OfferNext(_props: OfferNextProps): null {
  return null;
}

// ============================================================================
// XML Wrapper Components
// ============================================================================

/**
 * Common props for XML wrapper components
 */
export interface XmlWrapperProps {
  children: ReactNode;
}

/**
 * DeviationRules component - emits deviation_rules XML section
 * Used in GSD workflows for handling plan deviations
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 */
export function DeviationRules(_props: XmlWrapperProps): null {
  return null;
}

/**
 * CommitRules component - emits commit_rules XML section
 * Used in GSD workflows for git commit guidelines
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 */
export function CommitRules(_props: XmlWrapperProps): null {
  return null;
}

/**
 * WaveExecution component - emits wave_execution XML section
 * Used in GSD workflows for parallel execution patterns
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 */
export function WaveExecution(_props: XmlWrapperProps): null {
  return null;
}

/**
 * CheckpointHandling component - emits checkpoint_handling XML section
 * Used in GSD workflows for verification checkpoints
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 */
export function CheckpointHandling(_props: XmlWrapperProps): null {
  return null;
}
