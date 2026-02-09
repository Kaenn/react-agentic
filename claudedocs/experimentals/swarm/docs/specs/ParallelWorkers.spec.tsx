/**
 * @component ParallelWorkers
 * @description Spawns multiple workers in parallel for concurrent execution
 */

import { AgentType, PluginAgentType, Model } from './enums';

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface Worker {
  /**
   * Unique name for this worker
   * @required
   */
  name: string;

  /**
   * Agent type for this worker
   * Use AgentType enum for built-in types or PluginAgentType for plugins
   * @required
   */
  type: AgentType | PluginAgentType | string;

  /**
   * Model to use (optional)
   * @optional
   */
  model?: Model;
}

interface ParallelWorkersProps {
  /**
   * Team name to spawn workers into
   * @required
   */
  teamName: string;

  /**
   * Worker definitions
   * @required
   */
  workers: Worker[];

  /**
   * Worker prompts - use <Prompt> children for each worker
   * Alternative to inline prompts
   * @optional
   */
  children?: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ParallelWorkers({ teamName, workers, children }: ParallelWorkersProps) {
  // Implementation renders to markdown with mermaid diagram
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// Example 1: Simple parallel workers with inline prompts (using enums)
const SimpleWorkers = () => (
  <ParallelWorkers
    teamName="code-review"
    workers={[
      { name: 'security', type: PluginAgentType.SecuritySentinel },
      { name: 'performance', type: PluginAgentType.PerformanceOracle },
      { name: 'architecture', type: PluginAgentType.ArchitectureStrategist }
    ]}
  >
    <Prompt name="security">Review for security vulnerabilities. Focus on SQL injection, XSS, auth bypass.</Prompt>

    <Prompt name="performance">Review for performance issues. Focus on N+1 queries, memory leaks, slow algorithms.</Prompt>

    <Prompt name="architecture">Review for architectural concerns. Focus on SOLID principles, separation of concerns.</Prompt>
  </ParallelWorkers>
);

// Example 2: Workers with different models (using enums)
const MixedModelWorkers = () => (
  <ParallelWorkers
    teamName="research-team"
    workers={[
      { name: 'quick-scan', type: AgentType.Explore, model: Model.Haiku },
      { name: 'deep-analysis', type: AgentType.GeneralPurpose, model: Model.Opus },
      { name: 'documentation', type: AgentType.GeneralPurpose, model: Model.Sonnet }
    ]}
  >
    <Prompt name="quick-scan">Quickly scan the codebase for relevant files. Return file list only.</Prompt>

    <Prompt name="deep-analysis">
      {`Perform deep analysis of the authentication system.

Analyze:
1. Token generation and validation
2. Session management
3. Password hashing
4. Rate limiting

Provide detailed findings.`}
    </Prompt>

    <Prompt name="documentation">Generate documentation for the authentication API endpoints.</Prompt>
  </ParallelWorkers>
);

// Example 3: Review specialists for PR (using enums)
const PRReviewWorkers = () => (
  <ParallelWorkers
    teamName="pr-review-789"
    workers={[
      { name: 'security', type: PluginAgentType.SecuritySentinel },
      { name: 'rails', type: PluginAgentType.KieranRailsReviewer },
      { name: 'typescript', type: PluginAgentType.KieranTypescriptReviewer },
      { name: 'simplicity', type: PluginAgentType.CodeSimplicityReviewer }
    ]}
  >
    <Prompt name="security">
      {`Review PR #789 for security vulnerabilities.

Focus on:
- Authentication and authorization
- Input validation
- SQL injection
- XSS vulnerabilities
- Sensitive data exposure

Send findings to team-lead when complete.`}
    </Prompt>

    <Prompt name="rails">
      {`Review Rails code in PR #789.

Focus on:
- Rails conventions
- ActiveRecord best practices
- Controller organization
- Service object patterns

Send findings to team-lead when complete.`}
    </Prompt>

    <Prompt name="typescript">
      {`Review TypeScript code in PR #789.

Focus on:
- Type safety
- Proper typing
- Async/await patterns
- Error handling

Send findings to team-lead when complete.`}
    </Prompt>

    <Prompt name="simplicity">
      {`Review PR #789 for unnecessary complexity.

Focus on:
- Over-engineering
- Premature abstraction
- YAGNI violations
- Code that could be simpler

Send findings to team-lead when complete.`}
    </Prompt>
  </ParallelWorkers>
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Example 1 renders to:
 *
 * ```markdown
 * ### Parallel Workers
 *
 * ```mermaid
 * flowchart TB
 *     Leader[Leader] --> W1[security]
 *     Leader --> W2[performance]
 *     Leader --> W3[architecture]
 *     W1 --> Results[Results]
 *     W2 --> Results
 *     W3 --> Results
 * ```
 *
 * ```javascript
 * // Spawn all workers in parallel (single message, multiple Task calls)
 * Task({
 *   team_name: "code-review",
 *   name: "security",
 *   subagent_type: "security-sentinel",
 *   prompt: `Review for security vulnerabilities. Focus on SQL injection, XSS, auth bypass.`,
 *   run_in_background: true
 * })
 *
 * Task({
 *   team_name: "code-review",
 *   name: "performance",
 *   subagent_type: "performance-oracle",
 *   prompt: `Review for performance issues. Focus on N+1 queries, memory leaks, slow algorithms.`,
 *   run_in_background: true
 * })
 *
 * Task({
 *   team_name: "code-review",
 *   name: "architecture",
 *   subagent_type: "architecture-strategist",
 *   prompt: `Review for architectural concerns. Focus on SOLID principles, separation of concerns.`,
 *   run_in_background: true
 * })
 * ```
 * ```
 */

/**
 * Example 2 renders to:
 *
 * ```markdown
 * ### Parallel Workers
 *
 * ```mermaid
 * flowchart TB
 *     Leader[Leader] --> W1[quick-scan]
 *     Leader --> W2[deep-analysis]
 *     Leader --> W3[documentation]
 *     W1 --> Results[Results]
 *     W2 --> Results
 *     W3 --> Results
 * ```
 *
 * ```javascript
 * // Spawn all workers in parallel (single message, multiple Task calls)
 * Task({
 *   team_name: "research-team",
 *   name: "quick-scan",
 *   subagent_type: "Explore",
 *   prompt: `Quickly scan the codebase for relevant files. Return file list only.`,
 *   model: "haiku",
 *   run_in_background: true
 * })
 *
 * Task({
 *   team_name: "research-team",
 *   name: "deep-analysis",
 *   subagent_type: "general-purpose",
 *   prompt: `Perform deep analysis of the authentication system.
 *
 * Analyze:
 * 1. Token generation and validation
 * 2. Session management
 * 3. Password hashing
 * 4. Rate limiting
 *
 * Provide detailed findings.`,
 *   model: "opus",
 *   run_in_background: true
 * })
 *
 * Task({
 *   team_name: "research-team",
 *   name: "documentation",
 *   subagent_type: "general-purpose",
 *   prompt: `Generate documentation for the authentication API endpoints.`,
 *   model: "sonnet",
 *   run_in_background: true
 * })
 * ```
 * ```
 */
