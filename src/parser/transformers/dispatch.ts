/**
 * Central transform dispatcher
 *
 * Prevents circular imports by providing a single entry point
 * for recursive transform calls. Individual transformer modules
 * import transformBlockChildren and transformToBlock instead of each other.
 */

import { Node, JsxElement, JsxSelfClosingElement, TemplateExpression } from 'ts-morph';
import type { BlockNode } from '../../ir/index.js';
import type { TransformContext } from './types.js';
import { getElementName, extractText } from '../utils/index.js';
import { isCustomComponent, extractTemplateContent } from './shared.js';

// Import all transform functions from modules
import { transformList, transformBlockquote, transformCodeBlock, transformDiv } from './html.js';
import { transformTable, transformPropList, transformExecutionContext, transformSuccessCriteria, transformOfferNext, transformXmlSection, transformXmlWrapper } from './semantic.js';
import { transformIf, transformElse, transformLoop, transformOnStatus, transformOnStatusDefault } from './control.js';
import { transformSpawnAgent } from './spawner.js';
import { transformAssign, transformAssignGroup } from './variables.js';
import { transformReadState, transformWriteState } from './state.js';
import { transformStep, transformBash, transformReadFiles, transformPromptTemplate } from './primitives.js';
import { transformMarkdown, transformXmlBlock, transformCustomComponent } from './markdown.js';
import { transformInlineChildren } from './inline.js';
import {
  transformStructuredReturns,
  isContractComponent,
} from './contract.js';
import { transformTaskDef, transformTaskPipeline, transformTeam, transformShutdownSequence } from './swarm.js';

/**
 * Extract raw markdown text from JSX text node, preserving newlines
 * Uses source file positions to bypass JSX whitespace normalization
 */
function extractRawMarkdownText(node: Node): string | null {
  if (!Node.isJsxText(node)) return null;

  // Use raw source text extraction to bypass JSX whitespace normalization
  const sourceFile = node.getSourceFile();
  const text = sourceFile.getFullText().slice(node.getStart(), node.getEnd());

  // For single-line content, use standard normalization (inline text)
  if (!text.includes('\n')) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    return normalized || null;
  }

  // Multi-line content: preserve newlines, dedent, and clean up
  const lines = text.split('\n');

  // Find minimum indentation (ignoring empty lines and first line)
  let minIndent = Infinity;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length > 0) {
      const leadingSpaces = line.match(/^[ \t]*/)?.[0].length ?? 0;
      minIndent = Math.min(minIndent, leadingSpaces);
    }
  }
  if (minIndent === Infinity) minIndent = 0;

  // Dedent all lines (except first line which has no indent from opening tag)
  const dedented = lines.map((line, i) => {
    if (line.trim().length === 0) return '';
    if (i === 0) return line;
    return line.slice(minIndent);
  });

  // Join and clean up
  let result = dedented.join('\n').replace(/\n{3,}/g, '\n\n');

  // Remove ONLY the first newline after opening tag (not intentional blank lines)
  // Use [ \t]* instead of \s* to avoid matching multiple newlines
  result = result.replace(/^[ \t]*\n/, '');

  // Preserve trailing newline as content separator
  // (emitter will handle stripping final newline before closing tag)
  result = result.trimEnd();
  // Add back ONE trailing newline if there was content
  if (result) {
    result += '\n';
  }

  return result || null;
}

/**
 * Transform a JSX node to BlockNode
 * Called by various transformer modules for recursive transformation
 */
export function transformToBlock(node: Node, ctx: TransformContext): BlockNode | null {
  if (Node.isJsxText(node)) {
    // Use raw source extraction to preserve newlines in markdown content
    const text = extractRawMarkdownText(node);
    if (!text) return null;

    // Multi-line content becomes raw block (preserves newlines)
    // Single-line content becomes paragraph (inline text)
    if (text.includes('\n')) {
      return { kind: 'raw', content: text };
    }
    return { kind: 'paragraph', children: [{ kind: 'text', value: text }] };
  }

  if (Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)) {
    const name = getElementName(node);
    return transformElement(name, node, ctx);
  }

  // Handle JSX expressions: {`template`}, {"string"}, etc.
  if (Node.isJsxExpression(node)) {
    const expr = node.getExpression();
    if (expr) {
      let content: string | null = null;

      if (Node.isStringLiteral(expr)) {
        content = expr.getLiteralValue();
      } else if (Node.isNoSubstitutionTemplateLiteral(expr)) {
        // Use getText() and strip backticks to preserve raw content including backslashes
        // getLiteralValue() interprets escape sequences which loses backslashes
        const text = expr.getText();
        content = text.slice(1, -1); // Remove surrounding backticks
      } else if (Node.isTemplateExpression(expr)) {
        content = extractTemplateContent(expr);
      }

      if (content !== null) {
        // Add trailing newline if content doesn't end with one
        // This ensures proper separation from following content
        if (!content.endsWith('\n')) {
          content += '\n';
        }
        // Return raw content block
        return { kind: 'raw', content };
      }
    }
  }

  return null; // Other expressions not yet handled
}

/**
 * Route element transformation based on tag name
 */
