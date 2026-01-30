/**
 * Runtime Central Transform Dispatcher
 *
 * Routes JSX elements to appropriate runtime transformers.
 * Delegates unchanged elements (headings, lists, etc.) to shared transformers.
 */

import { Node, JsxElement, JsxSelfClosingElement, JsxFragment } from 'ts-morph';
import type { BlockNode, DocumentNode, BaseBlockNode } from '../../ir/index.js';
import type { RuntimeTransformContext } from './runtime-types.js';
import { getElementName, extractText, extractMarkdownText, getAttributeValue, camelToKebab, getStringArrayAttribute, isCustomComponent, processIfElseSiblings } from './runtime-utils.js';
import type { XmlBlockNode } from '../../ir/nodes.js';

// Runtime transformers
import { transformRuntimeIf, transformRuntimeElse, transformRuntimeLoop, transformBreak, transformReturn } from './runtime-control.js';
import { transformRuntimeCall, isRuntimeFnCall } from './runtime-call.js';
import { transformAskUser } from './runtime-ask-user.js';
import { transformRuntimeSpawnAgent } from './runtime-spawner.js';
import { transformLocalComponent } from './runtime-component.js';

// Runtime inline transformer for RuntimeVar interpolation
import { transformRuntimeInlineChildren } from './runtime-inline.js';

// Shared element transformers
import { transformList, transformBlockquote, transformCodeBlock } from './html.js';
import { transformTable, transformXmlSection, transformXmlWrapper } from './semantic.js';
import { transformXmlBlock, transformMarkdown } from './markdown.js';
import type { TransformContext } from './types.js';
import type { GroupNode } from '../../ir/nodes.js';

// ============================================================================
// Fragment Handling
// ============================================================================

/**
 * Transform children of a JSX Fragment (<>...</>)
 * Handles If/Else sibling pairing via dedicated helper
 */
function transformFragmentChildren(
  fragment: JsxFragment,
  ctx: RuntimeTransformContext
): BlockNode[] {
  return transformChildArray(fragment.getJsxChildren(), ctx);
}

/**
 * Transform an array of JSX children to BlockNodes, handling If/Else sibling pairs
 */
function transformChildArray(
  jsxChildren: Node[],
  ctx: RuntimeTransformContext
): BlockNode[] {
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < jsxChildren.length) {
    const child = jsxChildren[i];

    // Skip whitespace-only text
    if (Node.isJsxText(child)) {
      const text = extractMarkdownText(child);
      if (!text) {
        i++;
        continue;
      }
      // Multi-line content -> raw markdown, single-line -> paragraph
      if (text.includes('\n')) {
        blocks.push({ kind: 'raw', content: text });
      } else {
        blocks.push({ kind: 'paragraph', children: [{ kind: 'text', value: text }] });
      }
      i++;
      continue;
    }

    if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
      const childName = getElementName(child);

      // Handle If with potential Else sibling
      if (childName === 'If' || childName === 'V3If') {
        const ifNode = transformRuntimeIf(child, ctx, transformRuntimeBlockChildrenWrapper);
        blocks.push(ifNode);

        // Check for Else sibling using helper
        const result = processIfElseSiblings(jsxChildren, i, (elseNode) => {
          const elseBlockNode = transformRuntimeElse(elseNode as JsxElement | JsxSelfClosingElement, ctx, transformRuntimeBlockChildrenWrapper);
          blocks.push(elseBlockNode);
        });
        if (result.hasElse) {
          i = result.nextIndex;
        }
      } else {
        const block = transformRuntimeElement(child, ctx);
        if (block) blocks.push(block);
      }
    } else if (Node.isJsxExpression(child)) {
      const block = transformToRuntimeBlock(child, ctx);
      if (block) blocks.push(block);
    }

    i++;
  }

  return blocks;
}

/**
 * Wrapper to match the expected signature for control transformer callbacks
 */
