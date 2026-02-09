/**
 * Agent system barrel exports
 */

export { Agent, SpawnAgent, OnStatus, OnStatusDefault } from './Agent.js';
export type { AgentProps, SpawnAgentProps, V3SpawnAgentProps, OnStatusProps, OnStatusDefaultProps, AgentContext } from './Agent.js';
export { useOutput } from './types.js';
export type { OutputRef, AgentStatus, BaseOutput } from './types.js';

// AgentRef system for type-safe agent references
export { defineAgent, isAgentRef, getAgentName, getAgentPath } from './AgentRef.js';
export type { AgentRef, DefineAgentConfig } from './AgentRef.js';
