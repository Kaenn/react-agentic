/**
 * V3 Central Transform Dispatcher
 *
 * Routes JSX elements to appropriate V3 transformers.
 * Delegates unchanged elements (headings, lists, etc.) to v1 transformers.
 */

import { Node, JsxElement, JsxSelfClosingElement, JsxFragment } from 'ts-morph';
import type { V3BlockNode, V3DocumentNode } from '../../ir/index.js';
import type { V3TransformContext } from './types.js';
import { getElementName, extractText, getAttributeValue, camelToKebab, getStringArrayAttribute } from './utils.js';
import type { XmlBlockNode } from '../../../ir/nodes.js';

// V3 transformers
import { transformV3If, transformV3Else, transformV3Loop, transformBreak, transformReturn } from './control.js';
import { transformRuntimeCall, isRuntimeFnCall } from './runtime-call.js';
import { transformAskUser } from './ask-user.js';
import { transformV3SpawnAgent } from './spawner.js';

// V3 inline transformer for ScriptVar interpolation
import { transformV3InlineChildren } from './inline.js';

// V1 transformers for shared elements
import { transformList, transformBlockquote, transformCodeBlock } from '../../../parser/transformers/html.js';
import { transformTable, transformXmlSection, transformXmlWrapper } from '../../../parser/transformers/semantic.js';
import { transformXmlBlock, transformMarkdown } from '../../../parser/transformers/markdown.js';
import type { TransformContext } from '../../../parser/transformers/types.js';
import type { BlockNode, GroupNode } from '../../../ir/nodes.js';

// ============================================================================
// Fragment Handling
// ============================================================================

/**
 * Transform children of a JSX Fragment (<>...</>)
 * Handles If/Else sibling pairing via dedicated helper
 */
function transformFragmentChildren(
  fragment: JsxFragment,
  ctx: V3TransformContext
): V3BlockNode[] {
  return transformChildArray(fragment.getJsxChildren(), ctx);
}

/**
 * Transform an array of JSX children to V3BlockNodes, handling If/Else sibling pairs
 */
function transformChildArray(
  jsxChildren: Node[],
  ctx: V3TransformContext
): V3BlockNode[] {
  const blocks: V3BlockNode[] = [];
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
      blocks.push({ kind: 'paragraph', children: [{ kind: 'text', value: text }] });
      i++;
      continue;
    }

    if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
      const childName = getElementName(child);

      // Handle If with potential Else sibling
      if (childName === 'If' || childName === 'V3If') {
        const ifNode = transformV3If(child, ctx, transformV3BlockChildrenWrapper);
        blocks.push(ifNode);

        // Check for Else sibling
        let nextIndex = i + 1;
        while (nextIndex < jsxChildren.length) {
          const sibling = jsxChildren[nextIndex];

          // Skip whitespace
          if (Node.isJsxText(sibling)) {
            const text = extractText(sibling);
            if (!text) {
              nextIndex++;
              continue;
            }
          }

          // Check if next non-whitespace is Else
          if ((Node.isJsxElement(sibling) || Node.isJsxSelfClosingElement(sibling))) {
            const siblingName = getElementName(sibling);
            if (siblingName === 'Else' || siblingName === 'V3Else') {
              const elseNode = transformV3Else(sibling, ctx, transformV3BlockChildrenWrapper);
              blocks.push(elseNode);
              i = nextIndex;
            }
          }
          break;
        }
      } else {
        const block = transformV3Element(child, ctx);
        if (block) blocks.push(block);
      }
    } else if (Node.isJsxExpression(child)) {
      const block = transformToV3Block(child, ctx);
      if (block) blocks.push(block);
    }

    i++;
  }

  return blocks;
}

/**
 * Wrapper to match the expected signature for control transformer callbacks
 */
function transformV3BlockChildrenWrapper(
  parent: JsxElement,
  ctx: V3TransformContext
): V3BlockNode[] {
  return transformChildArray(parent.getJsxChildren(), ctx);
}

// ============================================================================
// Context Adaptation
// ============================================================================

/**
 * Adapt V3 context to V1 context for shared transformers
 *
 * V1 transformers expect the v1 TransformContext, so we create
 * a compatible adapter that maps V3 fields.
 */