function transformRuntimeBlockChildrenWrapper(
  parent: JsxElement,
  ctx: RuntimeTransformContext
): BlockNode[] {
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
function adaptToSharedContext(runtimeCtx: RuntimeTransformContext): TransformContext {
  return {
    sourceFile: runtimeCtx.sourceFile,
    visitedPaths: runtimeCtx.visitedPaths,
    variables: new Map(), // V3 uses runtimeVars, not variables
    outputs: new Map(),
    stateRefs: new Map(),
    renderPropsContext: undefined,
    createError: runtimeCtx.createError,
  };
}

// ============================================================================
// Runtime Div Transformer
// ============================================================================

/**
 * Transform div element using V3 transformers for children
 *
 * - div without name attribute: creates GroupNode (tight spacing via '\n' not '\n\n')
 * - div with name attribute: creates XmlBlockNode with wrapper tags
 */
function transformRuntimeDiv(
  node: JsxElement | JsxSelfClosingElement,
  ctx: RuntimeTransformContext
): XmlBlockNode | GroupNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Get name attribute (optional - if missing, create invisible group)
  const nameAttr = getAttributeValue(openingElement, 'name');

  // Transform children using V3 transformers
  const children = Node.isJsxElement(node)
    ? transformRuntimeMixedChildren(node.getJsxChildren(), ctx)
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
    children: children as BaseBlockNode[],
  };
}

/**
 * Inline element set for V3 mixed content handling
 */
const RUNTIME_INLINE_ELEMENTS = new Set([
  'a', 'b', 'i', 'strong', 'em', 'code', 'span', 'br',
]);

/**
 * Transform mixed children (inline + block elements) using V3 transformers
 * All content is accumulated and output as a single raw block to preserve exact structure
 * Block elements are transformed separately using V3 dispatch
 */
