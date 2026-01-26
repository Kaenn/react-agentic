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
export { Agent, Assign, Command, ExecutionContext, If, Else, List, Markdown, MCPConfig, MCPServer, MCPStdioServer, MCPHTTPServer, OnStatus, Skill, SkillFile, SkillStatic, SpawnAgent, SuccessCriteria, Table, useOutput, useVariable, useStateRef, ReadState, WriteState, XmlBlock, XmlSection, State, Operation } from './jsx.js';
export type { AgentProps, AgentStatus, AssignProps, BaseOutput, CommandProps, ExecutionContextProps, ElseProps, IfProps, ListProps, MarkdownProps, MCPConfigProps, MCPServerProps, MCPStdioServerProps, MCPHTTPServerProps, OnStatusProps, OutputRef, ReadStateProps, SkillFileProps, SkillProps, SkillStaticProps, SpawnAgentProps, StateRef, SuccessCriteriaProps, SuccessCriteriaItem, TableProps, TableAlignment, VariableRef, WriteStateProps, XmlBlockProps, XmlSectionProps, StateProps, OperationProps, SQLiteConfig } from './jsx.js';

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
