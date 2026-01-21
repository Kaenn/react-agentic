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
} from '../ir/index.js';
import { getElementName, getAttributeValue, extractText, extractInlineText, getArrayAttributeValue, resolveSpreadAttribute, resolveComponentImport } from './parser.js';

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
const SPECIAL_COMPONENTS = new Set(['Command', 'Markdown', 'XmlBlock', 'Agent', 'SpawnAgent']);

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
    if (sourceFile) {
      this.visitedPaths.add(sourceFile.getFilePath());
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

    // Optional array prop (check for allowedTools, map to allowed-tools)
    const allowedTools = props.allowedTools as string[] | undefined;
    if (allowedTools) {
      data['allowed-tools'] = allowedTools;
    }

    const frontmatter: FrontmatterNode = { kind: 'frontmatter', data };

    // Transform children as body blocks
    const children: BlockNode[] = [];
    if (Node.isJsxElement(node)) {
      for (const child of node.getJsxChildren()) {
        const block = this.transformToBlock(child);
        if (block) children.push(block);
      }
    }

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

    // Build frontmatter (using spread for optional fields)
    const frontmatter: AgentFrontmatterNode = {
      kind: 'agentFrontmatter',
      name,
      description,
      ...(tools && { tools }),
      ...(color && { color }),
    };

    // Transform children as body blocks
    const children: BlockNode[] = [];
    if (Node.isJsxElement(node)) {
      for (const child of node.getJsxChildren()) {
        const block = this.transformToBlock(child);
        if (block) children.push(block);
      }
    }

    return { kind: 'agentDocument', frontmatter, children };
  }

  private transformFragmentChildren(node: JsxFragment): BlockNode[] {
    const children = node.getJsxChildren();
    const blocks: BlockNode[] = [];

    for (const child of children) {
      const block = this.transformToBlock(child);
      if (block) blocks.push(block);
    }

    return blocks;
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
    // List items can contain blocks (paragraphs, nested lists)
    const children: BlockNode[] = [];

    for (const child of node.getJsxChildren()) {
      if (Node.isJsxText(child)) {
        const text = extractText(child);
        if (text) {
          // Plain text in li - merge into last paragraph if exists
          const textNode: InlineNode = { kind: 'text', value: text };
          const lastChild = children[children.length - 1];
          if (lastChild?.kind === 'paragraph') {
            lastChild.children.push(textNode);
          } else {
            children.push({ kind: 'paragraph', children: [textNode] });
          }
        }
      } else if (Node.isJsxExpression(child)) {
        // Handle JSX expressions like {' '} for explicit spacing in list items
        const inline = this.transformToInline(child);
        if (inline) {
          // Merge into last paragraph if possible
          const lastChild = children[children.length - 1];
          if (lastChild?.kind === 'paragraph') {
            lastChild.children.push(inline);
          } else {
            children.push({ kind: 'paragraph', children: [inline] });
          }
        }
      } else if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
        const childName = getElementName(child);

        // Check if it's a nested list
        if (childName === 'ul' || childName === 'ol') {
          const nestedList = this.transformElement(childName, child);
          if (nestedList) children.push(nestedList);
        } else if (childName === 'p') {
          // Explicit paragraph
          const para = this.transformElement(childName, child);
          if (para) children.push(para);
        } else {
          // Inline elements get wrapped in implicit paragraph
          const inline = Node.isJsxSelfClosingElement(child)
            ? this.transformToInline(child)
            : this.transformInlineElement(childName, child);
          if (inline) {
            // Merge into last paragraph if possible
            const lastChild = children[children.length - 1];
            if (lastChild?.kind === 'paragraph') {
              lastChild.children.push(inline);
            } else {
              children.push({ kind: 'paragraph', children: [inline] });
            }
          }
        }
      }
    }

    return { kind: 'listItem', children };
  }

  private transformBlockquote(node: JsxElement | JsxSelfClosingElement): BlockquoteNode {
    if (Node.isJsxSelfClosingElement(node)) {
      return { kind: 'blockquote', children: [] };
    }

    const children: BlockNode[] = [];
    for (const child of node.getJsxChildren()) {
      const block = this.transformToBlock(child);
      if (block) children.push(block);
    }

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
    const parts: string[] = [];
    for (const child of node.getJsxChildren()) {
      if (Node.isJsxText(child)) {
        const text = extractText(child);
        if (text) parts.push(text);
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

    // Transform children as blocks
    const children: BlockNode[] = [];
    if (Node.isJsxElement(node)) {
      for (const child of node.getJsxChildren()) {
        const block = this.transformToBlock(child);
        if (block) children.push(block);
      }
    }

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

    // Transform children as blocks
    const children: BlockNode[] = [];
    if (Node.isJsxElement(node)) {
      for (const child of node.getJsxChildren()) {
        const block = this.transformToBlock(child);
        if (block) children.push(block);
      }
    }

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
    const parts: string[] = [];
    for (const child of node.getJsxChildren()) {
      if (Node.isJsxText(child)) {
        // Get raw text preserving whitespace
        parts.push(child.getText());
      } else if (Node.isJsxExpression(child)) {
        // Handle {variable} or {"literal"} expressions
        const expr = child.getExpression();
        if (expr && Node.isStringLiteral(expr)) {
          parts.push(expr.getLiteralValue());
        }
        // Non-string expressions ignored (can't evaluate at transpile time)
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
   */
  private transformSpawnAgent(node: JsxElement | JsxSelfClosingElement): SpawnAgentNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    // Extract required props
    const agent = getAttributeValue(openingElement, 'agent');
    const model = getAttributeValue(openingElement, 'model');
    const description = getAttributeValue(openingElement, 'description');
    const prompt = this.extractPromptProp(openingElement);

    // Validate all required props
    if (!agent) {
      throw this.createError('SpawnAgent requires agent prop', openingElement);
    }
    if (!model) {
      throw this.createError('SpawnAgent requires model prop', openingElement);
    }
    if (!description) {
      throw this.createError('SpawnAgent requires description prop', openingElement);
    }
    if (!prompt) {
      throw this.createError('SpawnAgent requires prompt prop', openingElement);
    }

    return { kind: 'spawnAgent', agent, model, description, prompt };
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