function adaptToV1Context(v3Ctx: V3TransformContext): TransformContext {
  return {
    sourceFile: v3Ctx.sourceFile,
    visitedPaths: v3Ctx.visitedPaths,
    variables: new Map(), // V3 uses scriptVars, not variables
    outputs: new Map(),
    stateRefs: new Map(),
    renderPropsContext: undefined,
    createError: v3Ctx.createError,
  };
}

// ============================================================================
// V3 Div Transformer
// ============================================================================

/**
 * Transform div element using V3 transformers for children
 *
 * - div without name attribute: creates GroupNode (tight spacing via '\n' not '\n\n')
 * - div with name attribute: creates XmlBlockNode with wrapper tags
 */
function transformV3Div(
  node: JsxElement | JsxSelfClosingElement,
  ctx: V3TransformContext
): XmlBlockNode | GroupNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Get name attribute (optional - if missing, create invisible group)
  const nameAttr = getAttributeValue(openingElement, 'name');

  // Transform children using V3 transformers
  const children = Node.isJsxElement(node)
    ? transformV3MixedChildren(node.getJsxChildren(), ctx)
    : [];

  // No name attribute: invisible grouping container with tight spacing
  if (!nameAttr) {
    return {
      kind: 'group',
      children,
    } as GroupNode;
  }

  // Has name attribute: XML block with wrapper tags
  // Validate XML name
  if (!isValidXmlName(nameAttr)) {
    throw ctx.createError(
      `Invalid XML tag name '${nameAttr}' - must start with letter/underscore, contain only letters, digits, underscores, hyphens, or periods, and not start with 'xml'`,
      node
    );
  }

  // Extract other attributes (excluding 'name' which becomes the tag)
  const attributes: Record<string, string> = {};
  for (const attr of openingElement.getAttributes()) {
    if (Node.isJsxAttribute(attr)) {
      const attrName = attr.getNameNode().getText();
      if (attrName !== 'name') {
        const value = getAttributeValue(openingElement, attrName);
        if (value !== undefined) {
          attributes[attrName] = value;
        }
      }
    }
  }

  return {
    kind: 'xmlBlock',
    name: nameAttr,
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    children: children as BlockNode[],
  };
}

/**
 * Inline element set for V3 mixed content handling
 */
const V3_INLINE_ELEMENTS = new Set([
  'a', 'b', 'i', 'strong', 'em', 'code', 'span', 'br',
]);

/**
 * Transform mixed children (inline + block elements) using V3 transformers
 * Consecutive inline elements and text are wrapped in a single paragraph
 * Block elements are transformed using V3 dispatch
 */
