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
export { Agent, Assign, Bash, CheckpointHandling, Command, CommitRules, DeviationRules, ExecutionContext, If, Else, List, Markdown, MCPConfig, MCPServer, MCPStdioServer, MCPHTTPServer, OfferNext, OnStatus, PromptTemplate, ReadFiles, Skill, SkillFile, SkillStatic, SpawnAgent, SuccessCriteria, Table, useOutput, useVariable, useStateRef, ReadState, WaveExecution, WriteState, XmlBlock, XmlSection, State, Operation, defineVars, defineFiles, defineContext } from './jsx.js';
export type { AgentProps, AgentStatus, AssignProps, BaseOutput, BashProps, CommandProps, Context, ContextDef, AgentDef, ExecutionContextProps, ElseProps, FileDef, FileRef, FileSchema, FilesFromSchema, IfProps, ListProps, MarkdownProps, MCPConfigProps, MCPServerProps, MCPStdioServerProps, MCPHTTPServerProps, OfferNextProps, OfferNextRoute, OnStatusProps, OutputRef, PromptTemplateProps, ReadFilesProps, ReadStateProps, SkillFileProps, SkillProps, SkillStaticProps, SpawnAgentProps, StateRef, SuccessCriteriaProps, SuccessCriteriaItem, TableProps, TableAlignment, VarDef, VariableRef, VarSchema, VarsFromSchema, WriteStateProps, XmlBlockProps, XmlSectionProps, XmlWrapperProps, StateProps, OperationProps, SQLiteConfig } from './jsx.js';

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
