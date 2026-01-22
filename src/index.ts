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
export { Agent, Assign, Command, Markdown, SpawnAgent, useVariable, XmlBlock } from './jsx.js';
export type { AgentProps, AssignProps, Assignment, CommandProps, MarkdownProps, SpawnAgentProps, VariableRef, XmlBlockProps } from './jsx.js';
