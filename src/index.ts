/**
 * react-agentic - Compile-time safety for Claude Code commands
 *
 * Main entry point - exports IR types and emitter functionality.
 */

// IR types
export * from './ir/index.js';

// Markdown emitter
export * from './emitter/index.js';

// Parser
export * from './parser/index.js';

// JSX components and types
export { Agent, Assign, Command, If, Else, Markdown, OnStatus, SpawnAgent, useOutput, useVariable, XmlBlock } from './jsx.js';
export type { AgentProps, AgentStatus, AssignProps, Assignment, BaseOutput, CommandProps, ElseProps, IfProps, MarkdownProps, OnStatusProps, OutputRef, SpawnAgentProps, VariableRef, XmlBlockProps } from './jsx.js';
