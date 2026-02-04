/**
 * Swarm System Enums
 *
 * Type-safe enumerations for Claude Code agent types and models.
 */

// AgentType - Claude Code built-in subagent types
export const AgentType = {
  Bash: 'Bash',
  Explore: 'Explore',
  Plan: 'Plan',
  GeneralPurpose: 'general-purpose',
} as const;
export type AgentType = (typeof AgentType)[keyof typeof AgentType];

// PluginAgentType - compound-engineering plugin types
export const PluginAgentType = {
  SecuritySentinel: 'compound-engineering:review:security-sentinel',
  PerformanceOracle: 'compound-engineering:review:performance-oracle',
  ArchitectureStrategist: 'compound-engineering:review:architecture-strategist',
  BestPracticesResearcher: 'compound-engineering:research:best-practices-researcher',
} as const;
export type PluginAgentType = (typeof PluginAgentType)[keyof typeof PluginAgentType];

// Model - Claude model options
export const Model = {
  Haiku: 'haiku',
  Sonnet: 'sonnet',
  Opus: 'opus',
} as const;
export type Model = (typeof Model)[keyof typeof Model];
