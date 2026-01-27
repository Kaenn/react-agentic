/**
 * Central transform dispatcher
 *
 * Prevents circular imports by providing a single entry point
 * for recursive transform calls. Individual transformer modules
 * import transformBlockChildren and transformToBlock instead of each other.
 */

import { Node, JsxElement, JsxSelfClosingElement } from 'ts-morph';
import type { BlockNode } from '../../ir/index.js';
import type { TransformContext } from './types.js';
import { getElementName, extractText } from '../utils/index.js';
import { isCustomComponent } from './shared.js';

// Import all transform functions from modules
import { transformList, transformBlockquote, transformCodeBlock, transformDiv } from './html.js';
import { transformTable, transformPropList, transformExecutionContext, transformSuccessCriteria, transformOfferNext, transformXmlSection, transformXmlWrapper } from './semantic.js';
import { transformIf, transformElse, transformLoop, transformOnStatus } from './control.js';
import { transformSpawnAgent } from './spawner.js';
import { transformAssign, transformAssignGroup } from './variables.js';
import { transformReadState, transformWriteState } from './state.js';
import { transformStep, transformBash, transformReadFiles, transformPromptTemplate } from './primitives.js';
import { transformMarkdown, transformXmlBlock, transformCustomComponent } from './markdown.js';
import { transformInlineChildren } from './inline.js';

/**
 * Transform a JSX node to BlockNode
 * Called by various transformer modules for recursive transformation
 */
export function transformToBlock(node: Node, ctx: TransformContext): BlockNode | null {
  if (Node.isJsxText(node)) {
    // Whitespace-only text between block elements - skip
    const text = extractText(node);
    if (!text) return null;
    // Standalone text becomes paragraph
    return { kind: 'paragraph', children: [{ kind: 'text', value: text }] };
  }

  if (Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)) {
    const name = getElementName(node);
    return transformElement(name, node, ctx);
  }

  return null; // JsxExpression etc - handle later
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

  // Markdown passthrough
  if (name === 'Markdown') {
    return transformMarkdown(node, ctx);
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