function transformRuntimeMixedChildren(
  jsxChildren: Node[],
  ctx: RuntimeTransformContext
): BlockNode[] {
  const blocks: BlockNode[] = [];
  let contentAccumulator: string[] = [];

  // Flush accumulated content as raw block
  const flushContent = () => {
    if (contentAccumulator.length === 0) return;
    const combined = contentAccumulator.join('');
    if (combined.trim()) {
      blocks.push({ kind: 'raw', content: combined });
    }
    contentAccumulator = [];
  };

  // Use index-based iteration to support If/Else sibling lookahead
  let i = 0;
  while (i < jsxChildren.length) {
    const child = jsxChildren[i];

    // Handle JSX text - preserve exact structure
    if (Node.isJsxText(child)) {
      const text = extractMarkdownText(child);
      if (text) {
        contentAccumulator.push(text);
      } else {
        // If text is whitespace-only but contains newlines, and we have accumulated content,
        // preserve newlines to separate lines (e.g., between two JSX expressions)
        // Cap at 2 newlines (one blank line) to avoid excessive whitespace
        // BUT: don't add trailing whitespace if remaining children are only whitespace
        // (this avoids adding formatting newlines between last content and closing tag)
        const rawText = child.getFullText();
        if (rawText.includes('\n') && contentAccumulator.length > 0) {
          // Check if there's more non-whitespace content coming
          const hasMoreContent = jsxChildren.slice(i + 1).some(c => {
            if (Node.isJsxText(c)) {
              return !!extractMarkdownText(c);
            }
            // Any non-text child (expressions, elements) counts as content
            return true;
          });
          if (hasMoreContent) {
            const newlineCount = (rawText.match(/\n/g) || []).length;
            contentAccumulator.push('\n'.repeat(Math.min(newlineCount, 2)));
          }
        }
      }
      i++;
      continue;
    }

    // Handle JSX elements
    if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
      const name = getElementName(child);

      if (RUNTIME_INLINE_ELEMENTS.has(name)) {
        // Inline elements - extract text and accumulate with markdown formatting
        const text = extractText(child);
        if (text) {
          if (name === 'b' || name === 'strong') {
            contentAccumulator.push(`**${text}**`);
          } else if (name === 'i' || name === 'em') {
            contentAccumulator.push(`*${text}*`);
          } else if (name === 'code') {
            contentAccumulator.push(`\`${text}\``);
          } else {
            contentAccumulator.push(text);
          }
        }
      } else if (name === 'If' || name === 'V3If') {
        // Handle If with Else sibling lookahead
        flushContent();
        const ifNode = transformRuntimeIf(child, ctx, transformRuntimeBlockChildren);
        blocks.push(ifNode);

        // Check for Else sibling using helper
        const result = processIfElseSiblings(jsxChildren, i, (elseNode) => {
          const elseBlockNode = transformRuntimeElse(elseNode as JsxElement | JsxSelfClosingElement, ctx, transformRuntimeBlockChildren);
          blocks.push(elseBlockNode);
        });
        if (result.hasElse) {
          i = result.nextIndex;
        }
      } else {
        // Block element - flush accumulated content first
        flushContent();
        // Transform block element via V3 dispatch
        const block = transformRuntimeElement(child, ctx);
        if (block) blocks.push(block);
      }
      i++;
      continue;
    }

    // Handle JSX expressions
    if (Node.isJsxExpression(child)) {
      const expr = child.getExpression();
      if (expr && Node.isStringLiteral(expr)) {
        // String literal - add value directly (handles escapes like {'>'})
        const value = expr.getLiteralValue();
        if (value) {
          contentAccumulator.push(value);
        }
      } else if (expr && Node.isNoSubstitutionTemplateLiteral(expr)) {
        // Template literal without interpolation - add value directly
        const value = expr.getLiteralValue();
        if (value) {
          contentAccumulator.push(value);
        }
      } else if (expr && Node.isTemplateExpression(expr)) {
        // Template literal with interpolation - substitute props if in component context
        const parts: string[] = [];
        parts.push(expr.getHead().getLiteralText());
        for (const span of expr.getTemplateSpans()) {
          const spanExpr = span.getExpression();
          const spanText = spanExpr.getText();

          // Check for prop substitution when in component context
          if (ctx.componentProps) {
            // Handle props.xxx pattern
            if (Node.isPropertyAccessExpression(spanExpr)) {
              const obj = spanExpr.getExpression();
              const propName = spanExpr.getName();
              if (Node.isIdentifier(obj) && obj.getText() === 'props' && ctx.componentProps.has(propName)) {
                const propValue = ctx.componentProps.get(propName);
                parts.push(propValue !== undefined && propValue !== null ? String(propValue) : '');
                parts.push(span.getLiteral().getLiteralText());
                continue;
              }
            }
            // Handle direct identifier (destructured props)
            if (Node.isIdentifier(spanExpr) && ctx.componentProps.has(spanText)) {
              const propValue = ctx.componentProps.get(spanText);
              parts.push(propValue !== undefined && propValue !== null ? String(propValue) : '');
              parts.push(span.getLiteral().getLiteralText());
              continue;
            }
          }

          // Not a prop reference - preserve as ${...}
          parts.push(`\${${spanText}}`);
          parts.push(span.getLiteral().getLiteralText());
        }
        const value = parts.join('');
        if (value) {
          contentAccumulator.push(value);
        }
      } else if (expr) {
        const exprText = expr.getText();

        // Check for children prop substitution: {children} or {props.children}
        if ((exprText === 'children' || exprText === 'props.children') && ctx.componentChildren) {
          // Flush accumulated content first
          flushContent();
          // Insert the component children
          blocks.push(...ctx.componentChildren);
        } else if (ctx.componentProps) {
          // Component prop substitution - check both patterns
          let propValue: unknown = undefined;
          let matched = false;

          // Check props.xxx pattern
          if (Node.isPropertyAccessExpression(expr)) {
            const obj = expr.getExpression();
            const propName = expr.getName();
            if (Node.isIdentifier(obj) && obj.getText() === 'props' && ctx.componentProps.has(propName)) {
              propValue = ctx.componentProps.get(propName);
              matched = true;
            }
          }
          // Check direct identifier (destructured props)
          else if (Node.isIdentifier(expr) && ctx.componentProps.has(exprText)) {
            propValue = ctx.componentProps.get(exprText);
            matched = true;
          }

          if (matched) {
            if (propValue !== undefined && propValue !== null) {
              contentAccumulator.push(String(propValue));
            }
          } else {
            // Not a prop reference - add placeholder syntax
            contentAccumulator.push(`{${exprText}}`);
          }
        } else {
          // Not in component context - add placeholder syntax
          contentAccumulator.push(`{${exprText}}`);
        }
      }
    }

    i++;
  }

  // Flush any remaining content
  flushContent();

  return blocks;
}

