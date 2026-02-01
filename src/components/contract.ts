/**
 * Agent Contract Components - Compile-time JSX components
 *
 * These components define the agent's contract: identity, inputs, outputs,
 * methodology, and structured return statuses. They render as XML blocks
 * in the agent markdown output.
 *
 * All components are optional but must appear in order if used:
 * Role → UpstreamInput → DownstreamConsumer → Methodology → StructuredReturns
 */

import type { ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for container contract components (Role, UpstreamInput, etc.)
 * These accept free-form children - author decides internal structure
 */
export interface ContractComponentProps {
  /** Free-form content: markdown, XmlBlock, text */
  children?: ReactNode;
}

/**
 * Props for Return component
 */
export interface ReturnProps {
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
// Components
// ============================================================================

/**
 * Role - Declares agent identity and responsibilities
 *
 * Renders as <role> XML block in agent markdown.
 *
 * @example
 * ```tsx
 * <Role>
 *   You are a test runner. You execute tests and report results.
 * </Role>
 * ```
 */
export function Role(_props: ContractComponentProps): null {
  return null;
}

/**
 * UpstreamInput - Documents expected input context from orchestrator
 *
 * Renders as <upstream_input> XML block in agent markdown.
 *
 * @example
 * ```tsx
 * <UpstreamInput>
 *   Expects:
 *   - testPath: string
 *   - coverage: boolean
 * </UpstreamInput>
 * ```
 */
export function UpstreamInput(_props: ContractComponentProps): null {
  return null;
}

/**
 * DownstreamConsumer - Documents output consumers
 *
 * Renders as <downstream_consumer> XML block in agent markdown.
 *
 * @example
 * ```tsx
 * <DownstreamConsumer>
 *   Output is consumed by the orchestrator for status routing.
 * </DownstreamConsumer>
 * ```
 */
export function DownstreamConsumer(_props: ContractComponentProps): null {
  return null;
}

/**
 * Methodology - Describes working approach
 *
 * Renders as <methodology> XML block in agent markdown.
 *
 * @example
 * ```tsx
 * <Methodology>
 *   1. Load test files
 *   2. Execute test runner
 *   3. Parse results
 *   4. Report status
 * </Methodology>
 * ```
 */
export function Methodology(_props: ContractComponentProps): null {
  return null;
}

/**
 * Return - Individual return status with description
 *
 * Only valid inside StructuredReturns. Renders as ## heading in agent markdown.
 *
 * @example
 * ```tsx
 * <Return status="SUCCESS">All tests passed</Return>
 * ```
 */
export function Return(_props: ReturnProps): null {
  return null;
}

/**
 * StructuredReturns - Container for Return children defining agent statuses
 *
 * Renders as <structured_returns> XML block containing ## headings for each status.
 * Must document all statuses from agent's status type.
 *
 * @example
 * ```tsx
 * <StructuredReturns>
 *   <Return status="SUCCESS">All tests passed</Return>
 *   <Return status="FAILED">Some tests failed</Return>
 *   <Return status="BLOCKED">Cannot run tests</Return>
 * </StructuredReturns>
 * ```
 */
export function StructuredReturns(_props: StructuredReturnsProps): null {
  return null;
}