function transformV3MixedChildren(
  jsxChildren: Node[],
  ctx: V3TransformContext
): V3BlockNode[] {
  const blocks: V3BlockNode[] = [];
  let inlineAccumulator: Node[] = [];

  const flushInline = () => {
    if (inlineAccumulator.length === 0) return;

    // Create a temporary JsxElement-like wrapper to reuse V3 inline transformer
    // For now, process inline nodes directly
    const inlineNodes: Array<{ kind: 'text'; value: string } | { kind: string; [key: string]: unknown }> = [];

    for (const inlineChild of inlineAccumulator) {
      if (Node.isJsxText(inlineChild)) {
        const text = extractText(inlineChild);
        if (text) {
          inlineNodes.push({ kind: 'text', value: text });
        }
      } else if (Node.isJsxExpression(inlineChild)) {
        const expr = inlineChild.getExpression();
        if (expr && Node.isStringLiteral(expr)) {
          const value = expr.getLiteralValue();
          if (value) {
            inlineNodes.push({ kind: 'text', value });
          }
        }
      } else if (Node.isJsxElement(inlineChild) || Node.isJsxSelfClosingElement(inlineChild)) {
        // For inline elements, extract text content
        const text = extractText(inlineChild);
        if (text) {
          const name = getElementName(inlineChild);
          if (name === 'b' || name === 'strong') {
            inlineNodes.push({ kind: 'bold', children: [{ kind: 'text', value: text }] });
          } else if (name === 'i' || name === 'em') {
            inlineNodes.push({ kind: 'italic', children: [{ kind: 'text', value: text }] });
          } else if (name === 'code') {
            inlineNodes.push({ kind: 'inlineCode', value: text });
          } else {
            inlineNodes.push({ kind: 'text', value: text });
          }
        }
      }
    }

    if (inlineNodes.length > 0) {
      // Trim boundary whitespace
      const first = inlineNodes[0];
      if (first.kind === 'text') {
        const textNode = first as { kind: 'text'; value: string };
        textNode.value = textNode.value.trimStart();
        if (!textNode.value) inlineNodes.shift();
      }

      if (inlineNodes.length > 0) {
        const last = inlineNodes[inlineNodes.length - 1];
        if (last.kind === 'text') {
          const textNode = last as { kind: 'text'; value: string };
          textNode.value = textNode.value.trimEnd();
          if (!textNode.value) inlineNodes.pop();
        }
      }

      if (inlineNodes.length > 0) {
        blocks.push({ kind: 'paragraph', children: inlineNodes as any });
      }
    }

    inlineAccumulator = [];
  };

  for (const child of jsxChildren) {
    // Check if this is an inline element or text
    if (Node.isJsxText(child)) {
      const text = extractText(child);
      if (text) {
        inlineAccumulator.push(child);
      }
      continue;
    }

    if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
      const name = getElementName(child);

      if (V3_INLINE_ELEMENTS.has(name)) {
        // Accumulate inline elements
        inlineAccumulator.push(child);
      } else {
        // Flush any accumulated inline content before block element
        flushInline();
        // Transform block element via V3 dispatch
        const block = transformV3Element(child, ctx);
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

// ============================================================================
// V3 XmlBlock Transformer
// ============================================================================

/**
 * Validate that a string is a valid XML tag name
 */
const XML_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_.\-]*$/;

function isValidXmlName(name: string): boolean {
  if (!name) return false;
  if (!XML_NAME_REGEX.test(name)) return false;
  if (name.toLowerCase().startsWith('xml')) return false;
  return true;
}

/**
 * Transform XmlBlock using V3 transformers for children
 *
 * This is a V3-specific version that uses transformV3BlockChildren
 * instead of v1's transformBlockChildren, so nested V3 components
 * like Init.Call are properly recognized.
 */
function transformV3XmlBlock(
  node: JsxElement | JsxSelfClosingElement,
  ctx: V3TransformContext
): XmlBlockNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Get required name attribute
  const nameAttr = getAttributeValue(openingElement, 'name');
  if (!nameAttr) {
    throw ctx.createError('XmlBlock requires name prop', node);
  }

  // Validate XML name
  if (!isValidXmlName(nameAttr)) {
    throw ctx.createError(
      `Invalid XML tag name '${nameAttr}' - must start with letter/underscore, contain only letters, digits, underscores, hyphens, or periods, and not start with 'xml'`,
      node
    );
  }

  // Transform children using V3 transformers
  const children = Node.isJsxElement(node)
    ? transformV3BlockChildren(node, ctx)
    : [];

  return {
    kind: 'xmlBlock',
    name: nameAttr,
    children: children as any[], // Cast to BlockNode[] for IR compatibility
  };
}

// ============================================================================
// Main Dispatch
// ============================================================================

/**
 * Transform a JSX node to V3BlockNode
 */
export function transformToV3Block(
  node: Node,
  ctx: V3TransformContext
): V3BlockNode | null {
  // Whitespace-only text - skip
  if (Node.isJsxText(node)) {
    const text = extractText(node);
    if (!text) return null;
    // Standalone text becomes paragraph
    return { kind: 'paragraph', children: [{ kind: 'text', value: text }] };
  }

  if (Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)) {
    return transformV3Element(node, ctx);
  }

  // JSX expressions - handle render functions and interpolation
  if (Node.isJsxExpression(node)) {
    const expr = node.getExpression();
    if (expr) {
      // Check for render function pattern: {() => { return (<>...</>) }}
      if (Node.isArrowFunction(expr)) {
        const body = expr.getBody();

        // Block body: { return (...) }
        if (Node.isBlock(body)) {
          // Use object holder for TypeScript control flow
          const holder: { result: V3BlockNode[] | null } = { result: null };

          body.forEachDescendant((descendant, traversal) => {
            if (Node.isReturnStatement(descendant)) {
              const returnExpr = descendant.getExpression();
              if (returnExpr) {
                // Unwrap parentheses
                let inner = returnExpr;
                while (Node.isParenthesizedExpression(inner)) {
                  inner = inner.getExpression();
                }

                // Fragment: <> ... </>
                if (Node.isJsxFragment(inner)) {
                  holder.result = transformFragmentChildren(inner, ctx);
                  traversal.stop();
                } else if (Node.isJsxElement(inner) || Node.isJsxSelfClosingElement(inner)) {
                  const block = transformV3Element(inner, ctx);
                  if (block) holder.result = [block];
                  traversal.stop();
                }
              }
            }
          });

          if (holder.result && holder.result.length > 0) {
            // Return first block if single, otherwise wrap in a group
            if (holder.result.length === 1) {
              return holder.result[0];
            }
            // Multiple blocks - return as group (this is a simplified approach)
            return { kind: 'group', children: holder.result } as V3BlockNode;
          }
        }

        // Expression body: () => <div>...</div>
        let inner = body;
        while (Node.isParenthesizedExpression(inner)) {
          inner = (inner as any).getExpression();
        }

        if (Node.isJsxFragment(inner)) {
          const blocks = transformFragmentChildren(inner, ctx);
          if (blocks.length === 1) return blocks[0];
          return { kind: 'group', children: blocks } as V3BlockNode;
        }

        if (Node.isJsxElement(inner) || Node.isJsxSelfClosingElement(inner)) {
          return transformV3Element(inner, ctx);
        }
      }

      // Not a render function - treat as text with the expression
      // TODO: Handle ScriptVar interpolation properly
      return { kind: 'paragraph', children: [{ kind: 'text', value: `{${expr.getText()}}` }] };
    }
  }

  return null;
}

