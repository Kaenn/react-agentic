/**
 * Transformer - JSX AST to IR Node transformation
 *
 * Converts parsed JSX elements from ts-morph into IR nodes
 * for emission to Markdown.
 */

import {
  Node,
  JsxElement,
  JsxSelfClosingElement,
  JsxFragment,
  JsxOpeningElement,
  JsxSpreadAttribute,
  SourceFile,
  TemplateExpression,
} from 'ts-morph';
import { TranspileError, getNodeLocation, getSourceCode } from '../cli/errors.js';
import type {
  BlockNode,
  InlineNode,
  DocumentNode,
  AgentDocumentNode,
  AgentFrontmatterNode,
  ListNode,
  ListItemNode,
  BlockquoteNode,
  CodeBlockNode,
  LinkNode,
  FrontmatterNode,
  XmlBlockNode,
  SpawnAgentNode,
  SpawnAgentInput,
  TypeReference,
  AssignNode,
  IfNode,
  ElseNode,
} from '../ir/index.js';
import { getElementName, getAttributeValue, extractText, extractInlineText, getArrayAttributeValue, resolveSpreadAttribute, resolveComponentImport, extractTypeArguments, extractVariableDeclarations, extractInputObjectLiteral, resolveTypeImport, extractInterfaceProperties, type ExtractedVariable } from './parser.js';

// ============================================================================
// Element Classification
// ============================================================================

/**
 * HTML elements supported by the transformer
 */
const HTML_ELEMENTS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'div', 'span', 'ul', 'ol', 'li',
  'a', 'b', 'i', 'strong', 'em', 'code',
  'pre', 'blockquote', 'br', 'hr',
]);

/**
 * Special component names that are NOT custom user components
 */
const SPECIAL_COMPONENTS = new Set(['Command', 'Markdown', 'XmlBlock', 'Agent', 'SpawnAgent', 'Assign', 'If', 'Else']);

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

function isValidXmlName(name: string): boolean {
  if (!name) return false;
  if (!XML_NAME_REGEX.test(name)) return false;
  if (name.toLowerCase().startsWith('xml')) return false;
  return true;
}

export class Transformer {
  /** Source file for component resolution (optional - only needed for composition) */
  private sourceFile: SourceFile | undefined;
  /** Visited paths for circular import detection */
  private visitedPaths: Set<string> = new Set();
  /** Extracted useVariable declarations from source file */
  private variables: Map<string, ExtractedVariable> = new Map();

  /**
   * Create a TranspileError with source location context from a node
   */
  private createError(message: string, node: Node): TranspileError {
    const location = getNodeLocation(node);
    const sourceCode = getSourceCode(node.getSourceFile());
    return new TranspileError(message, location, sourceCode);
  }

  /**
   * Transform a root JSX element/fragment into a DocumentNode or AgentDocumentNode
   *
   * @param node - The root JSX element/fragment to transform
   * @param sourceFile - Optional source file for component composition resolution
   */
  transform(node: JsxElement | JsxSelfClosingElement | JsxFragment, sourceFile?: SourceFile): DocumentNode | AgentDocumentNode {
    // Initialize state for this transformation
    this.sourceFile = sourceFile;
    this.visitedPaths = new Set();
    this.variables = new Map();

    if (sourceFile) {
      this.visitedPaths.add(sourceFile.getFilePath());
      // Extract useVariable declarations before JSX processing
      this.variables = extractVariableDeclarations(sourceFile);
    }

    // Check for Command or Agent wrapper at root level
    if (Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)) {
      const name = getElementName(node);
      if (name === 'Command') {
        return this.transformCommand(node);
      }
      if (name === 'Agent') {
        return this.transformAgent(node);
      }
    }

    // Fragment: transform each child as a block
    if (Node.isJsxFragment(node)) {
      const blocks = this.transformFragmentChildren(node);
      return { kind: 'document', children: blocks };
    }

