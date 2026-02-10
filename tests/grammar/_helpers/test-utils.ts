/**
 * Grammar Test Utilities
 *
 * Shared helpers for grammar test suite.
 * Provides consistent transform and assertion patterns.
 */

import { expect } from 'vitest';
import { Node } from 'ts-morph';
import {
  createProject,
  parseSource,
  findRootJsxElement,
  createRuntimeContext,
  transformRuntimeCommand,
  type DocumentNode,
} from '../../../src/index.js';
import { transformDocument } from '../../../src/parser/transformers/document.js';
import { emit, emitAgent, emitDocument } from '../../../src/emitter/index.js';
import type { AgentDocumentNode } from '../../../src/ir/index.js';
import {
  extractRuntimeVarDeclarations,
  extractRuntimeFnDeclarations,
  extractLocalComponentDeclarations,
} from '../../../src/parser/transformers/runtime-index.js';

// Counter for unique file names
let testCounter = 0;

/**
 * Transform TSX wrapped in Agent to DocumentNode
 * Used for V1 (Agent-based) transformer testing
 */
export function transformAgentTsx(tsx: string): AgentDocumentNode {
  const project = createProject();
  const fileName = `test-agent-${testCounter++}.tsx`;
  const source = parseSource(project, tsx, fileName);
  const root = findRootJsxElement(source);
  if (!root) throw new Error('No JSX found');
  return transformDocument(root, source) as AgentDocumentNode;
}

/**
 * Transform Agent content to markdown
 *
 * @param content - Either partial content to wrap, or full TSX
 * @param fullTsx - If true, content is complete TSX with function export
 */
export function transformAgentContent(content: string, fullTsx = false): string {
  const tsx = fullTsx
    ? content
    : `export default function Doc() { return <Agent name="test" description="test">${content}</Agent>; }`;
  const doc = transformAgentTsx(tsx);
  return emitAgent(doc);
}

/**
 * Transform Command TSX to DocumentNode (V3 runtime transformer)
 * Properly extracts runtime variables and functions before transformation
 */
export function transformCommandTsx(tsx: string): DocumentNode {
  const project = createProject();
  const fileName = `test-cmd-${testCounter++}.tsx`;
  const source = parseSource(project, tsx, fileName);
  const root = findRootJsxElement(source);
  if (!root) throw new Error('No JSX found');

  // Guard against JsxFragment - transformRuntimeCommand only accepts JsxElement | JsxSelfClosingElement
  if (!Node.isJsxElement(root) && !Node.isJsxSelfClosingElement(root)) {
    throw new Error('Root element must be JsxElement or JsxSelfClosingElement, not JsxFragment');
  }

  // Create runtime transform context
  const ctx = createRuntimeContext(source);

  // Extract declarations (same as runtime-build.ts)
  extractRuntimeVarDeclarations(source, ctx);
  extractRuntimeFnDeclarations(source, ctx);
  extractLocalComponentDeclarations(source, ctx);

  // Transform the document
  return transformRuntimeCommand(root, ctx);
}

/**
 * Transform Command content to markdown
 *
 * @param content - Either partial content to wrap, or full TSX
 * @param fullTsx - If true, content is complete TSX with function export
 */
export function transformCommandContent(content: string, fullTsx = false): string {
  const tsx = fullTsx
    ? content
    : `export default function Doc() { return <Command name="test" description="test">${content}</Command>; }`;
  const doc = transformCommandTsx(tsx);
  return emitDocument(doc);
}

/**
 * Transform Command TSX and emit to markdown
 * Full pipeline for Command documents
 */
export function transformCommand(tsx: string): string {
  const doc = transformCommandTsx(tsx);
  return emitDocument(doc);
}

/**
 * Transform Agent TSX and emit to markdown
 * Full pipeline for Agent documents
 */
export function transformAgent(tsx: string): string {
  const doc = transformAgentTsx(tsx);
  return emitAgent(doc);
}

/**
 * Expect TSX transformation to throw with matching pattern
 * Used for testing error cases
 */
export function expectTransformError(tsx: string, pattern: RegExp): void {
  expect(() => transformCommand(tsx)).toThrow(pattern);
}

/**
 * Expect Agent TSX transformation to throw with matching pattern
 */
export function expectAgentTransformError(tsx: string, pattern: RegExp): void {
  expect(() => transformAgent(tsx)).toThrow(pattern);
}

/**
 * Get the document IR without emitting
 * Useful for testing IR structure directly
 */
export function getCommandIR(tsx: string): DocumentNode {
  return transformCommandTsx(tsx);
}

/**
 * Get the agent document IR without emitting
 */
export function getAgentIR(tsx: string): AgentDocumentNode {
  return transformAgentTsx(tsx);
}

/**
 * Create a complete Command TSX from content
 */
export function wrapInCommand(content: string, props?: string): string {
  const propsStr = props ? ` ${props}` : '';
  return `export default function Doc() {
    return (
      <Command name="test" description="test"${propsStr}>
        ${content}
      </Command>
    );
  }`;
}

/**
 * Create a complete Agent TSX from content
 */
export function wrapInAgent(content: string, props?: string): string {
  const propsStr = props ? ` ${props}` : '';
  return `export default function Doc() {
    return (
      <Agent name="test" description="test"${propsStr}>
        ${content}
      </Agent>
    );
  }`;
}
