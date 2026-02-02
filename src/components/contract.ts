/**
 * Agent Contract Components
 *
 * Re-exports composites for Role, UpstreamInput, DownstreamConsumer, Methodology.
 * These are now composites that wrap XmlBlock.
 *
 * StatusReturn and StructuredReturns remain as primitives because:
 * - StructuredReturns validates that children are only StatusReturn
 * - StatusReturn is only valid inside StructuredReturns
 *
 * All components are optional but must appear in order if used:
 * Role -> UpstreamInput -> DownstreamConsumer -> Methodology -> StructuredReturns
 */

import type { ReactNode } from 'react';

// ============================================================================
// Re-export Composites
// ============================================================================

export {
  Role,
  UpstreamInput,
  DownstreamConsumer,
  Methodology,
  type ContractComponentProps,
  type RoleProps,
  type UpstreamInputProps,
  type DownstreamConsumerProps,
  type MethodologyProps,
} from '../composites/contract/index.js';

// ============================================================================
// Primitive Types (StatusReturn, StructuredReturns)
// ============================================================================

/**
 * Props for StatusReturn component
 */
export interface StatusReturnProps {
  /** Status value (e.g., "SUCCESS", "BLOCKED", "PARTIAL") */
  status: string;
  /** Description of what this status means */
  children?: ReactNode;
}

/**
 * Props for StructuredReturns component
 */
export interface StructuredReturnsProps {
  /** Return children defining each status */
  children?: ReactNode;
}

// ============================================================================
// Primitive Components
// ============================================================================

/**
 * StatusReturn - Individual return status with description
 *
 * Only valid inside StructuredReturns. Renders as ## heading in agent markdown.
 *
 * @example
 * ```tsx
 * <StatusReturn status="SUCCESS">All tests passed</StatusReturn>
 * ```
 */
export function StatusReturn(_props: StatusReturnProps): null {
  return null;
}

/**
 * StructuredReturns - Container for StatusReturn children defining agent statuses
 *
 * Renders as <structured_returns> XML block containing ## headings for each status.
 * Must document all statuses from agent's status type.
 *
 * @example
 * ```tsx
 * <StructuredReturns>
 *   <StatusReturn status="SUCCESS">All tests passed</StatusReturn>
 *   <StatusReturn status="FAILED">Some tests failed</StatusReturn>
 *   <StatusReturn status="BLOCKED">Cannot run tests</StatusReturn>
 * </StructuredReturns>
 * ```
 */
export function StructuredReturns(_props: StructuredReturnsProps): null {
  return null;
}