// ============================================================================
// Runtime XmlBlock Transformer
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
 * This is a V3-specific version that uses transformRuntimeBlockChildren
 * instead of v1's transformBlockChildren, so nested V3 components
 * like Init.Call are properly recognized.
 */
function transformRuntimeXmlBlock(
  node: JsxElement | JsxSelfClosingElement,
  ctx: RuntimeTransformContext
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

  // Transform children using mixed content handler (handles inline text + expressions properly)
  const children = Node.isJsxElement(node)
    ? transformRuntimeMixedChildren(node.getJsxChildren(), ctx)
    : [];

  return {
    kind: 'xmlBlock',
    name: nameAttr,
    children: children as any[], // Cast to BlockNode[] for IR compatibility
  };
}

// ============================================================================
// Runtime Indent Transformer
// ============================================================================

/**
 * Transform Indent component
 *
 * Indents all children content by specified number of spaces.
 */
function transformRuntimeIndent(
  node: JsxElement | JsxSelfClosingElement,
  ctx: RuntimeTransformContext
): BlockNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Get optional spaces attribute (default: 2)
  const spacesAttr = getAttributeValue(openingElement, 'spaces');
  const spaces = spacesAttr ? parseInt(spacesAttr, 10) : 2;

  if (isNaN(spaces) || spaces < 0) {
    throw ctx.createError('Indent spaces prop must be a non-negative number', node);
  }

  // Transform children using V3 transformers
  const children = Node.isJsxElement(node)
    ? transformRuntimeBlockChildren(node, ctx)
    : [];

  return {
    kind: 'indent',
    spaces,
    children: children as any[],
  };
}

// ============================================================================
// Runtime Code Block Transformer
// ============================================================================

/**
 * Transform code block (pre element) with component prop substitution
 *
 * Uses V3 context to support props.xxx substitution in template literals.
 */
function transformRuntimeCodeBlock(
  node: JsxElement | JsxSelfClosingElement,
  ctx: RuntimeTransformContext
): BlockNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Get optional language attribute
  const language = getAttributeValue(openingElement, 'lang') ||
    getAttributeValue(openingElement, 'language');

  if (Node.isJsxSelfClosingElement(node)) {
    return { kind: 'codeBlock', language, content: '' };
  }

  // Extract code content with prop substitution
  const parts: string[] = [];

  for (const child of node.getJsxChildren()) {
    if (Node.isJsxText(child)) {
      // Get raw text preserving whitespace
      const sourceFile = child.getSourceFile();
      const text = sourceFile.getFullText().slice(child.getStart(), child.getEnd());
      parts.push(text);
    } else if (Node.isJsxExpression(child)) {
      const expr = child.getExpression();
      if (expr) {
        if (Node.isStringLiteral(expr)) {
          parts.push(expr.getLiteralValue());
        } else if (Node.isNoSubstitutionTemplateLiteral(expr)) {
          parts.push(expr.getLiteralValue());
        } else if (Node.isTemplateExpression(expr)) {
          // Template literal with interpolation - substitute props
          const templateParts: string[] = [];
          templateParts.push(expr.getHead().getLiteralText());

          for (const span of expr.getTemplateSpans()) {
            const spanExpr = span.getExpression();
            const spanText = spanExpr.getText();

            // Check for prop substitution when in component context
            if (ctx.componentProps) {
              // Handle props.xxx pattern
              if (Node.isPropertyAccessExpression(spanExpr)) {
                const obj = spanExpr.getExpression();
                const propName = spanExpr.getName();
                if (Node.isIdentifier(obj) && obj.getText() === 'props' && ctx.componentProps.has(propName)) {
                  const propValue = ctx.componentProps.get(propName);
                  templateParts.push(propValue !== undefined && propValue !== null ? String(propValue) : '');
                  templateParts.push(span.getLiteral().getLiteralText());
                  continue;
                }
              }
              // Handle direct identifier (destructured props)
              if (Node.isIdentifier(spanExpr) && ctx.componentProps.has(spanText)) {
                const propValue = ctx.componentProps.get(spanText);
                templateParts.push(propValue !== undefined && propValue !== null ? String(propValue) : '');
                templateParts.push(span.getLiteral().getLiteralText());
                continue;
              }
            }

            // Not a prop reference - preserve as ${...}
            templateParts.push(`\${${spanText}}`);
            templateParts.push(span.getLiteral().getLiteralText());
          }

          parts.push(templateParts.join(''));
        } else {
          // Other expression - render as is
          parts.push(expr.getText());
        }
      }
    }
  }

  // Process the combined content
  let content = parts.join('');

  // Remove leading/trailing newlines that come from JSX formatting
  content = content.replace(/^\n/, '').replace(/\n$/, '');

  // Dedent the content (remove common leading whitespace)
  const lines = content.split('\n');
  if (lines.length > 1) {
    let minIndent = Infinity;
    for (const line of lines) {
      if (line.trim().length > 0) {
        const leadingSpaces = line.match(/^[ \t]*/)?.[0].length ?? 0;
        minIndent = Math.min(minIndent, leadingSpaces);
      }
    }
    if (minIndent !== Infinity && minIndent > 0) {
      content = lines.map(line => line.slice(minIndent)).join('\n');
    }
  }

  return { kind: 'codeBlock', language, content: content };
}

