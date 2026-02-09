/**
 * @component AgentTypeDef
 * @description Documents an agent type with its properties and usage
 */

import { AgentType, PluginAgentType, Model } from './enums';

// =============================================================================
// ENUMS (re-export for convenience)
// =============================================================================

export { AgentType, PluginAgentType, Model };

/**
 * Extended model options including inheritance
 */
export enum ModelOption {
  /** Fast and cheap - best for simple tasks */
  Haiku = 'haiku',

  /** Balanced performance and cost */
  Sonnet = 'sonnet',

  /** Highest capability - best for complex tasks */
  Opus = 'opus',

  /** Inherits model from parent agent */
  Inherits = 'inherits'
}

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface AgentTypeDefProps {
  /**
   * Agent type name - use AgentType or PluginAgentType enum
   * @required
   */
  name: AgentType | PluginAgentType | string;

  /**
   * List of tools available to this agent type
   * @required
   */
  tools: string[];

  /**
   * Default model for this agent type
   * @optional
   */
  model?: ModelOption;

  /**
   * List of use cases this agent type is best for
   * @required
   */
  bestFor: string[];

  /**
   * Example usage code - use children for complex examples
   * @required
   */
  children: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AgentTypeDef({ name, tools, model, bestFor, children }: AgentTypeDefProps) {
  // Implementation renders to markdown section
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// Example 1: Built-in Explore agent (using enums)
const ExploreAgentDef = () => (
  <AgentTypeDef
    name={AgentType.Explore}
    tools={['Read', 'Glob', 'Grep', 'LS', 'WebFetch', 'WebSearch']}
    model={ModelOption.Haiku}
    bestFor={['Codebase exploration', 'File searches', 'Code understanding', 'Quick scans']}
  >
    <CodeBlock>
      {`Task({
  subagent_type: "Explore",
  description: "Find API endpoints",
  prompt: "Find all API endpoints in this codebase. Be very thorough.",
  model: "haiku"
})`}
    </CodeBlock>
  </AgentTypeDef>
);

// Example 2: Built-in Plan agent (using enums)
const PlanAgentDef = () => (
  <AgentTypeDef
    name={AgentType.Plan}
    tools={['Read', 'Glob', 'Grep', 'WebFetch', 'WebSearch']}
    model={ModelOption.Inherits}
    bestFor={['Architecture planning', 'Implementation strategies', 'Design decisions', 'Technical analysis']}
  >
    <CodeBlock>
      {`Task({
  subagent_type: "Plan",
  description: "Design auth system",
  prompt: "Create an implementation plan for adding OAuth2 authentication"
})`}
    </CodeBlock>
  </AgentTypeDef>
);

// Example 3: General purpose agent (using enums)
const GeneralPurposeAgentDef = () => (
  <AgentTypeDef
    name={AgentType.GeneralPurpose}
    tools={['All tools (*)']}
    model={ModelOption.Inherits}
    bestFor={['Multi-step tasks', 'Research + action', 'Implementation', 'Complex workflows']}
  >
    <CodeBlock>
      {`Task({
  subagent_type: "general-purpose",
  description: "Research and implement",
  prompt: "Research React Query best practices and implement caching for the user API"
})`}
    </CodeBlock>
  </AgentTypeDef>
);

// Example 4: Plugin agent (security-sentinel, using enums)
const SecuritySentinelDef = () => (
  <AgentTypeDef
    name={PluginAgentType.SecuritySentinel}
    tools={['Read', 'Glob', 'Grep']}
    model={ModelOption.Inherits}
    bestFor={[
      'Security vulnerability detection',
      'SQL injection review',
      'XSS vulnerability scanning',
      'Authentication/authorization audit'
    ]}
  >
    <CodeBlock>
      {`Task({
  subagent_type: "compound-engineering:review:security-sentinel",
  description: "Security audit",
  prompt: \`Review this code for security vulnerabilities.

Focus on:
- SQL injection
- XSS vulnerabilities
- Authentication bypass
- Sensitive data exposure

Report findings with severity ratings.\`
})`}
    </CodeBlock>
  </AgentTypeDef>
);

// Example 5: Plugin agent (performance-oracle, using enums)
const PerformanceOracleDef = () => (
  <AgentTypeDef
    name={PluginAgentType.PerformanceOracle}
    tools={['Read', 'Glob', 'Grep']}
    model={ModelOption.Inherits}
    bestFor={['Performance analysis', 'N+1 query detection', 'Memory leak identification', 'Algorithm optimization']}
  >
    <CodeBlock>
      {`Task({
  subagent_type: "compound-engineering:review:performance-oracle",
  description: "Performance check",
  prompt: "Analyze this code for performance bottlenecks"
})`}
    </CodeBlock>
  </AgentTypeDef>
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Example 1 renders to:
 *
 * ```markdown
 * ### Explore
 *
 * | Property | Value |
 * |----------|-------|
 * | **Tools** | Read, Glob, Grep, LS, WebFetch, WebSearch |
 * | **Model** | haiku |
 * | **Best For** | Codebase exploration, File searches, Code understanding, Quick scans |
 *
 * ```javascript
 * Task({
 *   subagent_type: "Explore",
 *   description: "Find API endpoints",
 *   prompt: "Find all API endpoints in this codebase. Be very thorough.",
 *   model: "haiku"
 * })
 * ```
 * ```
 */

/**
 * Example 4 renders to:
 *
 * ```markdown
 * ### compound-engineering:review:security-sentinel
 *
 * | Property | Value |
 * |----------|-------|
 * | **Tools** | Read, Glob, Grep |
 * | **Model** | inherits |
 * | **Best For** | Security vulnerability detection, SQL injection review, XSS vulnerability scanning, Authentication/authorization audit |
 *
 * ```javascript
 * Task({
 *   subagent_type: "compound-engineering:review:security-sentinel",
 *   description: "Security audit",
 *   prompt: `Review this code for security vulnerabilities.
 *
 * Focus on:
 * - SQL injection
 * - XSS vulnerabilities
 * - Authentication bypass
 * - Sensitive data exposure
 *
 * Report findings with severity ratings.`
 * })
 * ```
 * ```
 */

// =============================================================================
// AGENT TYPE CATEGORIES
// =============================================================================

/**
 * ## Built-in Agent Types
 *
 * | Type | Model | Tools | Best For |
 * |------|-------|-------|----------|
 * | Bash | inherits | Bash | Git, commands |
 * | Explore | haiku | Read-only | Codebase exploration |
 * | Plan | inherits | Read-only | Architecture planning |
 * | general-purpose | inherits | All (*) | Multi-step tasks |
 * | claude-code-guide | inherits | Read + Web | Claude Code help |
 * | statusline-setup | sonnet | Read, Edit | Status line config |
 *
 * ## Plugin Agent Types (compound-engineering)
 *
 * ### Review Agents
 * - security-sentinel
 * - performance-oracle
 * - architecture-strategist
 * - code-simplicity-reviewer
 * - kieran-rails-reviewer
 * - kieran-typescript-reviewer
 * - kieran-python-reviewer
 *
 * ### Research Agents
 * - best-practices-researcher
 * - framework-docs-researcher
 * - git-history-analyzer
 */
