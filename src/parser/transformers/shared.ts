/**
 * Shared utilities for transformer modules
 *
 * Pure utility functions and constants used across multiple transformers.
 * Functions that recurse into other transforms are in dispatch.ts.
 */

import { Node, TemplateExpression } from 'ts-morph';
import type { BlockNode, InlineNode } from '../../ir/index.js';
import type { TransformContext } from './types.js';
import { getElementName, extractText } from '../parser.js';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert PascalCase component name to snake_case XML tag name
 * Example: DeviationRules -> deviation_rules
 */
export function toSnakeCase(name: string): string {
  return name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

// ============================================================================
// Template Extraction
// ============================================================================

/**
 * Extract content from a template expression, preserving ${var} syntax
 *
 * Used for bash/code content where variable interpolation should be preserved.
 * Converts TypeScript template expressions like `cmd ${var}` to "cmd ${var}".
 *
 * @param expr - The TemplateExpression node from ts-morph
 * @returns The extracted string with ${...} syntax preserved
 */
export function extractTemplateContent(expr: TemplateExpression): string {
  const parts: string[] = [];

  // Head: text before first ${...}
  parts.push(expr.getHead().getLiteralText());

  // Spans: each has expression + literal text after
  for (const span of expr.getTemplateSpans()) {
    const spanExpr = span.getExpression();
    // Preserve ${...} syntax for bash/code
    parts.push(`\${${spanExpr.getText()}}`);
    parts.push(span.getLiteral().getLiteralText());
  }

  return parts.join('');
}

// ============================================================================
// Element Classification
// ============================================================================

/**
 * HTML elements supported by the transformer
 */
export const HTML_ELEMENTS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'div', 'span', 'ul', 'ol', 'li',
  'a', 'b', 'i', 'strong', 'em', 'code',
  'pre', 'blockquote', 'br', 'hr',
]);

/**
 * Inline HTML elements that should be wrapped in paragraphs when at block level
 */
export const INLINE_ELEMENTS = new Set([
  'a', 'b', 'i', 'strong', 'em', 'code', 'span', 'br',
]);

/**
 * Check if a tag name represents an inline element
 */
export function isInlineElement(tagName: string): boolean {
  return INLINE_ELEMENTS.has(tagName);
}

/**
 * Special component names that are NOT custom user components
 */
export const SPECIAL_COMPONENTS = new Set([
  'Command', 'Markdown', 'XmlBlock', 'Agent', 'SpawnAgent', 'Assign', 'AssignGroup', 'If', 'Else', 'Loop', 'OnStatus',
  'Skill', 'SkillFile', 'SkillStatic', 'ReadState', 'WriteState',
  'MCPServer', 'MCPStdioServer', 'MCPHTTPServer', 'MCPConfig', 'State', 'Operation', 'Table', 'List',
  // Semantic workflow components
  'ExecutionContext', 'SuccessCriteria', 'OfferNext', 'XmlSection',
  // Swarm components
  'TaskDef', 'TaskPipeline', 'Team', 'Teammate', 'Prompt', 'ShutdownSequence',
  'DeviationRules', 'CommitRules', 'WaveExecution', 'CheckpointHandling',
  // Step workflow primitive
  'Step',
  // Code block primitives
  'Bash',
  // File reading
  'ReadFiles',
  // Template primitives
  'PromptTemplate',
  // Agent contract composites (emit as XmlBlock directly, no import needed)
  'Role', 'UpstreamInput', 'DownstreamConsumer', 'Methodology',
  // Swarm components
  'TaskDef', 'TaskPipeline', 'Team', 'Teammate', 'Prompt',
]);

/**
 * Check if a tag name represents a custom user-defined component
 *
 * Custom components:
 * - Are NOT HTML elements
 * - Are NOT special components (Command, Markdown)
 * - Start with uppercase (React convention)
 */
export function isCustomComponent(tagName: string): boolean {
  if (HTML_ELEMENTS.has(tagName)) return false;
  if (SPECIAL_COMPONENTS.has(tagName)) return false;
  // React convention: custom components start with uppercase
  return /^[A-Z]/.test(tagName);
}

/**
 * Validate that a string is a valid XML tag name
 * Per XML 1.0 spec (simplified): starts with letter or underscore,
 * followed by letters, digits, underscores, hyphens, or periods.
 * Cannot start with 'xml' (case-insensitive).
 */
const XML_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_.\-]*$/;