// ============================================================================
// Main Dispatch
// ============================================================================

/**
 * Transform a JSX node to BlockNode
 */
export function transformToRuntimeBlock(
  node: Node,
  ctx: RuntimeTransformContext
): BlockNode | null {
  // Whitespace-only text - skip
  if (Node.isJsxText(node)) {
    const text = extractMarkdownText(node);
    if (!text) return null;
    // Multi-line content -> raw markdown, single-line -> paragraph
    if (text.includes('\n')) {
      return { kind: 'raw', content: text };
    }
    return { kind: 'paragraph', children: [{ kind: 'text', value: text }] };
  }

  if (Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)) {
    return transformRuntimeElement(node, ctx);
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
          const holder: { result: BlockNode[] | null } = { result: null };

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
                  const block = transformRuntimeElement(inner, ctx);
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
            return { kind: 'group', children: holder.result } as BlockNode;
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
          return { kind: 'group', children: blocks } as BlockNode;
        }

        if (Node.isJsxElement(inner) || Node.isJsxSelfClosingElement(inner)) {
          return transformRuntimeElement(inner, ctx);
        }
      }

      // Check if it's a string literal - extract the value directly
      if (Node.isStringLiteral(expr)) {
        const value = expr.getLiteralValue();
        if (value) {
          // Return as raw node - outputs content directly without newlines
          return { kind: 'raw', content: value };
        }
        return null;
      }

      // Not a render function or string literal - treat as text with the expression
      // TODO: Handle RuntimeVar interpolation properly
      return { kind: 'paragraph', children: [{ kind: 'text', value: `{${expr.getText()}}` }] };
    }
  }

  return null;
}

/**
 * Route element transformation based on tag name
 */