/**
 * Route element transformation based on tag name
 */
function transformV3Element(
  node: JsxElement | JsxSelfClosingElement,
  ctx: V3TransformContext
): V3BlockNode | null {
  const name = getElementName(node);

  // ============================================================
  // V3-Specific Components
  // ============================================================

  // V3 If component (condition-based)
  if (name === 'If' || name === 'V3If') {
    return transformV3If(node, ctx, transformV3BlockChildren);
  }

  // V3 Else component
  if (name === 'Else' || name === 'V3Else') {
    // Standalone Else is error (must follow If as sibling)
    throw ctx.createError('<Else> must follow <If> as sibling', node);
  }

  // V3 Loop component (bounded)
  if (name === 'Loop' || name === 'V3Loop') {
    return transformV3Loop(node, ctx, transformV3BlockChildren);
  }

  // Break component
  if (name === 'Break') {
    return transformBreak(node, ctx);
  }

  // Return component
  if (name === 'Return') {
    return transformReturn(node, ctx);
  }

  // AskUser component
  if (name === 'AskUser') {
    return transformAskUser(node, ctx);
  }

  // RuntimeFn.Call (e.g., <Init.Call ... />)
  if (isRuntimeFnCall(node, ctx)) {
    return transformRuntimeCall(node, ctx);
  }

  // V3 SpawnAgent (with output capture)
  if (name === 'SpawnAgent') {
    return transformV3SpawnAgent(node, ctx);
  }

  // ============================================================
  // Delegate to V1 Transformers (shared elements)
  // ============================================================

  const v1Ctx = adaptToV1Context(ctx);

  // Headings - use V3 inline transformer for ScriptVar interpolation
  const headingMatch = name.match(/^h([1-6])$/);
  if (headingMatch) {
    const level = parseInt(headingMatch[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
    const children = Node.isJsxElement(node)
      ? transformV3InlineChildren(node, ctx)
      : [];
    return { kind: 'heading', level, children };
  }

  // Paragraph - use V3 inline transformer for ScriptVar interpolation
  if (name === 'p') {
    const children = Node.isJsxElement(node)
      ? transformV3InlineChildren(node, ctx)
      : [];
    return { kind: 'paragraph', children };
  }

  // Thematic break
  if (name === 'hr') {
    return { kind: 'thematicBreak' };
  }

  // Lists
  if (name === 'ul') {
    return transformList(node, false, v1Ctx) as V3BlockNode;
  }
  if (name === 'ol') {
    return transformList(node, true, v1Ctx) as V3BlockNode;
  }

  // Blockquote
  if (name === 'blockquote') {
    return transformBlockquote(node, v1Ctx) as V3BlockNode;
  }

  // Code block
  if (name === 'pre') {
    return transformCodeBlock(node, v1Ctx) as V3BlockNode;
  }

  // Div (XML block or group) - use V3 transformer for proper children handling
  if (name === 'div') {
    return transformV3Div(node, ctx) as V3BlockNode;
  }

  // XmlBlock component - handle directly to use V3 transformers for children
  if (name === 'XmlBlock') {
    return transformV3XmlBlock(node, ctx);
  }

  // ExecutionContext component
  if (name === 'ExecutionContext') {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;
    const paths = getStringArrayAttribute(openingElement, 'paths') ?? [];
    const prefix = getAttributeValue(openingElement, 'prefix') ?? '@';
    const children = Node.isJsxElement(node)
      ? transformV3BlockChildren(node, ctx)
      : [];
    return {
      kind: 'executionContext',
      paths,
      prefix,
      children,
    } as V3BlockNode;
  }

  // Table component
  if (name === 'Table') {
    return transformTable(node, v1Ctx) as V3BlockNode;
  }

  // XmlSection
  if (name === 'XmlSection') {
    return transformXmlSection(node, v1Ctx) as V3BlockNode;
  }

  // XML wrapper components
  if (['DeviationRules', 'CommitRules', 'WaveExecution', 'CheckpointHandling'].includes(name)) {
    return transformXmlWrapper(name, node, v1Ctx) as V3BlockNode;
  }

  // Markdown passthrough
  if (name === 'Markdown') {
    return transformMarkdown(node, v1Ctx) as V3BlockNode;
  }

  throw ctx.createError(`Unsupported V3 element: <${name}>`, node);
}

// ============================================================================
// Children Transformation
// ============================================================================

/**
 * Transform JSX children to V3BlockNodes, handling If/Else sibling pairs
 */
export function transformV3BlockChildren(
  parent: JsxElement,
  ctx: V3TransformContext
): V3BlockNode[] {
  const jsxChildren = parent.getJsxChildren();
  const blocks: V3BlockNode[] = [];
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

      // Handle If with potential Else sibling
      if (childName === 'If' || childName === 'V3If') {
        const ifNode = transformV3If(child, ctx, transformV3BlockChildren);
        blocks.push(ifNode);

        // Check for Else sibling
        let nextIndex = i + 1;
        while (nextIndex < jsxChildren.length) {
          const sibling = jsxChildren[nextIndex];

          // Skip whitespace
          if (Node.isJsxText(sibling)) {
            const text = extractText(sibling);
            if (!text) {
              nextIndex++;
              continue;
            }
          }

          // Check if next non-whitespace is Else
          if ((Node.isJsxElement(sibling) || Node.isJsxSelfClosingElement(sibling))) {
            const siblingName = getElementName(sibling);
            if (siblingName === 'Else' || siblingName === 'V3Else') {
              const elseNode = transformV3Else(sibling, ctx, transformV3BlockChildren);
              blocks.push(elseNode);
              i = nextIndex;
            }
          }
          break;
        }
      } else {
        const block = transformToV3Block(child, ctx);
        if (block) blocks.push(block);
      }
    } else {
      const block = transformToV3Block(child, ctx);
      if (block) blocks.push(block);
    }

    i++;
  }

  return blocks;
}