export function isValidXmlName(name: string): boolean {
  if (!name) return false;
  if (!XML_NAME_REGEX.test(name)) return false;
  if (name.toLowerCase().startsWith('xml')) return false;
  return true;
}

// ============================================================================
// Text Node Utilities
// ============================================================================

/**
 * Trim leading/trailing whitespace from boundary text nodes in an inline array
 * Modifies the array in place by trimming first and last text nodes
 * Preserves internal spacing between inline elements
 */
export function trimBoundaryTextNodes(inlines: InlineNode[]): void {
  if (inlines.length === 0) return;

  // Trim leading whitespace from first text node
  const first = inlines[0];
  if (first.kind === 'text') {
    first.value = first.value.trimStart();
    if (!first.value) {
      inlines.shift();
    }
  }

  if (inlines.length === 0) return;

  // Trim trailing whitespace from last text node
  const last = inlines[inlines.length - 1];
  if (last.kind === 'text') {
    last.value = last.value.trimEnd();
    if (!last.value) {
      inlines.pop();
    }
  }
}

// ============================================================================
// Inline Node Transformation
// ============================================================================

/**
 * Transform a list of nodes to inline nodes
 * Used by transformMixedChildren for inline accumulation
 *
 * This is a helper that doesn't recurse - it only handles basic inline elements.
 * More complex inline transformations should use the dispatch mechanism.
 */
export function transformInlineNodes(
  nodes: Node[],
  ctx: TransformContext,
  transformInlineElement: (name: string, node: Node) => InlineNode | null
): InlineNode[] {
  const result: InlineNode[] = [];

  for (const node of nodes) {
    if (Node.isJsxText(node)) {
      const text = extractText(node);
      if (text) {
        result.push({ kind: 'text', value: text });
      }
    } else if (Node.isJsxElement(node)) {
      const name = getElementName(node);
      const inlineNode = transformInlineElement(name, node);
      if (inlineNode) result.push(inlineNode);
    } else if (Node.isJsxSelfClosingElement(node)) {
      // Handle self-closing inline elements (like <br />)
      const name = getElementName(node);
      if (name === 'br') {
        result.push({ kind: 'lineBreak' });
      }
    } else if (Node.isJsxExpression(node)) {
      // Handle JSX expressions - delegate to context's error handler
      const expr = node.getExpression();
      if (!expr) {
        continue; // Empty expression {}
      }

      throw ctx.createError(
        'JSX expressions in inline context not yet supported',
        node
      );
    }
  }

  return result;
}

/**
 * Transform mixed children (inline + block elements)
 * Consecutive inline elements and text are wrapped in a single paragraph
 * Block elements are transformed normally
 *
 * NOTE: This function imports dispatchBlockTransform to avoid circular dependencies.
 * Individual transformer modules should import from dispatch.ts.
 */
export function transformMixedChildren(
  jsxChildren: Node[],
  ctx: TransformContext,
  transformToBlock: (child: Node) => BlockNode | null,
  transformInlineElement: (name: string, node: Node) => InlineNode | null
): BlockNode[] {
  const blocks: BlockNode[] = [];
  let inlineAccumulator: Node[] = [];

  const flushInline = () => {
    if (inlineAccumulator.length > 0) {
      // Transform accumulated inline content as a paragraph
      const inlineNodes = transformInlineNodes(inlineAccumulator, ctx, transformInlineElement);
      if (inlineNodes.length > 0) {
        blocks.push({ kind: 'paragraph', children: inlineNodes });
      }
      inlineAccumulator = [];
    }
  };

  for (const child of jsxChildren) {
    // Check if this is an inline element or text
    if (Node.isJsxText(child)) {
      const text = extractText(child);
      if (text) {
        inlineAccumulator.push(child);
      }
      // Skip whitespace-only text if accumulator is empty
    } else if (Node.isJsxElement(child)) {
      const name = getElementName(child);
      if (isInlineElement(name)) {
        // Inline element - accumulate
        inlineAccumulator.push(child);
      } else {
        // Block element
        // Flush any accumulated inline content before block element
        flushInline();
        // Transform block element
        const block = transformToBlock(child);
        if (block) blocks.push(block);
      }
    } else if (Node.isJsxExpression(child)) {
      // JSX expressions treated as inline
      inlineAccumulator.push(child);
    }
  }

  // Flush remaining inline content
  flushInline();

  return blocks;
}
