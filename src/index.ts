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

// JSX type definitions
export type * from './jsx.js';