// ============================================================================
// Document Transformation
// ============================================================================

/**
 * Transform a V3 Command element to V3DocumentNode
 *
 * Supports two patterns:
 * 1. Render props: <Command>{() => { return (<>...</>) }}</Command>
 * 2. Direct children: <Command>...</Command>
 */
export function transformV3Command(
  root: JsxElement | JsxSelfClosingElement,
  ctx: V3TransformContext
): V3DocumentNode {
  // Extract frontmatter from Command props
  const openingElement = Node.isJsxElement(root)
    ? root.getOpeningElement()
    : root;

  const frontmatterData: Record<string, unknown> = {};

  // Get standard Command props
  for (const attr of openingElement.getAttributes()) {
    if (!Node.isJsxAttribute(attr)) continue;

    const name = attr.getNameNode().getText();
    const init = attr.getInitializer();

    if (!init) continue;

    // Convert camelCase prop names to kebab-case for YAML frontmatter
    const yamlKey = camelToKebab(name);

    if (Node.isStringLiteral(init)) {
      frontmatterData[yamlKey] = init.getLiteralValue();
    } else if (Node.isJsxExpression(init)) {
      const expr = init.getExpression();
      if (expr && Node.isStringLiteral(expr)) {
        frontmatterData[yamlKey] = expr.getLiteralValue();
      }
      // Handle array literals for props like allowedTools
      else if (expr && Node.isArrayLiteralExpression(expr)) {
        const values: string[] = [];
        for (const el of expr.getElements()) {
          if (Node.isStringLiteral(el)) {
            values.push(el.getLiteralValue());
          }
        }
        if (values.length > 0) {
          frontmatterData[yamlKey] = values;
        }
      }
    }
  }

  // Transform children - detect render props vs direct JSX
  let children: V3BlockNode[] = [];

  if (Node.isJsxElement(root)) {
    const jsxChildren = root.getJsxChildren();

    // Find first meaningful child (skip whitespace)
    const firstChild = jsxChildren.find(c =>
      !Node.isJsxText(c) || !c.containsOnlyTriviaWhiteSpaces()
    );

    if (firstChild && Node.isJsxExpression(firstChild)) {
      const expr = firstChild.getExpression();
      if (expr && Node.isArrowFunction(expr)) {
        // Render props pattern - extract children from function body
        children = extractRenderPropsChildren(expr, ctx);
      } else {
        // Expression but not arrow function - treat as direct children
        children = transformV3BlockChildren(root, ctx);
      }
    } else {
      // Direct JSX children - no wrapper needed
      children = transformV3BlockChildren(root, ctx);
    }
  }

  // Collect script var declarations
  const scriptVars = Array.from(ctx.scriptVars.values()).map(info => ({
    kind: 'scriptVarDecl' as const,
    varName: info.varName,
    tsType: info.tsType,
  }));

  // Collect used runtime function names
  const runtimeFunctions = Array.from(ctx.usedRuntimeFunctions);

  return {
    kind: 'v3Document',
    frontmatter: Object.keys(frontmatterData).length > 0
      ? { kind: 'v3Frontmatter', data: frontmatterData }
      : undefined,
    scriptVars,
    runtimeFunctions,
    children,
  };
}

