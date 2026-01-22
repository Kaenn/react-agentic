/**
 * react-agentic - Compile-time safety for Claude Code commands
 *
 * Main entry point - exports IR types and emitter functionality.
 */

// IR types
export * from './ir/index.js';

// Markdown emitter
export * from './emitter/index.js';

// Settings emitter (re-exported from emitter/index.js via wildcard, explicit for clarity)
// emitSettings, mergeSettings - for MCP configuration to settings.json

// Parser
export * from './parser/index.js';

// JSX components and types
export { Agent, Assign, Command, If, Else, Markdown, MCPConfig, MCPServer, MCPStdioServer, MCPHTTPServer, OnStatus, Skill, SkillFile, SkillStatic, SpawnAgent, useOutput, useVariable, useStateRef, ReadState, WriteState, XmlBlock, State, Operation } from './jsx.js';
export type { AgentProps, AgentStatus, AssignProps, BaseOutput, CommandProps, ElseProps, IfProps, MarkdownProps, MCPConfigProps, MCPServerProps, MCPStdioServerProps, MCPHTTPServerProps, OnStatusProps, OutputRef, ReadStateProps, SkillFileProps, SkillProps, SkillStaticProps, SpawnAgentProps, StateRef, VariableRef, WriteStateProps, XmlBlockProps, StateProps, OperationProps, SQLiteConfig } from './jsx.js';

// Provider templates for State component
export { getProvider, getProviderAsync, type ProviderTemplate, type GeneratedSkill } from './providers/index.js';

// State System
export {
  StateAdapter,
  StateConfig,
  FileAdapter,
  getNestedValue,
  setNestedValue,
} from './state/index.js';