function transformRuntimeElement(
  node: JsxElement | JsxSelfClosingElement,
  ctx: RuntimeTransformContext
): BlockNode | null {
  const name = getElementName(node);

  // ============================================================
  // Runtime-Specific Components
  // ============================================================

  // If component (condition-based)
  if (name === 'If' || name === 'V3If') {
    return transformRuntimeIf(node, ctx, transformRuntimeBlockChildren);
  }

  // Else component
  if (name === 'Else' || name === 'V3Else') {
    // Standalone Else is error (must follow If as sibling)
    throw ctx.createError('<Else> must follow <If> as sibling', node);
  }

  // Loop component (bounded)
  if (name === 'Loop' || name === 'V3Loop') {
    return transformRuntimeLoop(node, ctx, transformRuntimeBlockChildren);
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

  // SpawnAgent (with output capture)
  if (name === 'SpawnAgent') {
    return transformRuntimeSpawnAgent(node, ctx);
  }

  // ============================================================
  // Delegate to Shared Transformers (shared elements)
  // ============================================================

  const sharedCtx = adaptToSharedContext(ctx);

  // Headings - use V3 inline transformer for RuntimeVar interpolation
  const headingMatch = name.match(/^h([1-6])$/);
  if (headingMatch) {
    const level = parseInt(headingMatch[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
    const children = Node.isJsxElement(node)
      ? transformRuntimeInlineChildren(node, ctx)
      : [];
    return { kind: 'heading', level, children };
  }

  // Paragraph - use V3 inline transformer for RuntimeVar interpolation
  if (name === 'p') {
    const children = Node.isJsxElement(node)
      ? transformRuntimeInlineChildren(node, ctx)
      : [];
    return { kind: 'paragraph', children };
  }

  // Thematic break
  if (name === 'hr') {
    return { kind: 'thematicBreak' };
  }

  // Lists
  if (name === 'ul') {
    return transformList(node, false, sharedCtx) as BlockNode;
  }
  if (name === 'ol') {
    return transformList(node, true, sharedCtx) as BlockNode;
  }

  // Blockquote
  if (name === 'blockquote') {
    return transformBlockquote(node, sharedCtx) as BlockNode;
  }

  // Code block - use v3 transformer for component prop support
  if (name === 'pre') {
    return transformRuntimeCodeBlock(node, ctx);
  }

  // Div (XML block or group) - use V3 transformer for proper children handling
  if (name === 'div') {
    return transformRuntimeDiv(node, ctx) as BlockNode;
  }

  // XmlBlock component - handle directly to use V3 transformers for children
  if (name === 'XmlBlock') {
    return transformRuntimeXmlBlock(node, ctx);
  }

  // ExecutionContext component
  if (name === 'ExecutionContext') {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;
    const paths = getStringArrayAttribute(openingElement, 'paths') ?? [];
    const prefix = getAttributeValue(openingElement, 'prefix') ?? '@';
    const children = Node.isJsxElement(node)
      ? transformRuntimeBlockChildren(node, ctx)
      : [];
    return {
      kind: 'executionContext',
      paths,
      prefix,
      children,
    } as BlockNode;
  }

  // Table component
  if (name === 'Table') {
    return transformTable(node, sharedCtx) as BlockNode;
  }

  // XmlSection
  if (name === 'XmlSection') {
    return transformXmlSection(node, sharedCtx) as BlockNode;
  }

  // XML wrapper components
  if (['DeviationRules', 'CommitRules', 'WaveExecution', 'CheckpointHandling'].includes(name)) {
    return transformXmlWrapper(name, node, sharedCtx) as BlockNode;
  }

  // Markdown passthrough
  if (name === 'Markdown') {
    return transformMarkdown(node, sharedCtx) as BlockNode;
  }

  // Indent component - indents children by specified spaces
  if (name === 'Indent') {
    return transformRuntimeIndent(node, ctx);
  }

  // Check for local component (same-file function components)
  if (isCustomComponent(name) && ctx.localComponents.has(name)) {
    const result = transformLocalComponent(node, ctx, transformRuntimeBlockChildren);
    if (result) {
      // If array, return first element (or wrap in group)
      if (Array.isArray(result)) {
        if (result.length === 1) return result[0];
        return { kind: 'group', children: result } as BlockNode;
      }
      return result;
    }
  }

  throw ctx.createError(`Unsupported V3 element: <${name}>`, node);
}

// ============================================================================
// Children Transformation
// ============================================================================

/**
 * Transform JSX children to BlockNodes, handling If/Else sibling pairs
 */
export function transformRuntimeBlockChildren(
  parent: JsxElement,
  ctx: RuntimeTransformContext
): BlockNode[] {
  const jsxChildren = parent.getJsxChildren();
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

      // Handle If with potential Else sibling
      if (childName === 'If' || childName === 'V3If') {
        const ifNode = transformRuntimeIf(child, ctx, transformRuntimeBlockChildren);
        blocks.push(ifNode);

        // Check for Else sibling using helper
        const siblingResult = processIfElseSiblings(jsxChildren, i, (elseNode) => {
          const elseBlock = transformRuntimeElse(
            elseNode as JsxElement | JsxSelfClosingElement,
            ctx,
            transformRuntimeBlockChildren
          );
          blocks.push(elseBlock);
        });
        if (siblingResult.hasElse) {
          i = siblingResult.nextIndex;
        }
      } else {
        const block = transformToRuntimeBlock(child, ctx);
        if (block) blocks.push(block);
      }
    } else {
      const block = transformToRuntimeBlock(child, ctx);
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
 * Transform a V3 Command element to DocumentNode
 *
 * Supports two patterns:
 * 1. Render props: <Command>{() => { return (<>...</>) }}</Command>
 * 2. Direct children: <Command>...</Command>
 */
export function transformRuntimeCommand(
  root: JsxElement | JsxSelfClosingElement,
  ctx: RuntimeTransformContext
): DocumentNode {
  // Extract frontmatter from Command props
  const openingElement = Node.isJsxElement(root)
    ? root.getOpeningElement()
    : root;

  const frontmatterData: Record<string, unknown> = {};
  let folder: string | undefined;

  // Get standard Command props
  for (const attr of openingElement.getAttributes()) {
    if (!Node.isJsxAttribute(attr)) continue;

    const name = attr.getNameNode().getText();
    const init = attr.getInitializer();

    if (!init) continue;

    // Skip 'folder' - it's metadata, not frontmatter
    if (name === 'folder') {
      if (Node.isStringLiteral(init)) {
        folder = init.getLiteralValue();
      } else if (Node.isJsxExpression(init)) {
        const expr = init.getExpression();
        if (expr && Node.isStringLiteral(expr)) {
          folder = expr.getLiteralValue();
        }
      }
      continue;
    }

    // Convert camelCase prop names to kebab-case for YAML frontmatter
    const yamlKey = camelToKebab(name);

    if (Node.isStringLiteral(init)) {
      frontmatterData[yamlKey] = init.getLiteralValue();
    } else if (Node.isJsxExpression(init)) {
      const expr = init.getExpression();
      if (expr && Node.isStringLiteral(expr)) {
        frontmatterData[yamlKey] = expr.getLiteralValue();
      }
      // Handle array literals for props like allowedTools or arguments
      else if (expr && Node.isArrayLiteralExpression(expr)) {
        const values: (string | Record<string, unknown>)[] = [];
        for (const el of expr.getElements()) {
          if (Node.isStringLiteral(el)) {
            values.push(el.getLiteralValue());
          } else if (Node.isObjectLiteralExpression(el)) {
            // Handle object literals in arrays (e.g., arguments array)
            const obj: Record<string, unknown> = {};
            for (const prop of el.getProperties()) {
              if (Node.isPropertyAssignment(prop)) {
                const propName = prop.getName();
                const propInit = prop.getInitializer();
                if (propInit && Node.isStringLiteral(propInit)) {
                  obj[propName] = propInit.getLiteralValue();
                } else if (propInit && (Node.isTrueLiteral(propInit) || Node.isFalseLiteral(propInit))) {
                  obj[propName] = Node.isTrueLiteral(propInit);
                }
              }
            }
            if (Object.keys(obj).length > 0) {
              values.push(obj);
            }
          }
        }
        if (values.length > 0) {
          frontmatterData[yamlKey] = values;
        }
      }
    }
  }

  // Transform children - detect render props vs direct JSX
  let children: BlockNode[] = [];

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
        children = transformRuntimeBlockChildren(root, ctx);
      }
    } else {
      // Direct JSX children - no wrapper needed
      children = transformRuntimeBlockChildren(root, ctx);
    }
  }

  // Collect runtime var declarations
  const runtimeVars = Array.from(ctx.runtimeVars.values()).map(info => ({
    kind: 'runtimeVarDecl' as const,
    varName: info.varName,
    tsType: info.tsType,
  }));

  // Collect used runtime function names
  const runtimeFunctions = Array.from(ctx.usedRuntimeFunctions);

  return {
    kind: 'document',
    frontmatter: Object.keys(frontmatterData).length > 0
      ? { kind: 'frontmatter', data: frontmatterData }
      : undefined,
    metadata: folder ? { folder } : undefined,
    runtimeVars,
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
  ctx: RuntimeTransformContext
): BlockNode[] {
  if (!Node.isArrowFunction(arrowFn)) return [];

  const body = arrowFn.getBody();

  // Block body: { return (...) }
  if (Node.isBlock(body)) {
    const holder: { result: BlockNode[] | null } = { result: null };

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
            const block = transformRuntimeElement(inner, ctx);
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
    const block = transformRuntimeElement(inner, ctx);
    return block ? [block] : [];
  }

  return [];
}