    // Single element: transform it as the one block
    const block = this.transformToBlock(node);
    const children = block ? [block] : [];
    return { kind: 'document', children };
  }

  /**
   * Merge Command props from spread attributes and explicit attributes
   *
   * Processes attributes in order - later props override earlier ones.
   * Supports spread attributes: {...baseProps}
   * Supports explicit attributes: name="value" or name={"value"} or name={["a", "b"]}
   */
  private mergeCommandProps(opening: JsxOpeningElement | JsxSelfClosingElement): Record<string, unknown> {
    const merged: Record<string, unknown> = {};

    for (const attr of opening.getAttributes()) {
      if (Node.isJsxSpreadAttribute(attr)) {
        // Resolve spread and merge
        const spreadProps = resolveSpreadAttribute(attr);
        Object.assign(merged, spreadProps);
      } else if (Node.isJsxAttribute(attr)) {
        // Explicit prop
        const attrName = attr.getNameNode().getText();

        // Try string value first
        const stringValue = getAttributeValue(opening, attrName);
        if (stringValue !== undefined) {
          merged[attrName] = stringValue;
          continue;
        }

        // Try array value
        const arrayValue = getArrayAttributeValue(opening, attrName);
        if (arrayValue !== undefined) {
          merged[attrName] = arrayValue;
        }
      }
    }

    return merged;
  }

  /**
   * Transform a Command element to DocumentNode with frontmatter
   */
  private transformCommand(node: JsxElement | JsxSelfClosingElement): DocumentNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    // Merge all props (spread + explicit)
    const props = this.mergeCommandProps(openingElement);

    // Extract required props
    const name = props.name as string | undefined;
    const description = props.description as string | undefined;

    if (!name) {
      throw this.createError('Command requires name prop', openingElement);
    }
    if (!description) {
      throw this.createError('Command requires description prop', openingElement);
    }

    // Build frontmatter data
    const data: Record<string, unknown> = {
      name,
      description,
    };

    // Optional string props
    const argumentHint = props.argumentHint as string | undefined;
    if (argumentHint) {
      data['argument-hint'] = argumentHint;
    }

    const agent = props.agent as string | undefined;
    if (agent) {
      data['agent'] = agent;
    }

    // Optional array prop (check for allowedTools, map to allowed-tools)
    const allowedTools = props.allowedTools as string[] | undefined;
    if (allowedTools) {
      data['allowed-tools'] = allowedTools;
    }

    const frontmatter: FrontmatterNode = { kind: 'frontmatter', data };

    // Transform children as body blocks (with If/Else sibling detection)
    const children = Node.isJsxElement(node)
      ? this.transformBlockChildren(node.getJsxChildren())
      : [];

    return { kind: 'document', frontmatter, children };
  }

  /**
   * Transform an Agent element to AgentDocumentNode with frontmatter
   */
  private transformAgent(node: JsxElement | JsxSelfClosingElement): AgentDocumentNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    // Extract required props
    const name = getAttributeValue(openingElement, 'name');
    const description = getAttributeValue(openingElement, 'description');

    if (!name) {
      throw this.createError('Agent requires name prop', openingElement);
    }
    if (!description) {
      throw this.createError('Agent requires description prop', openingElement);
    }

    // Extract optional props
    const tools = getAttributeValue(openingElement, 'tools');
    const color = getAttributeValue(openingElement, 'color');

    // Extract generic type argument if present
    const typeArgs = extractTypeArguments(node);
    let inputType: TypeReference | undefined;
    if (typeArgs && typeArgs.length > 0) {
      inputType = {
        kind: 'typeReference',
        name: typeArgs[0],
        resolved: false,  // Will be resolved in validation phase
      };
    }

    // Build frontmatter (using spread for optional fields)
    const frontmatter: AgentFrontmatterNode = {
      kind: 'agentFrontmatter',
      name,
      description,
      ...(tools && { tools }),
      ...(color && { color }),
      ...(inputType && { inputType }),
    };

    // Transform children as body blocks (with If/Else sibling detection)
    const children = Node.isJsxElement(node)
      ? this.transformBlockChildren(node.getJsxChildren())
      : [];

    return { kind: 'agentDocument', frontmatter, children };
  }

  private transformFragmentChildren(node: JsxFragment): BlockNode[] {
    // Use helper for If/Else sibling detection
    return this.transformBlockChildren(node.getJsxChildren());
  }

  private transformToBlock(node: Node): BlockNode | null {
    if (Node.isJsxText(node)) {
      // Whitespace-only text between block elements - skip
      const text = extractText(node);
      if (!text) return null;
      // Standalone text becomes paragraph
      return { kind: 'paragraph', children: [{ kind: 'text', value: text }] };
    }

    if (Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)) {
      const name = getElementName(node);
      return this.transformElement(name, node);
    }

    return null; // JsxExpression etc - handle later
  }

  private transformElement(name: string, node: JsxElement | JsxSelfClosingElement): BlockNode | null {
    // Heading elements
    const headingMatch = name.match(/^h([1-6])$/);
    if (headingMatch) {
      const level = parseInt(headingMatch[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
      const children = Node.isJsxElement(node)
        ? this.transformInlineChildren(node)
        : [];
      return { kind: 'heading', level, children };
    }

    // Paragraph
    if (name === 'p') {
      const children = Node.isJsxElement(node)
        ? this.transformInlineChildren(node)
        : [];
      return { kind: 'paragraph', children };
    }

    // Self-closing hr
    if (name === 'hr') {
      return { kind: 'thematicBreak' };
    }

    // Unordered list
    if (name === 'ul') {
      return this.transformList(node, false);
    }

    // Ordered list
    if (name === 'ol') {
      return this.transformList(node, true);
    }

    // Blockquote
    if (name === 'blockquote') {
      return this.transformBlockquote(node);
    }

    // Code block (pre containing code)
    if (name === 'pre') {
      return this.transformCodeBlock(node);
    }

    // XML block via div with name attribute
    if (name === 'div') {
      return this.transformDiv(node);
    }

    // XmlBlock component
    if (name === 'XmlBlock') {
      return this.transformXmlBlock(node);
    }

    // SpawnAgent block element (inside Command)
    if (name === 'SpawnAgent') {
      return this.transformSpawnAgent(node);
    }

    // Assign block element (variable assignment)
    if (name === 'Assign') {
      return this.transformAssign(node);
    }

    // If component - conditional block
    if (name === 'If') {
      return this.transformIf(node);
    }

    // Else component - standalone is an error (must follow If as sibling)
    if (name === 'Else') {
      throw this.createError('<Else> must follow <If> as sibling', node);
    }

    // Markdown passthrough
    if (name === 'Markdown') {
      return this.transformMarkdown(node);
    }

    // Custom component composition
    if (isCustomComponent(name)) {
      return this.transformCustomComponent(name, node);
    }

    throw this.createError(`Unsupported block element: <${name}>`, node);
  }

  private transformList(node: JsxElement | JsxSelfClosingElement, ordered: boolean): ListNode {
    if (Node.isJsxSelfClosingElement(node)) {
      return { kind: 'list', ordered, items: [] };
    }

    const items: ListItemNode[] = [];
    for (const child of node.getJsxChildren()) {
      if (Node.isJsxElement(child)) {
        const childName = getElementName(child);
        if (childName === 'li') {
          items.push(this.transformListItem(child));
        } else {
          throw this.createError(`Expected <li> inside list, got <${childName}>`, child);
        }
      } else if (Node.isJsxText(child) && !child.containsOnlyTriviaWhiteSpaces()) {
        throw this.createError('Lists can only contain <li> elements', child);
      }
      // Skip whitespace-only text nodes
    }

    return { kind: 'list', ordered, items };
  }

  private transformListItem(node: JsxElement): ListItemNode {
    // List items can contain blocks (paragraphs, nested lists) or inline content
    // We need to collect inline content together to preserve spacing between elements
    const children: BlockNode[] = [];
    const jsxChildren = node.getJsxChildren();

    // Helper to check if a child is block-level content
    const isBlockContent = (child: Node): boolean => {
      if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
        const name = getElementName(child);
        return name === 'ul' || name === 'ol' || name === 'p';
      }
      return false;
    };

    // Collect inline content sequences and process them together
    let inlineSequence: Node[] = [];

    const flushInlineSequence = () => {
      if (inlineSequence.length === 0) return;

      // Process all inline nodes together, preserving spacing
      const inlines: InlineNode[] = [];
      for (const child of inlineSequence) {
        const inline = this.transformToInline(child);
        if (inline) inlines.push(inline);
      }

      // Trim only the outer boundaries (preserves internal spacing)
      this.trimBoundaryTextNodes(inlines);

      if (inlines.length > 0) {
        // Merge into last paragraph or create new one
        const lastChild = children[children.length - 1];
        if (lastChild?.kind === 'paragraph') {
          lastChild.children.push(...inlines);
        } else {
          children.push({ kind: 'paragraph', children: inlines });
        }
      }

      inlineSequence = [];
    };

    for (const child of jsxChildren) {
      if (isBlockContent(child)) {
        // Flush any pending inline content before block
        flushInlineSequence();

        // Process block content
        const childName = getElementName(child as JsxElement | JsxSelfClosingElement);
        if (childName === 'ul' || childName === 'ol') {
          const nestedList = this.transformElement(childName, child as JsxElement);
          if (nestedList) children.push(nestedList);
        } else if (childName === 'p') {
          const para = this.transformElement(childName, child as JsxElement);
          if (para) children.push(para);
        }
      } else {
        // Accumulate inline content (text, expressions, inline elements)
        inlineSequence.push(child);
      }
    }

    // Flush any remaining inline content
    flushInlineSequence();

    return { kind: 'listItem', children };
  }

  private transformBlockquote(node: JsxElement | JsxSelfClosingElement): BlockquoteNode {
    if (Node.isJsxSelfClosingElement(node)) {
      return { kind: 'blockquote', children: [] };
    }

    // Transform children as blocks (with If/Else sibling detection)
    const children = this.transformBlockChildren(node.getJsxChildren());

    return { kind: 'blockquote', children };
  }

  private transformCodeBlock(node: JsxElement | JsxSelfClosingElement): CodeBlockNode {
    if (Node.isJsxSelfClosingElement(node)) {
      return { kind: 'codeBlock', content: '' };
    }

    // Look for <code> child with optional language
    const children = node.getJsxChildren();
    for (const child of children) {
      if (Node.isJsxElement(child) && getElementName(child) === 'code') {
        const language = getAttributeValue(
          child.getOpeningElement(),
          'className'
        )?.replace(/^language-/, '');

        // Extract raw text content preserving whitespace
        const content = this.extractCodeContent(child);
        return { kind: 'codeBlock', language, content };
      }
    }

    // Pre without code child - extract text directly
    const content = this.extractCodeContent(node);
    return { kind: 'codeBlock', content };
  }

  private extractCodeContent(node: JsxElement): string {
    // Preserve whitespace in code blocks - don't normalize
    const parts: string[] = [];
    for (const child of node.getJsxChildren()) {
      if (Node.isJsxText(child)) {
        parts.push(child.getText());
      } else if (Node.isJsxExpression(child)) {
        // Handle {`template`} and {"string"} expressions
        const expr = child.getExpression();
        if (expr) {
          if (Node.isStringLiteral(expr)) {
            parts.push(expr.getLiteralValue());
          } else if (Node.isNoSubstitutionTemplateLiteral(expr)) {
            parts.push(expr.getLiteralValue());
          } else if (Node.isTemplateExpression(expr)) {
            // Template with substitutions: {`text ${var} more`}
            parts.push(this.extractTemplateText(expr));
          }
        }
      }
    }
    // Trim only the outermost whitespace (leading/trailing)
    return parts.join('').trim();
  }

  private transformInlineChildren(node: JsxElement): InlineNode[] {
    const children = node.getJsxChildren();
    const inlines: InlineNode[] = [];

    for (const child of children) {
      const inline = this.transformToInline(child);
      if (inline) inlines.push(inline);
    }

    // Trim leading/trailing whitespace from first and last text nodes
    // (preserves internal spacing between inline elements)
    this.trimBoundaryTextNodes(inlines);

    return inlines;
  }

  private trimBoundaryTextNodes(inlines: InlineNode[]): void {
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

  private transformToInline(node: Node): InlineNode | null {
    if (Node.isJsxText(node)) {
      // Use extractInlineText to preserve leading/trailing spaces
      const text = extractInlineText(node);
      if (!text) return null;
      return { kind: 'text', value: text };
    }

    if (Node.isJsxSelfClosingElement(node)) {
      const name = getElementName(node);
      if (name === 'br') {
        return { kind: 'lineBreak' };
      }
      throw this.createError(`Unsupported inline self-closing element: <${name}>`, node);
    }

    if (Node.isJsxElement(node)) {
      const name = getElementName(node);
      return this.transformInlineElement(name, node);
    }

    // Handle JSX expressions like {' '} for explicit spacing
    if (Node.isJsxExpression(node)) {
      const expr = node.getExpression();
      if (expr && Node.isStringLiteral(expr)) {
        const value = expr.getLiteralValue();
        if (value) {
          return { kind: 'text', value };
        }
      }
      // Non-string expressions are ignored for now
      return null;
    }

    return null;
  }

  private transformInlineElement(name: string, node: JsxElement): InlineNode {
    // Bold
    if (name === 'b' || name === 'strong') {
      return { kind: 'bold', children: this.transformInlineChildren(node) };
    }

    // Italic
    if (name === 'i' || name === 'em') {
      return { kind: 'italic', children: this.transformInlineChildren(node) };
    }

    // Inline code
    if (name === 'code') {
      // Inline code: extract raw text content
      const text = this.extractAllText(node);
      return { kind: 'inlineCode', value: text };
    }

    // Link
    if (name === 'a') {
      return this.transformLink(node);
    }

    throw this.createError(`Unsupported inline element: <${name}>`, node);
  }

  private extractAllText(node: JsxElement): string {
    // Recursively extract all text content from children
    // Handles both JsxText and JsxExpression (string literals, template literals)
    const parts: string[] = [];
    for (const child of node.getJsxChildren()) {
      if (Node.isJsxText(child)) {
        const text = extractText(child);
        if (text) parts.push(text);
      } else if (Node.isJsxExpression(child)) {
        // Handle {`template`}, {"string"}, and {'string'} expressions
        const expr = child.getExpression();
        if (expr) {
          if (Node.isStringLiteral(expr)) {
            parts.push(expr.getLiteralValue());
          } else if (Node.isNoSubstitutionTemplateLiteral(expr)) {
            parts.push(expr.getLiteralValue());
          } else if (Node.isTemplateExpression(expr)) {
            // Template with substitutions: {`text ${var} more`}
            parts.push(this.extractTemplateText(expr));
          }
        }
      }
    }
    return parts.join('');
  }

  private transformLink(node: JsxElement): LinkNode {
    const href = getAttributeValue(node.getOpeningElement(), 'href');
    if (!href) {
      throw this.createError('<a> element requires href attribute', node);
    }

    const children = this.transformInlineChildren(node);
    return { kind: 'link', url: href, children };
  }

  private transformDiv(node: JsxElement | JsxSelfClosingElement): XmlBlockNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    // Get name attribute (optional - if missing, output as <div>)
    const nameAttr = getAttributeValue(openingElement, 'name');
    const tagName = nameAttr || 'div';

    // Validate XML name if custom name provided
    if (nameAttr && !isValidXmlName(nameAttr)) {
      throw this.createError(
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

    // Transform children as blocks (with If/Else sibling detection)
    const children = Node.isJsxElement(node)
      ? this.transformBlockChildren(node.getJsxChildren())
      : [];

    return {
      kind: 'xmlBlock',
      name: tagName,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      children,
    };
  }

  private transformXmlBlock(node: JsxElement | JsxSelfClosingElement): XmlBlockNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    // Get required name attribute
    const nameAttr = getAttributeValue(openingElement, 'name');
    if (!nameAttr) {
      throw this.createError('XmlBlock requires name prop', node);
    }

    // Validate XML name
    if (!isValidXmlName(nameAttr)) {
      throw this.createError(
        `Invalid XML tag name '${nameAttr}' - must start with letter/underscore, contain only letters, digits, underscores, hyphens, or periods, and not start with 'xml'`,
        node
      );
    }

    // Transform children as blocks (with If/Else sibling detection)
    const children = Node.isJsxElement(node)
      ? this.transformBlockChildren(node.getJsxChildren())
      : [];

    return {
      kind: 'xmlBlock',
      name: nameAttr,
      children,
    };
  }

  private transformMarkdown(node: JsxElement | JsxSelfClosingElement): BlockNode {
    if (Node.isJsxSelfClosingElement(node)) {
      // Self-closing <Markdown /> - empty content
      return { kind: 'raw', content: '' };
    }

    // Extract raw content from children
    // JSX strips whitespace after expressions, so we need to detect and restore it
    //
    // In markdown, we need to preserve:
    // - Newlines before section headers (## )
    // - Newlines between paragraphs/blocks
    // - Spaces between inline elements
    const parts: string[] = [];
    const jsxChildren = node.getJsxChildren();

    for (let i = 0; i < jsxChildren.length; i++) {
      const child = jsxChildren[i];
      const prev = parts[parts.length - 1];

      if (Node.isJsxText(child)) {
        let text = child.getText();

        // Empty text between two expressions likely had a newline that JSX stripped
        // We restore it as a newline (inside code blocks, between list items, etc.)
        if (text === '' && i > 0 && i < jsxChildren.length - 1) {
          const prevChild = jsxChildren[i - 1];
          const nextChild = jsxChildren[i + 1];
          if (Node.isJsxExpression(prevChild) && Node.isJsxExpression(nextChild)) {
            // Two adjacent expressions had whitespace between them that was stripped
            parts.push('\n');
            continue;
          }
        }

        // Check if we need to restore stripped whitespace before this text
        // JSX eats leading whitespace from text following an expression
        if (prev && !/\s$/.test(prev) && !/^\s/.test(text) && text !== '') {
          // Detect what kind of whitespace was likely stripped:
          // - If text starts with ## (heading), add double newline
          // - If text starts with ``` (code fence), add double newline
          // - If text starts with ** (bold), add newline (often a new paragraph)
          // - If text starts with - or * or digit. (list item), add newline
          // - For | (table), only add newline if prev ends with | (new row)
          //   Otherwise it's a cell separator, just needs space
          // - Otherwise add space
          if (/^#{1,6}\s/.test(text) || /^```/.test(text)) {
            parts.push('\n\n');
          } else if (/^\*\*/.test(text)) {
            // Bold at start of line usually means new paragraph or list item
            parts.push('\n');
          } else if (/^[-*]\s/.test(text) || /^\d+\.\s/.test(text)) {
            parts.push('\n');
          } else if (/^[|]/.test(text)) {
            // Table pipe: if previous content ended with | it's a new row
            // Otherwise it's a cell separator (just needs space)
            if (/[|]\s*$/.test(prev)) {
              parts.push('\n');
            } else {
              parts.push(' ');
            }
          } else if (!/^[.,;:!?)}\]>`"'/]/.test(text)) {
            parts.push(' ');
          }
        }

        parts.push(text);
      } else if (Node.isJsxExpression(child)) {
        // Handle {variable} or {"literal"} or {`template`} expressions
        const expr = child.getExpression();
        if (expr) {
          if (Node.isStringLiteral(expr)) {
            // String literal: {"text"} -> text
            parts.push(expr.getLiteralValue());
          } else if (Node.isNoSubstitutionTemplateLiteral(expr)) {
            // Template literal without substitutions: {`text`} -> text
            parts.push(expr.getLiteralValue());
          } else if (Node.isTemplateExpression(expr)) {
            // Template expression with substitutions: {`text ${var} more`}
            // Reconstruct the template by joining head, spans, and tail
            let result = expr.getHead().getLiteralText();
            for (const span of expr.getTemplateSpans()) {
              // Get the expression between ${...}
              const spanExpr = span.getExpression();
              // Try to get static value, otherwise use ${expr}
              if (Node.isIdentifier(spanExpr)) {
                result += `\${${spanExpr.getText()}}`;
              } else if (Node.isStringLiteral(spanExpr)) {
                result += spanExpr.getLiteralValue();
              } else {
                // For complex expressions, preserve the ${...} syntax
                result += `\${${spanExpr.getText()}}`;
              }
              // Add the literal text after the expression
              const literal = span.getLiteral();
              if (Node.isTemplateMiddle(literal)) {
                result += literal.getLiteralText();
              } else if (Node.isTemplateTail(literal)) {
                result += literal.getLiteralText();
              }
            }
            parts.push(result);
          } else if (Node.isIdentifier(expr)) {
            // Identifier expression: {var} was likely ${var} in bash
            // JSX splits ${var} into "$" + {var}, so reconstruct as {var}
            // which preserves the intent for code blocks
            parts.push(`{${expr.getText()}}`);
          }
          // Other expressions (function calls, etc.) cannot be evaluated at transpile time
        }
      }
    }

    // Trim outer boundaries, preserve internal whitespace
    const content = parts.join('').trim();

    return { kind: 'raw', content };
  }

  /**
   * Transform a custom component by resolving its import and inlining its JSX
   *
   * Custom components are user-defined TSX fragments that get inlined at
   * transpile time. Component props are NOT supported in v1 - only parameterless
   * composition.
   */
  private transformCustomComponent(name: string, node: JsxElement | JsxSelfClosingElement): BlockNode | null {
    // Validate no props on the component (v1 limitation)
    const openingElement = Node.isJsxElement(node) ? node.getOpeningElement() : node;
    const attributes = openingElement.getAttributes();
    if (attributes.length > 0) {
      throw this.createError(`Component props not supported: <${name}> has ${attributes.length} prop(s)`, node);
    }

    // Require source file for component resolution
    if (!this.sourceFile) {
      throw this.createError(
        `Cannot resolve component '${name}': no source file context. ` +
        `Pass sourceFile to transformer.transform() for component composition.`,
        node
      );
    }

    // Resolve the component import
    const resolved = resolveComponentImport(name, this.sourceFile, this.visitedPaths);

    // Update visited paths for nested resolution
    this.visitedPaths = resolved.visitedPaths;

    // Save current sourceFile and set to component's sourceFile for nested resolution
    const previousSourceFile = this.sourceFile;
    this.sourceFile = resolved.sourceFile;

    let result: BlockNode | null = null;

    // Transform the resolved JSX
    if (Node.isJsxFragment(resolved.jsx)) {
      // Fragment: transform children and return first block
      // (multiple root blocks from a component isn't fully supported - take first)
      const blocks = this.transformFragmentChildren(resolved.jsx);
      result = blocks[0] ?? null;
    } else {
      // Single element or self-closing
      result = this.transformToBlock(resolved.jsx);
    }

    // Restore sourceFile
    this.sourceFile = previousSourceFile;

    return result;
  }

  /**
   * Transform a SpawnAgent element to SpawnAgentNode
   * SpawnAgent is a block-level element that emits Task() syntax
   *
   * Supports two modes:
   * 1. prompt prop (deprecated): Manual prompt string
   * 2. input prop (preferred): Typed input - VariableRef or object literal
   */
  private transformSpawnAgent(node: JsxElement | JsxSelfClosingElement): SpawnAgentNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    // Extract required props
    const agent = getAttributeValue(openingElement, 'agent');
    const model = getAttributeValue(openingElement, 'model');
    const description = getAttributeValue(openingElement, 'description');

    // Extract prompt and input props
    const prompt = this.extractPromptProp(openingElement);
    const input = this.extractInputProp(openingElement);

    // Extract extra instructions from children (when using input prop)
    const extraInstructions = Node.isJsxElement(node)
      ? this.extractExtraInstructions(node)
      : undefined;

    // Validate required props
    if (!agent) {
      throw this.createError('SpawnAgent requires agent prop', openingElement);
    }
    if (!model) {
      throw this.createError('SpawnAgent requires model prop', openingElement);
    }
    if (!description) {
      throw this.createError('SpawnAgent requires description prop', openingElement);
    }

    // Validate mutual exclusivity of prompt and input
    if (prompt && input) {
      throw this.createError(
        'Cannot use both prompt and input props on SpawnAgent. Use input for typed input or prompt for manual prompts.',
        openingElement
      );
    }

    // Require one of prompt or input
    if (!prompt && !input) {
      throw this.createError(
        'SpawnAgent requires either prompt or input prop',
        openingElement
      );
    }

    // Extract generic type argument if present
    const typeArgs = extractTypeArguments(node);
    let inputType: TypeReference | undefined;
    const typeParam = typeArgs && typeArgs.length > 0 ? typeArgs[0] : undefined;
    if (typeParam) {
      inputType = {
        kind: 'typeReference',
        name: typeParam,
        resolved: false,  // Will be resolved in validation phase
      };
    }

    // Validate input object against interface if both present
    if (input) {
      this.validateInputAgainstInterface(input, typeParam, openingElement);
    }

    return {
      kind: 'spawnAgent',
      agent,
      model,
      description,
      ...(prompt && { prompt }),
      ...(input && { input }),
      ...(extraInstructions && { extraInstructions }),
      ...(inputType && { inputType }),
    };
  }

  /**
   * Extract input prop - handles VariableRef identifier or object literal
   *
   * Supports:
   * - input={varRef} - Reference to useVariable result
   * - input={{ key: "value" }} - Object literal with properties
   */
  private extractInputProp(
    element: JsxOpeningElement | JsxSelfClosingElement
  ): SpawnAgentInput | undefined {
    const attr = element.getAttribute('input');
    if (!attr || !Node.isJsxAttribute(attr)) return undefined;

    const init = attr.getInitializer();
    if (!init || !Node.isJsxExpression(init)) return undefined;

    const expr = init.getExpression();
    if (!expr) return undefined;

    // Case 1: Identifier referencing useVariable result
    if (Node.isIdentifier(expr)) {
      const variable = this.variables.get(expr.getText());
      if (variable) {
        return { type: 'variable', variableName: variable.envName };
      }
      // Not a known variable - error
      throw this.createError(
        `Input '${expr.getText()}' not found. Use useVariable() or object literal.`,
        element
      );
    }

    // Case 2: Object literal
    if (Node.isObjectLiteralExpression(expr)) {
      const properties = extractInputObjectLiteral(expr, this.variables);
      return { type: 'object', properties };
    }

    throw this.createError('Input must be a VariableRef or object literal', element);
  }

  /**
   * Extract extra instructions from SpawnAgent children
   *
   * Treats children as raw text content (like Markdown component).
   * Returns undefined if no children or only whitespace.
   */
  private extractExtraInstructions(node: JsxElement): string | undefined {
    const parts: string[] = [];

    for (const child of node.getJsxChildren()) {
      if (Node.isJsxText(child)) {
        const text = child.getText();
        if (text.trim()) {
          parts.push(text);
        }
      } else if (Node.isJsxExpression(child)) {
        // Handle {`template`} and {"string"} expressions
        const expr = child.getExpression();
        if (expr) {
          if (Node.isStringLiteral(expr)) {
            parts.push(expr.getLiteralValue());
          } else if (Node.isNoSubstitutionTemplateLiteral(expr)) {
            parts.push(expr.getLiteralValue());
          } else if (Node.isTemplateExpression(expr)) {
            parts.push(this.extractTemplateText(expr));
          }
        }
      }
    }

    const content = parts.join('').trim();
    return content || undefined;
  }

  /**
   * Extract type argument from SpawnAgent<T> syntax
   *
   * Returns the type name string (e.g., "ResearcherInput") or undefined
   * if no type argument is present.
   */
  private extractSpawnAgentTypeParam(
    element: JsxOpeningElement | JsxSelfClosingElement
  ): string | undefined {
    // Use existing extractTypeArguments helper (works on both JsxElement and self-closing)
    // We need to reconstruct the full node for extractTypeArguments
    const parent = element.getParent();
    if (!parent) return undefined;

    // extractTypeArguments expects JsxElement or JsxSelfClosingElement
    if (Node.isJsxElement(parent)) {
      const typeArgs = extractTypeArguments(parent);
      return typeArgs && typeArgs.length > 0 ? typeArgs[0] : undefined;
    }
    if (Node.isJsxSelfClosingElement(element)) {
      const typeArgs = extractTypeArguments(element);
      return typeArgs && typeArgs.length > 0 ? typeArgs[0] : undefined;
    }

    return undefined;
  }

  /**
   * Validate input object properties against SpawnAgent<T> type parameter.
   *
   * Throws compile error if required interface properties are missing.
   * Only validates object literal inputs (VariableRef is runtime-checked).
   *
   * @param input - The parsed SpawnAgentInput (may be variable or object)
   * @param typeParam - The type parameter name (e.g., "ResearcherInput")
   * @param element - The JSX element for error reporting
   */
  private validateInputAgainstInterface(
    input: SpawnAgentInput,
    typeParam: string | undefined,
    element: JsxOpeningElement | JsxSelfClosingElement
  ): void {
    // Only validate object literal inputs (VariableRef is runtime-checked)
    if (input.type !== 'object') return;

    // No type param = no validation (backward compat)
    if (!typeParam) return;

    // Require source file for type resolution
    if (!this.sourceFile) {
      // Can't resolve types without source file context - skip validation
      return;
    }

    // Resolve the interface (local or imported)
    const resolved = resolveTypeImport(typeParam, this.sourceFile);
    if (!resolved?.interface) {
      // Interface not found - skip validation (warning logged elsewhere)
      return;
    }

    // Extract required properties from interface
    const interfaceProps = extractInterfaceProperties(resolved.interface);
    const requiredProps = interfaceProps.filter(p => p.required);

    // Get property names from input object
    const inputPropNames = input.properties.map(p => p.name);

    // Find missing required properties
    const missing = requiredProps.filter(p => !inputPropNames.includes(p.name));

    if (missing.length > 0) {
      const missingNames = missing.map(p => p.name).join(', ');
      const requiredNames = requiredProps.map(p => p.name).join(', ');
      throw this.createError(
        `SpawnAgent input missing required properties: ${missingNames}. ` +
        `Interface '${typeParam}' requires: ${requiredNames}`,
        element
      );
    }
  }

  /**
   * Transform an If element to IfNode
   * If is a block-level element that emits prose-based conditionals
   */
  private transformIf(node: JsxElement | JsxSelfClosingElement): IfNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    // Extract test prop (required)
    const test = getAttributeValue(openingElement, 'test');
    if (!test) {
      throw this.createError('If requires test prop', openingElement);
    }

    // Transform children as "then" block using helper
    const children = Node.isJsxElement(node)
      ? this.transformBlockChildren(node.getJsxChildren())
      : [];

    return {
      kind: 'if',
      test,
      children,
    };
  }

  /**
   * Transform an Else element to ElseNode
   * Else is a block-level element that provides "otherwise" content
   */
  private transformElse(node: JsxElement | JsxSelfClosingElement): ElseNode {
    // Transform children as "else" block
    const children = Node.isJsxElement(node)
      ? this.transformBlockChildren(node.getJsxChildren())
      : [];

    return {
      kind: 'else',
      children,
    };
  }

  /**
   * Transform JSX children to BlockNodes, handling If/Else sibling pairs
   */
  private transformBlockChildren(jsxChildren: Node[]): BlockNode[] {
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
          const ifNode = this.transformIf(child);
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
              const elseNode = this.transformElse(sibling);
              blocks.push(elseNode);
              i = nextIndex; // Skip past Else in outer loop
            }
            break;
          }
        } else {
          const block = this.transformToBlock(child);
          if (block) blocks.push(block);
        }
      } else {
        const block = this.transformToBlock(child);
        if (block) blocks.push(block);
      }

      i++;
    }

    return blocks;
  }

  /**
   * Transform an Assign element to AssignNode
   * Assign emits a bash code block with variable assignment
   */
  private transformAssign(node: JsxElement | JsxSelfClosingElement): AssignNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    // Get the var prop - must be a JSX expression referencing an identifier
    const varAttr = openingElement.getAttribute('var');
    if (!varAttr || !Node.isJsxAttribute(varAttr)) {
      throw this.createError('Assign requires var prop', openingElement);
    }

    const init = varAttr.getInitializer();
    if (!init || !Node.isJsxExpression(init)) {
      throw this.createError('Assign var must be a JSX expression: var={variableName}', openingElement);
    }

    const expr = init.getExpression();
    if (!expr || !Node.isIdentifier(expr)) {
      throw this.createError('Assign var must reference a useVariable result', openingElement);
    }

    const localName = expr.getText();

    // Look up in extracted variables
    const variable = this.variables.get(localName);
    if (!variable) {
      throw this.createError(
        `Variable '${localName}' not found. Did you declare it with useVariable()?`,
        openingElement
      );
    }

    return {
      kind: 'assign',
      variableName: variable.envName,
      assignment: variable.assignment,
    };
  }

  /**
   * Extract prompt prop value, preserving multi-line content and {variable} placeholders
   * Supports: prompt="string", prompt={"string"}, prompt={`template`}
   */
  private extractPromptProp(element: JsxOpeningElement | JsxSelfClosingElement): string | undefined {
    const attr = element.getAttribute('prompt');
    if (!attr || !Node.isJsxAttribute(attr)) {
      return undefined;
    }

    const init = attr.getInitializer();
    if (!init) {
      return undefined;
    }

    // String literal: prompt="simple string"
    if (Node.isStringLiteral(init)) {
      return init.getLiteralValue();
    }

    // JSX expression: prompt={...}
    if (Node.isJsxExpression(init)) {
      const expr = init.getExpression();
      if (!expr) {
        return undefined;
      }

      // String literal in JSX expression: prompt={"string"}
      if (Node.isStringLiteral(expr)) {
        return expr.getLiteralValue();
      }

      // No-substitution template literal: prompt={`simple template`}
      if (Node.isNoSubstitutionTemplateLiteral(expr)) {
        return expr.getLiteralValue();
      }

      // Template expression with substitutions: prompt={`text ${var}`}
      // Note: ${var} in TSX templates become {var} in output (GSD format)
      if (Node.isTemplateExpression(expr)) {
        return this.extractTemplateText(expr);
      }
    }

    return undefined;
  }

  /**
   * Extract text from a template expression, converting ${var} to {var}
   * This preserves GSD's {variable} placeholder syntax
   */
  private extractTemplateText(expr: TemplateExpression): string {
    const parts: string[] = [];

    // Head: text before first ${...}
    parts.push(expr.getHead().getLiteralText());

    // Spans: each has expression + literal text after
    for (const span of expr.getTemplateSpans()) {
      const spanExpr = span.getExpression();
      // Convert ${variable} to {variable} for GSD format
      parts.push(`{${spanExpr.getText()}}`);
      parts.push(span.getLiteral().getLiteralText());
    }

    return parts.join('');
  }
}

/**
 * Convenience function to transform a JSX element to a DocumentNode or AgentDocumentNode
 */
export function transform(node: JsxElement | JsxSelfClosingElement | JsxFragment, sourceFile?: SourceFile): DocumentNode | AgentDocumentNode {
  const transformer = new Transformer();
  return transformer.transform(node, sourceFile);
}