/**
 * Extract children from render props arrow function
 *
 * Handles patterns like:
 * - () => { return (<>...</>) }
 * - () => (<>...</>)
 * - () => <div>...</div>
 */
function extractRenderPropsChildren(
  arrowFn: Node,
  ctx: V3TransformContext
): V3BlockNode[] {
  if (!Node.isArrowFunction(arrowFn)) return [];

  const body = arrowFn.getBody();

  // Block body: { return (...) }
  if (Node.isBlock(body)) {
    const holder: { result: V3BlockNode[] | null } = { result: null };

    body.forEachDescendant((descendant, traversal) => {
      if (Node.isReturnStatement(descendant)) {
        const returnExpr = descendant.getExpression();
        if (returnExpr) {
          // Unwrap parentheses
          let inner = returnExpr;
          while (Node.isParenthesizedExpression(inner)) {
            inner = inner.getExpression();
          }

          // Fragment: <> ... </>
          if (Node.isJsxFragment(inner)) {
            holder.result = transformChildArray(inner.getJsxChildren(), ctx);
            traversal.stop();
          } else if (Node.isJsxElement(inner) || Node.isJsxSelfClosingElement(inner)) {
            const block = transformV3Element(inner, ctx);
            if (block) holder.result = [block];
            traversal.stop();
          }
        }
      }
    });

    return holder.result ?? [];
  }

  // Expression body: () => <div>...</div> or () => (<>...</>)
  let inner = body;
  while (Node.isParenthesizedExpression(inner)) {
    inner = (inner as any).getExpression();
  }

  if (Node.isJsxFragment(inner)) {
    return transformChildArray(inner.getJsxChildren(), ctx);
  }

  if (Node.isJsxElement(inner) || Node.isJsxSelfClosingElement(inner)) {
    const block = transformV3Element(inner, ctx);
    return block ? [block] : [];
  }

  return [];
}