function transformElement(
  name: string,
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): BlockNode | null {
  // Heading elements
  const headingMatch = name.match(/^h([1-6])$/);
  if (headingMatch) {
    const level = parseInt(headingMatch[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
    const children = Node.isJsxElement(node)
      ? transformInlineChildren(node, ctx)
      : [];
    return { kind: 'heading', level, children };
  }

  // Paragraph
  if (name === 'p') {
    const children = Node.isJsxElement(node)
      ? transformInlineChildren(node, ctx)
      : [];
    return { kind: 'paragraph', children };
  }

  // Self-closing hr
  if (name === 'hr') {
    return { kind: 'thematicBreak' };
  }

  // Unordered list
  if (name === 'ul') {
    return transformList(node, false, ctx);
  }

  // Ordered list
  if (name === 'ol') {
    return transformList(node, true, ctx);
  }

  // Blockquote
  if (name === 'blockquote') {
    return transformBlockquote(node, ctx);
  }

  // Code block (pre containing code)
  if (name === 'pre') {
    return transformCodeBlock(node, ctx);
  }

  // XML block via div with name attribute
  if (name === 'div') {
    return transformDiv(node, ctx);
  }

  // XmlBlock component
  if (name === 'XmlBlock') {
    return transformXmlBlock(node, ctx);
  }

  // SpawnAgent block element (inside Command)
  if (name === 'SpawnAgent') {
    return transformSpawnAgent(node, ctx);
  }

  // Assign block element (variable assignment)
  if (name === 'Assign') {
    return transformAssign(node, ctx);
  }

  // AssignGroup block element (grouped variable assignments)
  if (name === 'AssignGroup') {
    return transformAssignGroup(node, ctx);
  }

  // If component - conditional block
  if (name === 'If') {
    return transformIf(node, ctx);
  }

  // Else component - standalone is an error (must follow If as sibling)
  if (name === 'Else') {
    throw ctx.createError('<Else> must follow <If> as sibling', node);
  }

  // Loop component - iteration block
  if (name === 'Loop') {
    return transformLoop(node, ctx);
  }

  // OnStatus component - status-based conditional block
  if (name === 'OnStatus') {
    return transformOnStatus(node, ctx);
  }

  // OnStatusDefault component - standalone is an error (must follow OnStatus as sibling OR have output prop)
  if (name === 'OnStatusDefault') {
    // Allow with explicit output prop
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;
    const hasOutputProp = openingElement.getAttribute('output');
    if (!hasOutputProp) {
      throw ctx.createError('<OnStatusDefault> must follow <OnStatus> as sibling or provide output prop', node);
    }
    return transformOnStatusDefault(node, ctx);
  }

  // ReadState component - read state from registry
  if (name === 'ReadState') {
    return transformReadState(node, ctx);
  }

  // WriteState component - write state to registry
  if (name === 'WriteState') {
    return transformWriteState(node, ctx);
  }

  // Table component - structured props
  if (name === 'Table') {
    return transformTable(node, ctx);
  }

  // List component - structured props
  if (name === 'List') {
    return transformPropList(node, ctx);
  }

  // Semantic workflow components
  if (name === 'ExecutionContext') {
    return transformExecutionContext(node, ctx);
  }

  if (name === 'SuccessCriteria') {
    return transformSuccessCriteria(node, ctx);
  }

  if (name === 'OfferNext') {
    return transformOfferNext(node, ctx);
  }

  if (name === 'XmlSection') {
    return transformXmlSection(node, ctx);
  }

  if (name === 'DeviationRules' || name === 'CommitRules' || name === 'WaveExecution' || name === 'CheckpointHandling') {
    return transformXmlWrapper(name, node, ctx);
  }

  // Step workflow primitive
  if (name === 'Step') {
    return transformStep(node, ctx);
  }

  // Bash code block primitive
  if (name === 'Bash') {
    return transformBash(node, ctx);
  }

  // ReadFiles - batch file reading
  if (name === 'ReadFiles') {
    return transformReadFiles(node, ctx);
  }

  // PromptTemplate - wrap content in markdown code fence
  if (name === 'PromptTemplate') {
    return transformPromptTemplate(node, ctx);
  }

  // Contract components (inside Agent)
  // Role, UpstreamInput, DownstreamConsumer, Methodology are composites that wrap XmlBlock.
  // We handle them directly here to avoid requiring imports.
  if (name === 'Role') {
    const children = Node.isJsxElement(node)
      ? transformBlockChildren(node.getJsxChildren(), ctx)
      : [];
    return { kind: 'xmlBlock', name: 'role', children: children as import('../../ir/nodes.js').BaseBlockNode[] };
  }
  if (name === 'UpstreamInput') {
    const children = Node.isJsxElement(node)
      ? transformBlockChildren(node.getJsxChildren(), ctx)
      : [];
    return { kind: 'xmlBlock', name: 'upstream_input', children: children as import('../../ir/nodes.js').BaseBlockNode[] };
  }
  if (name === 'DownstreamConsumer') {
    const children = Node.isJsxElement(node)
      ? transformBlockChildren(node.getJsxChildren(), ctx)
      : [];
    return { kind: 'xmlBlock', name: 'downstream_consumer', children: children as import('../../ir/nodes.js').BaseBlockNode[] };
  }
  if (name === 'Methodology') {
    const children = Node.isJsxElement(node)
      ? transformBlockChildren(node.getJsxChildren(), ctx)
      : [];
    return { kind: 'xmlBlock', name: 'methodology', children: children as import('../../ir/nodes.js').BaseBlockNode[] };
  }
  if (name === 'StructuredReturns') {
    return transformStructuredReturns(node, ctx);
  }
  if (name === 'ReturnStatus' || name === 'StatusReturn') {
    // ReturnStatus/StatusReturn outside StructuredReturns - this is handled by StructuredReturns transformer
    // If we get here, it means the component was used outside StructuredReturns
    throw ctx.createError(`${name} component can only be used inside StructuredReturns`, node);
  }

  // Markdown passthrough
  if (name === 'Markdown') {
    return transformMarkdown(node, ctx);
  }

  // Swarm components
  if (name === 'TaskDef') {
    return transformTaskDef(node, ctx);
  }
  if (name === 'TaskPipeline') {
    return transformTaskPipeline(node, ctx);
  }
  if (name === 'Team') {
    return transformTeam(node, ctx);
  }
  if (name === 'Teammate') {
    throw ctx.createError('Teammate must be used inside a Team component', node);
  }
  if (name === 'Prompt') {
    throw ctx.createError('Prompt must be used inside a Teammate component', node);
  }
  if (name === 'ShutdownSequence') {
    return transformShutdownSequence(node, ctx);
  }

  // Custom component composition
  if (isCustomComponent(name)) {
    return transformCustomComponent(name, node, ctx);
  }

  throw ctx.createError(`Unsupported block element: <${name}>`, node);
}

/**
 * Transform JSX children to BlockNodes, handling If/Else sibling pairs
 *
 * This is the main workhorse for transforming arrays of JSX children.
 * It handles:
 * - Filtering out whitespace-only text nodes
 * - Pairing If/Else siblings (Else must immediately follow If)
 * - Dispatching each child to appropriate transformer
 * - Skipping null results (filtered nodes)
 * - Children substitution for component composition
 */
export function transformBlockChildren(
  jsxChildren: Node[],
  ctx: TransformContext
): BlockNode[] {
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < jsxChildren.length) {
    const child = jsxChildren[i];

    // Skip whitespace-only text
    if (Node.isJsxText(child)) {
      const text = extractText(child);
      if (!text) {
        i++;
        continue;
      }
    }

    // Handle {children} or {props.children} expressions at block level
    if (Node.isJsxExpression(child)) {
      const expr = child.getExpression();
      if (expr) {
        const text = expr.getText();
        // Check for {children} or {props.children} - return the pre-transformed blocks
        if ((text === 'children' || text === 'props.children') && ctx.componentChildren) {
          blocks.push(...ctx.componentChildren);
          i++;
          continue;
        }
      }
      // Fall through to transformToBlock for other expressions
    }

    if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
      const childName = getElementName(child);

      if (childName === 'If') {
        // Transform If
        const ifNode = transformIf(child, ctx);
        blocks.push(ifNode);

        // Check for Else sibling
        let nextIndex = i + 1;
        while (nextIndex < jsxChildren.length) {
          const sibling = jsxChildren[nextIndex];
          // Skip whitespace-only text
          if (Node.isJsxText(sibling)) {
            const text = extractText(sibling);
            if (!text) {
              nextIndex++;
              continue;
            }
          }
          // Check if next non-whitespace is Else
          if ((Node.isJsxElement(sibling) || Node.isJsxSelfClosingElement(sibling))
              && getElementName(sibling) === 'Else') {
            const elseNode = transformElse(sibling, ctx);
            blocks.push(elseNode);
            i = nextIndex; // Skip past Else in outer loop
          }
          break;
        }
      } else if (childName === 'OnStatus') {
        // Transform OnStatus
        const onStatusNode = transformOnStatus(child, ctx);
        blocks.push(onStatusNode);

        // Check for OnStatusDefault sibling
        let nextIndex = i + 1;
        while (nextIndex < jsxChildren.length) {
          const sibling = jsxChildren[nextIndex];
          // Skip whitespace-only text
          if (Node.isJsxText(sibling)) {
            const text = extractText(sibling);
            if (!text) {
              nextIndex++;
              continue;
            }
          }
          // Check if next non-whitespace is OnStatusDefault
          if ((Node.isJsxElement(sibling) || Node.isJsxSelfClosingElement(sibling))
              && getElementName(sibling) === 'OnStatusDefault') {
            const onStatusDefaultNode = transformOnStatusDefault(sibling, ctx, onStatusNode.outputRef);
            blocks.push(onStatusDefaultNode);
            i = nextIndex; // Skip past OnStatusDefault in outer loop
          }
          break;
        }
      } else {
        const block = transformToBlock(child, ctx);
        if (block) blocks.push(block);
      }
    } else {
      const block = transformToBlock(child, ctx);
      if (block) blocks.push(block);
    }

    i++;
  }

  return blocks;
}
