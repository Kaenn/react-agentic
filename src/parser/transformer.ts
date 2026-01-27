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
  OnStatusNode,
  SkillDocumentNode,
  SkillFrontmatterNode,
  SkillFileNode,
  SkillStaticNode,
  ReadStateNode,
  WriteStateNode,
  MCPServerNode,
  MCPConfigDocumentNode,
  StateDocumentNode,
  StateNode,
  OperationNode,
  StateSchema,
  TableNode,
  ExecutionContextNode,
  SuccessCriteriaNode,
  SuccessCriteriaItemData,
  OfferNextNode,
  OfferNextRouteData,
  StepNode,
  StepVariant,
} from '../ir/index.js';
import { getElementName, getAttributeValue, getTestAttributeValue, extractText, extractInlineText, getArrayAttributeValue, resolveSpreadAttribute, resolveComponentImport, extractTypeArguments, extractVariableDeclarations, extractInputObjectLiteral, resolveTypeImport, extractInterfaceProperties, extractStateSchema, extractSqlArguments, analyzeRenderPropsChildren, type ExtractedVariable, type RenderPropsInfo } from './parser.js';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert PascalCase component name to snake_case XML tag name
 * Example: DeviationRules -> deviation_rules
 */
function toSnakeCase(name: string): string {
  return name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

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
const SPECIAL_COMPONENTS = new Set([
  'Command', 'Markdown', 'XmlBlock', 'Agent', 'SpawnAgent', 'Assign', 'If', 'Else', 'Loop', 'OnStatus',
  'Skill', 'SkillFile', 'SkillStatic', 'ReadState', 'WriteState',
  'MCPServer', 'MCPStdioServer', 'MCPHTTPServer', 'MCPConfig', 'State', 'Operation', 'Table', 'List',
  // Semantic workflow components
  'ExecutionContext', 'SuccessCriteria', 'OfferNext', 'XmlSection',
  'DeviationRules', 'CommitRules', 'WaveExecution', 'CheckpointHandling',
  // Step workflow primitive
  'Step'
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
  /** Extracted useOutput declarations: identifier name -> agent name */
  private outputs: Map<string, string> = new Map();
  /** Extracted useStateRef declarations: identifier name -> state key */
  private stateRefs: Map<string, string> = new Map();

  /**
   * Create a TranspileError with source location context from a node
   */
  private createError(message: string, node: Node): TranspileError {
    const location = getNodeLocation(node);
    const sourceCode = getSourceCode(node.getSourceFile());
    return new TranspileError(message, location, sourceCode);
  }

  /**
   * Transform a root JSX element/fragment into a DocumentNode, AgentDocumentNode, SkillDocumentNode, MCPConfigDocumentNode, or StateDocumentNode
   *
   * @param node - The root JSX element/fragment to transform
   * @param sourceFile - Optional source file for component composition resolution
   */
  transform(node: JsxElement | JsxSelfClosingElement | JsxFragment, sourceFile?: SourceFile): DocumentNode | AgentDocumentNode | SkillDocumentNode | MCPConfigDocumentNode | StateDocumentNode {
    // Initialize state for this transformation
    this.sourceFile = sourceFile;
    this.visitedPaths = new Set();
    this.variables = new Map();
    this.outputs = new Map();
    this.stateRefs = new Map();

    if (sourceFile) {
      this.visitedPaths.add(sourceFile.getFilePath());
      // Extract useVariable declarations before JSX processing
      this.variables = extractVariableDeclarations(sourceFile);
      // Extract useOutput declarations for OnStatus tracking
      this.outputs = this.extractOutputDeclarations(sourceFile);
      // Extract useStateRef declarations for ReadState/WriteState tracking
      this.stateRefs = this.extractStateRefDeclarations(sourceFile);
    }

    // Check for Command, Agent, Skill, or MCPConfig wrapper at root level
    if (Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)) {
      const name = getElementName(node);
      if (name === 'Command') {
        return this.transformCommand(node);
      }
      if (name === 'Agent') {
        return this.transformAgent(node);
      }
      if (name === 'Skill') {
        return this.transformSkill(node);
      }
      if (name === 'MCPConfig') {
        return this.transformMCPConfig(node);
      }
      if (name === 'State') {
        return this.transformState(node);
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

    // Transform children - check for render props pattern
    let children: BlockNode[] = [];
    if (Node.isJsxElement(node)) {
      const renderPropsInfo = analyzeRenderPropsChildren(node);

      if (renderPropsInfo.isRenderProps && renderPropsInfo.arrowFunction) {
        // Render props pattern: transform arrow function body
        children = this.transformArrowFunctionBody(renderPropsInfo.arrowFunction);
      } else {
        // Regular children pattern
        children = this.transformBlockChildren(node.getJsxChildren());
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

    // Extract generic type arguments if present (TInput, TOutput)
    const typeArgs = extractTypeArguments(node);
    let inputType: TypeReference | undefined;
    let outputType: TypeReference | undefined;

    if (typeArgs && typeArgs.length > 0) {
      inputType = {
        kind: 'typeReference',
        name: typeArgs[0],
        resolved: false,  // Will be resolved in validation phase
      };
    }
    if (typeArgs && typeArgs.length > 1) {
      outputType = {
        kind: 'typeReference',
        name: typeArgs[1],
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
      ...(outputType && { outputType }),
    };

    // Transform children - check for render props pattern
    let children: BlockNode[] = [];
    if (Node.isJsxElement(node)) {
      const renderPropsInfo = analyzeRenderPropsChildren(node);

      if (renderPropsInfo.isRenderProps && renderPropsInfo.arrowFunction) {
        // Render props pattern: transform arrow function body
        children = this.transformArrowFunctionBody(renderPropsInfo.arrowFunction);
      } else {
        // Regular children pattern
        children = this.transformBlockChildren(node.getJsxChildren());
      }
    }

    return { kind: 'agentDocument', frontmatter, children };
  }

  /**
   * Transform a Skill element to SkillDocumentNode with frontmatter, body, files, and statics
   */
  private transformSkill(node: JsxElement | JsxSelfClosingElement): SkillDocumentNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    // Extract required props
    const name = getAttributeValue(openingElement, 'name');
    const description = getAttributeValue(openingElement, 'description');

    if (!name) {
      throw this.createError('Skill requires name prop', openingElement);
    }
    if (!description) {
      throw this.createError('Skill requires description prop', openingElement);
    }

    // Validate skill name (lowercase, numbers, hyphens only)
    if (!/^[a-z0-9-]+$/.test(name)) {
      throw this.createError(
        `Skill name must be lowercase letters, numbers, and hyphens only: '${name}'`,
        openingElement
      );
    }

    // Extract optional props
    const disableModelInvocation = this.getBooleanAttribute(openingElement, 'disableModelInvocation');
    const userInvocable = this.getBooleanAttribute(openingElement, 'userInvocable');
    const allowedTools = getArrayAttributeValue(openingElement, 'allowedTools');
    const argumentHint = getAttributeValue(openingElement, 'argumentHint');
    const model = getAttributeValue(openingElement, 'model');
    const context = getAttributeValue(openingElement, 'context') as 'fork' | undefined;
    const agent = getAttributeValue(openingElement, 'agent');

    // Build frontmatter
    const frontmatter: SkillFrontmatterNode = {
      kind: 'skillFrontmatter',
      name,
      description,
      ...(disableModelInvocation !== undefined && { disableModelInvocation }),
      ...(userInvocable !== undefined && { userInvocable }),
      ...(allowedTools && allowedTools.length > 0 && { allowedTools }),
      ...(argumentHint && { argumentHint }),
      ...(model && { model }),
      ...(context && { context }),
      ...(agent && { agent }),
    };

    // Process children: separate body content, SkillFile, and SkillStatic
    const { children, files, statics } = this.processSkillChildren(node);

    return {
      kind: 'skillDocument',
      frontmatter,
      children,
      files,
      statics,
    };
  }

  /**
   * Process Skill children into body content, SkillFile nodes, and SkillStatic nodes
   */
  private processSkillChildren(node: JsxElement | JsxSelfClosingElement): {
    children: BlockNode[];
    files: SkillFileNode[];
    statics: SkillStaticNode[];
  } {
    if (Node.isJsxSelfClosingElement(node)) {
      return { children: [], files: [], statics: [] };
    }

    const children: BlockNode[] = [];
    const files: SkillFileNode[] = [];
    const statics: SkillStaticNode[] = [];
    const jsxChildren = node.getJsxChildren();

    for (const child of jsxChildren) {
      // Skip whitespace-only text
      if (Node.isJsxText(child)) {
        const text = extractText(child);
        if (!text) continue;
      }

      if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
        const childName = getElementName(child);

        if (childName === 'SkillFile') {
          files.push(this.transformSkillFile(child));
          continue;
        }

        if (childName === 'SkillStatic') {
          statics.push(this.transformSkillStatic(child));
          continue;
        }
      }

      // Regular body content
      const block = this.transformToBlock(child);
      if (block) children.push(block);
    }

    return { children, files, statics };
  }

  /**
   * Transform SkillFile element to SkillFileNode
   */
  private transformSkillFile(node: JsxElement | JsxSelfClosingElement): SkillFileNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    const name = getAttributeValue(openingElement, 'name');
    if (!name) {
      throw this.createError('SkillFile requires name prop', openingElement);
    }

    // Transform children as file content
    const children = Node.isJsxElement(node)
      ? this.transformBlockChildren(node.getJsxChildren())
      : [];

    return {
      kind: 'skillFile',
      name,
      children,
    };
  }

  /**
   * Transform SkillStatic element to SkillStaticNode
   */
  private transformSkillStatic(node: JsxElement | JsxSelfClosingElement): SkillStaticNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    const src = getAttributeValue(openingElement, 'src');
    if (!src) {
      throw this.createError('SkillStatic requires src prop', openingElement);
    }

    const dest = getAttributeValue(openingElement, 'dest');

    return {
      kind: 'skillStatic',
      src,
      ...(dest && { dest }),
    };
  }

  /**
   * Get boolean attribute value from JSX element
   * Handles: disableModelInvocation (true), disableModelInvocation={true}, disableModelInvocation={false}
   */
  private getBooleanAttribute(
    element: JsxOpeningElement | JsxSelfClosingElement,
    name: string
  ): boolean | undefined {
    const attr = element.getAttribute(name);
    if (!attr || !Node.isJsxAttribute(attr)) return undefined;

    const init = attr.getInitializer();
    // Boolean attribute without value: disableModelInvocation (means true)
    if (!init) return true;

    // JSX expression: disableModelInvocation={true}
    if (Node.isJsxExpression(init)) {
      const expr = init.getExpression();
      if (expr && (expr.getText() === 'true' || expr.getText() === 'false')) {
        return expr.getText() === 'true';
      }
    }

    return undefined;
  }

  private transformFragmentChildren(node: JsxFragment): BlockNode[] {
    // Use helper for If/Else sibling detection
    return this.transformBlockChildren(node.getJsxChildren());
  }

  /**
   * Transform arrow function body to IR blocks
   * Handles both block body { return ... } and expression body
   */
  private transformArrowFunctionBody(arrowFn: import('ts-morph').ArrowFunction): BlockNode[] {
    const body = arrowFn.getBody();

    // Handle block body: { return <div>...</div>; }
    if (Node.isBlock(body)) {
      const returnStmt = body.getStatements()
        .find(stmt => Node.isReturnStatement(stmt));

      if (returnStmt && Node.isReturnStatement(returnStmt)) {
        const returnExpr = returnStmt.getExpression();
        if (returnExpr) {
          // Check if it's JSX
          if (Node.isJsxElement(returnExpr) || Node.isJsxSelfClosingElement(returnExpr)) {
            const block = this.transformToBlock(returnExpr);
            return block ? [block] : [];
          }
          if (Node.isJsxFragment(returnExpr)) {
            return this.transformFragmentChildren(returnExpr);
          }
          // Handle parenthesized JSX: return (<div>...</div>)
          if (Node.isParenthesizedExpression(returnExpr)) {
            const inner = returnExpr.getExpression();
            if (Node.isJsxElement(inner) || Node.isJsxSelfClosingElement(inner)) {
              const block = this.transformToBlock(inner);
              return block ? [block] : [];
            }
            if (Node.isJsxFragment(inner)) {
              return this.transformFragmentChildren(inner);
            }
          }
        }
      }
      return [];
    }

    // Handle expression body: (ctx) => <div>...</div>
    if (Node.isJsxElement(body) || Node.isJsxSelfClosingElement(body)) {
      const block = this.transformToBlock(body);
      return block ? [block] : [];
    }
    if (Node.isJsxFragment(body)) {
      return this.transformFragmentChildren(body);
    }
    // Handle parenthesized expression body: (ctx) => (<div>...</div>)
    if (Node.isParenthesizedExpression(body)) {
      const inner = body.getExpression();
      if (Node.isJsxElement(inner) || Node.isJsxSelfClosingElement(inner)) {
        const block = this.transformToBlock(inner);
        return block ? [block] : [];
      }
      if (Node.isJsxFragment(inner)) {
        return this.transformFragmentChildren(inner);
      }
    }

    return [];
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

    // OnStatus component - status-based conditional block
    if (name === 'OnStatus') {
      return this.transformOnStatus(node);
    }

    // ReadState component - read state from registry
    if (name === 'ReadState') {
      return this.transformReadState(node);
    }

    // WriteState component - write state to registry
    if (name === 'WriteState') {
      return this.transformWriteState(node);
    }

    // Table component - structured props
    if (name === 'Table') {
      return this.transformTable(node);
    }

    // List component - structured props
    if (name === 'List') {
      return this.transformPropList(node);
    }

    // Semantic workflow components
    if (name === 'ExecutionContext') {
      return this.transformExecutionContext(node);
    }

    if (name === 'SuccessCriteria') {
      return this.transformSuccessCriteria(node);
    }

    if (name === 'OfferNext') {
      return this.transformOfferNext(node);
    }

    if (name === 'XmlSection') {
      return this.transformXmlSection(node);
    }

    if (name === 'DeviationRules' || name === 'CommitRules' || name === 'WaveExecution' || name === 'CheckpointHandling') {
      return this.transformXmlWrapper(name, node);
    }

    // Step workflow primitive
    if (name === 'Step') {
      return this.transformStep(node);
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

    // Handle JSX expressions
    if (Node.isJsxExpression(node)) {
      const expr = node.getExpression();
      if (!expr) return null;

      // String literals: {' '} or {'text'}
      if (Node.isStringLiteral(expr)) {
        const value = expr.getLiteralValue();
        if (value) {
          return { kind: 'text', value };
        }
        return null;
      }

      // Call expressions: output.field('key') -> '{output.key}'
      if (Node.isCallExpression(expr)) {
        const propAccess = expr.getExpression();
        // Check if it's a method call like output.field('key')
        if (Node.isPropertyAccessExpression(propAccess)) {
          const methodName = propAccess.getName();
          const objExpr = propAccess.getExpression();

          // Check if it's calling .field() on a useOutput result
          if (methodName === 'field' && Node.isIdentifier(objExpr)) {
            const outputName = objExpr.getText();
            // Verify this is a tracked output
            if (this.outputs.has(outputName)) {
              // Get the field key from the argument
              const args = expr.getArguments();
              if (args.length >= 1) {
                const keyArg = args[0];
                if (Node.isStringLiteral(keyArg)) {
                  const fieldKey = keyArg.getLiteralValue();
                  return { kind: 'text', value: `{output.${fieldKey}}` };
                }
              }
            }
          }
        }
      }

      // Other expressions are ignored
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

  /**
   * Transform Table component to TableNode IR
   */
  private transformTable(node: JsxElement | JsxSelfClosingElement): TableNode {
    const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

    // Parse array props
    const headers = getArrayAttributeValue(opening, 'headers');
    const rows = this.parseRowsAttribute(opening);
    const alignRaw = getArrayAttributeValue(opening, 'align');
    const emptyCell = getAttributeValue(opening, 'emptyCell');

    // Convert align strings to typed array
    const align = alignRaw?.map(a => {
      if (a === 'left' || a === 'center' || a === 'right') return a;
      return 'left'; // Default invalid values to left
    }) as ('left' | 'center' | 'right')[] | undefined;

    return {
      kind: 'table',
      headers: headers?.length ? headers : undefined,
      rows: rows,
      align: align,
      emptyCell: emptyCell || undefined,
    };
  }

  /**
   * Parse rows attribute (array of arrays)
   */
  private parseRowsAttribute(opening: JsxOpeningElement | JsxSelfClosingElement): string[][] {
    const attr = opening.getAttribute('rows');
    if (!attr || !Node.isJsxAttribute(attr)) return [];

    const init = attr.getInitializer();
    if (!init || !Node.isJsxExpression(init)) return [];

    const expr = init.getExpression();
    if (!expr || !Node.isArrayLiteralExpression(expr)) return [];

    const rows: string[][] = [];
    for (const element of expr.getElements()) {
      if (Node.isArrayLiteralExpression(element)) {
        const row: string[] = [];
        for (const cell of element.getElements()) {
          // Handle string literals, numbers, and expressions
          if (Node.isStringLiteral(cell)) {
            row.push(cell.getLiteralValue());
          } else if (Node.isNumericLiteral(cell)) {
            row.push(cell.getLiteralValue().toString());
          } else {
            row.push(cell.getText());
          }
        }
        rows.push(row);
      }
    }
    return rows;
  }

  /**
   * Transform List component (prop-based) to ListNode IR
   * This is separate from HTML <ul>/<ol> transformation
   */
  private transformPropList(node: JsxElement | JsxSelfClosingElement): ListNode {
    const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

    // Parse props
    const items = getArrayAttributeValue(opening, 'items') ?? [];
    const ordered = getAttributeValue(opening, 'ordered') === 'true' ||
                    opening.getAttribute('ordered') !== undefined; // Handle boolean attr

    // Parse start attribute (numeric)
    let start: number | undefined = undefined;
    const startAttr = opening.getAttribute('start');
    if (startAttr && Node.isJsxAttribute(startAttr)) {
      const init = startAttr.getInitializer();
      if (init && Node.isJsxExpression(init)) {
        const expr = init.getExpression();
        if (expr && Node.isNumericLiteral(expr)) {
          start = expr.getLiteralValue();
        }
      }
    }

    // Convert items to ListItemNode[]
    const listItems: ListItemNode[] = items.map(item => ({
      kind: 'listItem' as const,
      children: [{
        kind: 'paragraph' as const,
        children: [{ kind: 'text' as const, value: String(item) }]
      }]
    }));

    return {
      kind: 'list',
      ordered,
      items: listItems,
      start,
    };
  }

  // ============================================================================
  // Semantic Workflow Components
  // ============================================================================

  private transformExecutionContext(node: JsxElement | JsxSelfClosingElement): ExecutionContextNode {
    const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

    const paths = getArrayAttributeValue(opening, 'paths') ?? [];
    const prefix = getAttributeValue(opening, 'prefix') ?? '@';

    // Transform children if present
    const children: BlockNode[] = [];
    if (Node.isJsxElement(node)) {
      for (const child of node.getJsxChildren()) {
        const block = this.transformToBlock(child);
        if (block) children.push(block);
      }
    }

    return {
      kind: 'executionContext',
      paths,
      prefix,
      children,
    };
  }

  private transformSuccessCriteria(node: JsxElement | JsxSelfClosingElement): SuccessCriteriaNode {
    const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

    const items = this.parseSuccessCriteriaItems(opening);

    return {
      kind: 'successCriteria',
      items,
    };
  }

  /**
   * Parse items attribute for SuccessCriteria
   * Handles both string shorthand and {text, checked} objects
   */
  private parseSuccessCriteriaItems(opening: JsxOpeningElement | JsxSelfClosingElement): SuccessCriteriaItemData[] {
    const attr = opening.getAttribute('items');
    if (!attr || !Node.isJsxAttribute(attr)) return [];

    const init = attr.getInitializer();
    if (!init || !Node.isJsxExpression(init)) return [];

    const expr = init.getExpression();
    if (!expr || !Node.isArrayLiteralExpression(expr)) return [];

    const items: SuccessCriteriaItemData[] = [];
    for (const element of expr.getElements()) {
      if (Node.isStringLiteral(element)) {
        // String shorthand: "item text"
        items.push({ text: element.getLiteralValue(), checked: false });
      } else if (Node.isObjectLiteralExpression(element)) {
        // Object: { text: "...", checked: true }
        let text = '';
        let checked = false;

        for (const prop of element.getProperties()) {
          if (Node.isPropertyAssignment(prop)) {
            const propName = prop.getName();
            const propInit = prop.getInitializer();

            if (propName === 'text' && propInit && Node.isStringLiteral(propInit)) {
              text = propInit.getLiteralValue();
            } else if (propName === 'checked' && propInit) {
              // Handle both boolean literal and truthy values
              if (propInit.getKind() === 112) { // TrueKeyword
                checked = true;
              } else if (propInit.getKind() === 97) { // FalseKeyword
                checked = false;
              }
            }
          }
        }

        items.push({ text, checked });
      }
    }

    return items;
  }

  private transformOfferNext(node: JsxElement | JsxSelfClosingElement): OfferNextNode {
    const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

    const routes = this.parseOfferNextRoutes(opening);

    return {
      kind: 'offerNext',
      routes,
    };
  }

  /**
   * Parse routes attribute for OfferNext
   * Each route is an object with name, path, and optional description
   */
  private parseOfferNextRoutes(opening: JsxOpeningElement | JsxSelfClosingElement): OfferNextRouteData[] {
    const attr = opening.getAttribute('routes');
    if (!attr || !Node.isJsxAttribute(attr)) return [];

    const init = attr.getInitializer();
    if (!init || !Node.isJsxExpression(init)) return [];

    const expr = init.getExpression();
    if (!expr || !Node.isArrayLiteralExpression(expr)) return [];

    const routes: OfferNextRouteData[] = [];
    for (const element of expr.getElements()) {
      if (Node.isObjectLiteralExpression(element)) {
        let name = '';
        let path = '';
        let description: string | undefined = undefined;

        for (const prop of element.getProperties()) {
          if (Node.isPropertyAssignment(prop)) {
            const propName = prop.getName();
            const propInit = prop.getInitializer();

            if (propInit && Node.isStringLiteral(propInit)) {
              const value = propInit.getLiteralValue();
              if (propName === 'name') {
                name = value;
              } else if (propName === 'path') {
                path = value;
              } else if (propName === 'description') {
                description = value;
              }
            }
          }
        }

        if (name && path) {
          routes.push({ name, path, description });
        }
      }
    }

    return routes;
  }

  /**
   * Transform Step component to StepNode IR
   */
  private transformStep(node: JsxElement | JsxSelfClosingElement): StepNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    // Extract required props
    const numberAttr = getAttributeValue(openingElement, 'number');
    const name = getAttributeValue(openingElement, 'name');

    if (!numberAttr) {
      throw this.createError('Step requires number prop', openingElement);
    }
    if (!name) {
      throw this.createError('Step requires name prop', openingElement);
    }

    // Extract variant with default
    const variantAttr = getAttributeValue(openingElement, 'variant');
    let variant: StepVariant = 'heading'; // Default
    if (variantAttr === 'heading' || variantAttr === 'bold' || variantAttr === 'xml') {
      variant = variantAttr;
    }

    // Transform children
    const children = Node.isJsxElement(node)
      ? this.transformBlockChildren(node.getJsxChildren())
      : [];

    return {
      kind: 'step',
      number: numberAttr,
      name,
      variant,
      children,
    };
  }

  private transformXmlSection(node: JsxElement | JsxSelfClosingElement): XmlBlockNode {
    const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

    const name = getAttributeValue(opening, 'name') ?? 'section';

    // Transform children
    const children: BlockNode[] = [];
    if (Node.isJsxElement(node)) {
      for (const child of node.getJsxChildren()) {
        const block = this.transformToBlock(child);
        if (block) children.push(block);
      }
    }

    return {
      kind: 'xmlBlock',
      name,
      children,
    };
  }

  private transformXmlWrapper(componentName: string, node: JsxElement | JsxSelfClosingElement): XmlBlockNode {
    // Convert component name to snake_case for XML tag
    const tagName = toSnakeCase(componentName);

    // Transform children
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
    // Use getTestAttributeValue to support both string literals and test helper function calls
    const test = getTestAttributeValue(openingElement, 'test', this.variables);
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
   * Extract useOutput declarations from source file
   * Returns map of identifier name -> agent name
   *
   * Uses forEachDescendant to find declarations inside function bodies,
   * following the same pattern as extractVariableDeclarations in parser.ts
   */
  private extractOutputDeclarations(sourceFile: SourceFile): Map<string, string> {
    const outputs = new Map<string, string>();

    // Find all variable declarations (including inside functions)
    sourceFile.forEachDescendant((node) => {
      if (!Node.isVariableDeclaration(node)) return;

      const init = node.getInitializer();
      if (!init || !Node.isCallExpression(init)) return;

      // Check if it's a useOutput call
      const expr = init.getExpression();
      if (!Node.isIdentifier(expr) || expr.getText() !== 'useOutput') return;

      const args = init.getArguments();
      if (args.length < 1) return;

      const agentArg = args[0];
      // Get the string literal value (agent name)
      if (Node.isStringLiteral(agentArg)) {
        const agentName = agentArg.getLiteralValue();
        const identName = node.getName();
        outputs.set(identName, agentName);
      }
    });

    return outputs;
  }

  /**
   * Extract useStateRef declarations from source file
   * Returns map of identifier name -> state key
   *
   * Uses forEachDescendant to find declarations inside function bodies,
   * following the same pattern as extractOutputDeclarations
   */
  private extractStateRefDeclarations(sourceFile: SourceFile): Map<string, string> {
    const stateRefs = new Map<string, string>();

    // Find all variable declarations (including inside functions)
    sourceFile.forEachDescendant((node) => {
      if (!Node.isVariableDeclaration(node)) return;

      const init = node.getInitializer();
      if (!init || !Node.isCallExpression(init)) return;

      // Check if it's a useStateRef call
      const expr = init.getExpression();
      if (!Node.isIdentifier(expr) || expr.getText() !== 'useStateRef') return;

      const args = init.getArguments();
      if (args.length < 1) return;

      const keyArg = args[0];
      // Get the string literal value (state key)
      if (Node.isStringLiteral(keyArg)) {
        const stateKey = keyArg.getLiteralValue();
        const identName = node.getName();
        stateRefs.set(identName, stateKey);
      }
    });

    return stateRefs;
  }

  /**
   * Transform ReadState JSX element into IR node
   *
   * Extracts:
   * - state: StateRef with key property
   * - into: VariableRef with name property
   * - field: optional nested path string
   */
  private transformReadState(node: JsxElement | JsxSelfClosingElement): ReadStateNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    // Extract state prop (StateRef object with key property)
    const stateAttr = openingElement.getAttribute('state');
    if (!stateAttr || !Node.isJsxAttribute(stateAttr)) {
      throw this.createError('ReadState requires state prop', openingElement);
    }
    const stateInit = stateAttr.getInitializer();
    if (!stateInit || !Node.isJsxExpression(stateInit)) {
      throw this.createError('ReadState state prop must be JSX expression', openingElement);
    }
    // Extract key from StateRef: { key: "..." }
    const stateExpr = stateInit.getExpression();
    if (!stateExpr) {
      throw this.createError('ReadState state prop expression is empty', openingElement);
    }
    // Get the identifier name, then resolve to find the key
    const stateKey = this.extractStateKey(stateExpr, openingElement);

    // Extract into prop (VariableRef)
    const intoAttr = openingElement.getAttribute('into');
    if (!intoAttr || !Node.isJsxAttribute(intoAttr)) {
      throw this.createError('ReadState requires into prop', openingElement);
    }
    const intoInit = intoAttr.getInitializer();
    if (!intoInit || !Node.isJsxExpression(intoInit)) {
      throw this.createError('ReadState into prop must be JSX expression', openingElement);
    }
    const intoExpr = intoInit.getExpression();
    if (!intoExpr) {
      throw this.createError('ReadState into prop expression is empty', openingElement);
    }
    const variableName = this.extractVariableName(intoExpr, openingElement);

    // Extract optional field prop (string)
    const fieldAttr = openingElement.getAttribute('field');
    let field: string | undefined;
    if (fieldAttr && Node.isJsxAttribute(fieldAttr)) {
      const fieldInit = fieldAttr.getInitializer();
      if (fieldInit && Node.isStringLiteral(fieldInit)) {
        field = fieldInit.getLiteralText();
      }
    }

    return {
      kind: 'readState',
      stateKey,
      variableName,
      field,
    };
  }

  /**
   * Extract state key from StateRef expression
   * Handles: identifier pointing to useStateRef result
   */
  private extractStateKey(expr: Node, element: JsxOpeningElement | JsxSelfClosingElement): string {
    // Handle identifier (e.g., projectState from useStateRef)
    if (Node.isIdentifier(expr)) {
      const name = expr.getText();
      // Look up in tracked state refs (similar to variables tracking)
      const tracked = this.stateRefs.get(name);
      if (tracked) return tracked;
      // Not found - error
      throw this.createError(
        `State reference '${name}' not found. Did you declare it with useStateRef()?`,
        element
      );
    }
    throw this.createError(`Cannot extract state key from: ${expr.getText()}`, element);
  }

  /**
   * Extract variable name from VariableRef expression
   * Handles: identifier pointing to useVariable result
   */
  private extractVariableName(expr: Node, element: JsxOpeningElement | JsxSelfClosingElement): string {
    // Handle identifier (e.g., nameVar from useVariable)
    if (Node.isIdentifier(expr)) {
      const name = expr.getText();
      // Look up in tracked variables
      const tracked = this.variables.get(name);
      if (tracked) return tracked.envName;
      // Not found - error
      throw this.createError(
        `Variable '${name}' not found. Did you declare it with useVariable()?`,
        element
      );
    }
    throw this.createError(`Cannot extract variable name from: ${expr.getText()}`, element);
  }

  /**
   * Transform WriteState JSX element into IR node
   *
   * Two modes:
   * 1. Field mode: field="path" value={val}
   * 2. Merge mode: merge={partial}
   */
  private transformWriteState(node: JsxElement | JsxSelfClosingElement): WriteStateNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    // Extract state prop (required)
    const stateAttr = openingElement.getAttribute('state');
    if (!stateAttr || !Node.isJsxAttribute(stateAttr)) {
      throw this.createError('WriteState requires state prop', openingElement);
    }
    const stateInit = stateAttr.getInitializer();
    if (!stateInit || !Node.isJsxExpression(stateInit)) {
      throw this.createError('WriteState state prop must be JSX expression', openingElement);
    }
    const stateExpr = stateInit.getExpression();
    if (!stateExpr) {
      throw this.createError('WriteState state prop expression is empty', openingElement);
    }
    const stateKey = this.extractStateKey(stateExpr, openingElement);

    // Check for field prop (field mode)
    const fieldAttr = openingElement.getAttribute('field');
    const mergeAttr = openingElement.getAttribute('merge');

    if (fieldAttr && Node.isJsxAttribute(fieldAttr)) {
      // Field mode: field + value
      const fieldInit = fieldAttr.getInitializer();
      if (!fieldInit || !Node.isStringLiteral(fieldInit)) {
        throw this.createError('WriteState field prop must be string literal', openingElement);
      }
      const field = fieldInit.getLiteralText();

      // Extract value prop
      const valueAttr = openingElement.getAttribute('value');
      if (!valueAttr || !Node.isJsxAttribute(valueAttr)) {
        throw this.createError('WriteState with field requires value prop', openingElement);
      }
      const valueInit = valueAttr.getInitializer();
      if (!valueInit) {
        throw this.createError('WriteState value prop is empty', openingElement);
      }

      let value: { type: 'variable' | 'literal'; content: string };
      if (Node.isStringLiteral(valueInit)) {
        value = { type: 'literal', content: valueInit.getLiteralText() };
      } else if (Node.isJsxExpression(valueInit)) {
        const valueExpr = valueInit.getExpression();
        if (!valueExpr) {
          throw this.createError('WriteState value expression is empty', openingElement);
        }
        // Check if it's a variable reference
        if (Node.isIdentifier(valueExpr)) {
          const varName = valueExpr.getText();
          const tracked = this.variables.get(varName);
          if (tracked) {
            value = { type: 'variable', content: tracked.envName };
          } else {
            // Not a tracked variable - treat as literal expression text
            value = { type: 'literal', content: valueExpr.getText() };
          }
        } else {
          // Treat as literal expression
          value = { type: 'literal', content: valueExpr.getText() };
        }
      } else {
        throw this.createError('WriteState value must be string or expression', openingElement);
      }

      return {
        kind: 'writeState',
        stateKey,
        mode: 'field',
        field,
        value,
      };
    } else if (mergeAttr && Node.isJsxAttribute(mergeAttr)) {
      // Merge mode
      const mergeInit = mergeAttr.getInitializer();
      if (!mergeInit || !Node.isJsxExpression(mergeInit)) {
        throw this.createError('WriteState merge prop must be JSX expression', openingElement);
      }
      const mergeExpr = mergeInit.getExpression();
      if (!mergeExpr) {
        throw this.createError('WriteState merge expression is empty', openingElement);
      }

      // For merge, we serialize the object literal to JSON
      // This supports simple object literals at compile time
      const content = mergeExpr.getText();

      return {
        kind: 'writeState',
        stateKey,
        mode: 'merge',
        value: { type: 'literal', content },
      };
    } else {
      throw this.createError('WriteState requires either field+value or merge prop', openingElement);
    }
  }

  /**
   * Transform an OnStatus element to OnStatusNode
   * OnStatus is a block-level element that emits status-based conditionals
   */
  private transformOnStatus(node: JsxElement | JsxSelfClosingElement): OnStatusNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    // Extract output prop (required) - must be a JSX expression referencing an identifier
    const outputAttr = openingElement.getAttribute('output');
    if (!outputAttr || !Node.isJsxAttribute(outputAttr)) {
      throw this.createError('OnStatus requires output prop', openingElement);
    }

    const outputInit = outputAttr.getInitializer();
    if (!outputInit || !Node.isJsxExpression(outputInit)) {
      throw this.createError('OnStatus output must be a JSX expression: output={outputRef}', openingElement);
    }

    const outputExpr = outputInit.getExpression();
    if (!outputExpr || !Node.isIdentifier(outputExpr)) {
      throw this.createError('OnStatus output must reference a useOutput result', openingElement);
    }

    // Get the identifier text
    const outputIdentifier = outputExpr.getText();

    // Look up agent name from outputs map
    const agentName = this.outputs.get(outputIdentifier);
    if (!agentName) {
      throw this.createError(
        `Output '${outputIdentifier}' not found. Did you declare it with useOutput()?`,
        openingElement
      );
    }

    // Extract status prop (required)
    const status = getAttributeValue(openingElement, 'status');
    if (!status) {
      throw this.createError('OnStatus requires status prop', openingElement);
    }

    // Validate status is one of the allowed values
    const validStatuses = ['SUCCESS', 'BLOCKED', 'NOT_FOUND', 'ERROR', 'CHECKPOINT'];
    if (!validStatuses.includes(status)) {
      throw this.createError(
        `OnStatus status must be one of: ${validStatuses.join(', ')}. Got: ${status}`,
        openingElement
      );
    }

    // Transform children as block content
    const children = Node.isJsxElement(node)
      ? this.transformBlockChildren(node.getJsxChildren())
      : [];

    return {
      kind: 'onStatus',
      outputRef: {
        kind: 'outputReference',
        agent: agentName,
      },
      status: status as OnStatusNode['status'],
      children,
    };
  }

  // ============================================================================
  // MCP Configuration Transformation
  // ============================================================================

  /**
   * Transform an MCPConfig element to MCPConfigDocumentNode
   * MCPConfig wraps multiple MCPServer elements into a single document
   */
  private transformMCPConfig(node: JsxElement | JsxSelfClosingElement): MCPConfigDocumentNode {
    const servers: MCPServerNode[] = [];

    // Process children - expect MCPServer elements
    if (Node.isJsxElement(node)) {
      for (const child of node.getJsxChildren()) {
        // Skip whitespace-only text
        if (Node.isJsxText(child)) {
          const text = extractText(child);
          if (!text) continue;
        }

        if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
          const tagName = getElementName(child);

          if (tagName === 'MCPServer' || tagName === 'MCPStdioServer' || tagName === 'MCPHTTPServer') {
            servers.push(this.transformMCPServer(child));
          } else {
            throw this.createError(
              `MCPConfig can only contain MCPServer, MCPStdioServer, or MCPHTTPServer elements. Got: <${tagName}>`,
              child
            );
          }
        }
      }
    }

    if (servers.length === 0) {
      throw this.createError('MCPConfig must contain at least one MCP server', node);
    }

    return {
      kind: 'mcpConfigDocument',
      servers,
    };
  }

  /**
   * Transform an MCPServer, MCPStdioServer, or MCPHTTPServer element to MCPServerNode
   * Validates prop combinations at compile time based on transport type
   */
  private transformMCPServer(node: JsxElement | JsxSelfClosingElement): MCPServerNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    const tagName = getElementName(node);

    // Get name (required for all)
    const name = getAttributeValue(openingElement, 'name');
    if (!name) {
      throw this.createError(`${tagName} requires name prop`, openingElement);
    }

    // Determine type based on tag name or explicit prop
    let type: 'stdio' | 'http' | 'sse';
    if (tagName === 'MCPStdioServer') {
      type = 'stdio';
    } else if (tagName === 'MCPHTTPServer') {
      type = 'http';
    } else {
      const typeProp = getAttributeValue(openingElement, 'type') as 'stdio' | 'http' | 'sse' | undefined;
      if (!typeProp) {
        throw this.createError('MCPServer requires type prop', openingElement);
      }
      if (!['stdio', 'http', 'sse'].includes(typeProp)) {
        throw this.createError(
          `MCPServer type must be 'stdio', 'http', or 'sse'. Got: '${typeProp}'`,
          openingElement
        );
      }
      type = typeProp;
    }

    // Type-specific validation and extraction
    if (type === 'stdio') {
      const command = getAttributeValue(openingElement, 'command');
      if (!command) {
        throw this.createError(
          `${tagName} type="stdio" requires command prop`,
          openingElement
        );
      }
      if (getAttributeValue(openingElement, 'url')) {
        throw this.createError(
          `${tagName} type="stdio" cannot have url prop`,
          openingElement
        );
      }
      if (this.hasAttribute(openingElement, 'headers')) {
        throw this.createError(
          `${tagName} type="stdio" cannot have headers prop`,
          openingElement
        );
      }

      // Extract stdio-specific props
      const args = this.extractArrayAttribute(openingElement, 'args');
      const env = this.extractObjectAttribute(openingElement, 'env');

      const result: MCPServerNode = {
        kind: 'mcpServer',
        name,
        type,
        command,
      };
      if (args) result.args = args;
      if (env) result.env = env;
      return result;
    } else {
      // http or sse
      const url = getAttributeValue(openingElement, 'url');
      if (!url) {
        throw this.createError(
          `${tagName} type="${type}" requires url prop`,
          openingElement
        );
      }
      if (getAttributeValue(openingElement, 'command')) {
        throw this.createError(
          `${tagName} type="${type}" cannot have command prop`,
          openingElement
        );
      }
      if (this.hasAttribute(openingElement, 'args')) {
        throw this.createError(
          `${tagName} type="${type}" cannot have args prop`,
          openingElement
        );
      }

      // Extract http/sse-specific props
      const headers = this.extractObjectAttribute(openingElement, 'headers');

      const result: MCPServerNode = {
        kind: 'mcpServer',
        name,
        type,
        url,
      };
      if (headers) result.headers = headers;
      return result;
    }
  }

  /**
   * Check if an attribute exists on an element (regardless of value)
   */
  private hasAttribute(
    element: JsxOpeningElement | JsxSelfClosingElement,
    name: string
  ): boolean {
    const attr = element.getAttribute(name);
    return attr !== undefined;
  }

  /**
   * Extract array attribute value (e.g., args={["a", "b"]})
   */
  private extractArrayAttribute(
    openingElement: JsxOpeningElement | JsxSelfClosingElement,
    name: string
  ): string[] | undefined {
    const attr = openingElement.getAttribute(name);
    if (!attr || !Node.isJsxAttribute(attr)) return undefined;

    const initializer = attr.getInitializer();
    if (!initializer || !Node.isJsxExpression(initializer)) return undefined;

    const expr = initializer.getExpression();
    if (!expr || !Node.isArrayLiteralExpression(expr)) return undefined;

    return expr.getElements().map(el => {
      if (Node.isStringLiteral(el)) {
        return el.getLiteralText();
      }
      // Handle template literals or other expressions - preserve as-is
      return el.getText();
    });
  }

  /**
   * Extract object attribute value (e.g., env={{ KEY: "value" }})
   * Resolves process.env.X references at build time
   */
  private extractObjectAttribute(
    openingElement: JsxOpeningElement | JsxSelfClosingElement,
    name: string
  ): Record<string, string> | undefined {
    const attr = openingElement.getAttribute(name);
    if (!attr || !Node.isJsxAttribute(attr)) return undefined;

    const initializer = attr.getInitializer();
    if (!initializer || !Node.isJsxExpression(initializer)) return undefined;

    const expr = initializer.getExpression();
    if (!expr || !Node.isObjectLiteralExpression(expr)) return undefined;

    const result: Record<string, string> = {};

    for (const prop of expr.getProperties()) {
      if (!Node.isPropertyAssignment(prop)) continue;

      const key = prop.getName();
      const valueExpr = prop.getInitializer();
      if (!valueExpr) continue;

      // Handle process.env.X
      if (Node.isPropertyAccessExpression(valueExpr)) {
        const text = valueExpr.getText();
        if (text.startsWith('process.env.')) {
          const envVar = text.replace('process.env.', '');
          const envValue = process.env[envVar];
          if (envValue === undefined) {
            throw this.createError(
              `Environment variable '${envVar}' is not defined`,
              openingElement
            );
          }
          result[key] = envValue;
          continue;
        }
      }

      if (Node.isStringLiteral(valueExpr)) {
        result[key] = valueExpr.getLiteralText();
      } else {
        // Preserve expressions as-is (e.g., template literals)
        // Strip surrounding quotes if present
        result[key] = valueExpr.getText().replace(/^["']|["']$/g, '');
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
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
   *
   * Supports three assignment types (exactly one required):
   * - bash: VAR=$(command)
   * - value: VAR=value (quoted if spaces)
   * - env: VAR=$ENV_VAR
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

    // Look up in extracted variables to get the env name
    const variable = this.variables.get(localName);
    if (!variable) {
      throw this.createError(
        `Variable '${localName}' not found. Did you declare it with useVariable()?`,
        openingElement
      );
    }

    // Extract assignment from props (exactly one of bash, value, env)
    const bashProp = this.extractAssignPropValue(openingElement, 'bash');
    const valueProp = this.extractAssignPropValue(openingElement, 'value');
    const envProp = this.extractAssignPropValue(openingElement, 'env');

    const propCount = [bashProp, valueProp, envProp].filter(p => p !== undefined).length;
    if (propCount === 0) {
      throw this.createError(
        'Assign requires one of: bash, value, or env prop',
        openingElement
      );
    }
    if (propCount > 1) {
      throw this.createError(
        'Assign accepts only one of: bash, value, or env prop',
        openingElement
      );
    }

    let assignment: { type: 'bash' | 'value' | 'env'; content: string };
    if (bashProp !== undefined) {
      assignment = { type: 'bash', content: bashProp };
    } else if (valueProp !== undefined) {
      assignment = { type: 'value', content: valueProp };
    } else {
      assignment = { type: 'env', content: envProp! };
    }

    return {
      kind: 'assign',
      variableName: variable.envName,
      assignment,
    };
  }

  /**
   * Extract assignment prop value from Assign element
   * Handles string literals, JSX expressions with strings, and template literals
   */
  private extractAssignPropValue(
    element: JsxOpeningElement | JsxSelfClosingElement,
    propName: string
  ): string | undefined {
    const attr = element.getAttribute(propName);
    if (!attr || !Node.isJsxAttribute(attr)) return undefined;

    const init = attr.getInitializer();
    if (!init) return undefined;

    // String literal: prop="value"
    if (Node.isStringLiteral(init)) {
      return init.getLiteralValue();
    }

    // JSX expression: prop={...}
    if (Node.isJsxExpression(init)) {
      const expr = init.getExpression();
      if (!expr) return undefined;

      // String literal: prop={"value"}
      if (Node.isStringLiteral(expr)) {
        return expr.getLiteralValue();
      }

      // Template literal without substitution: prop={`value`}
      if (Node.isNoSubstitutionTemplateLiteral(expr)) {
        return expr.getLiteralValue();
      }

      // Template expression with substitution: prop={`ls ${VAR}`}
      if (Node.isTemplateExpression(expr)) {
        return this.extractBashTemplate(expr);
      }
    }

    return undefined;
  }

  /**
   * Extract template literal content preserving ${VAR} syntax for bash
   */
  private extractBashTemplate(expr: TemplateExpression): string {
    const parts: string[] = [];

    // Head: text before first ${...}
    parts.push(expr.getHead().getLiteralText());

    // Spans: each has expression + literal text after
    for (const span of expr.getTemplateSpans()) {
      const spanExpr = span.getExpression();
      // Preserve ${...} syntax for bash
      parts.push(`\${${spanExpr.getText()}}`);
      parts.push(span.getLiteral().getLiteralText());
    }

    return parts.join('');
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

  // ============================================================================
  // State Document Transformation
  // ============================================================================

  /**
   * Transform a State component into StateDocumentNode
   */
  private transformState(node: JsxElement | JsxSelfClosingElement): StateDocumentNode {
    const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

    // Extract required props
    const name = getAttributeValue(opening, 'name');
    if (!name) {
      throw this.createError('State component requires name prop', node);
    }

    const provider = getAttributeValue(opening, 'provider');
    if (provider !== 'sqlite') {
      throw this.createError('State component only supports provider="sqlite"', node);
    }

    // Extract config prop (object literal)
    const configAttr = opening.getAttribute('config');
    let database = '.state/state.db';  // default
    if (configAttr && Node.isJsxAttribute(configAttr)) {
      const init = configAttr.getInitializer();
      if (init && Node.isJsxExpression(init)) {
        const expr = init.getExpression();
        if (expr && Node.isObjectLiteralExpression(expr)) {
          for (const prop of expr.getProperties()) {
            if (Node.isPropertyAssignment(prop)) {
              const propName = prop.getName();
              if (propName === 'database') {
                const propInit = prop.getInitializer();
                if (propInit && Node.isStringLiteral(propInit)) {
                  database = propInit.getLiteralValue();
                }
              }
            }
          }
        }
      }
    }

    // Extract schema from generic type parameter
    // Note: extractTypeArguments is already imported from parser.js
    let schema: StateSchema = { interfaceName: 'unknown', fields: [] };
    if (this.sourceFile) {
      const typeArgs = extractTypeArguments(node);
      if (typeArgs && typeArgs.length > 0) {
        const schemaTypeName = typeArgs[0];
        const extracted = extractStateSchema(this.sourceFile, schemaTypeName);
        if (extracted) {
          schema = extracted;
        } else {
          console.warn(`Warning: Could not find interface ${schemaTypeName} in source file`);
        }
      }
    }

    // Extract Operation children
    const operations: OperationNode[] = [];
    if (Node.isJsxElement(node)) {
      for (const child of node.getJsxChildren()) {
        if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
          const childName = getElementName(child);
          if (childName === 'Operation') {
            operations.push(this.transformOperation(child));
          }
        }
      }
    }

    const stateNode: StateNode = {
      kind: 'state',
      name,
      provider: 'sqlite',
      config: { database },
      schema,
      operations
    };

    return {
      kind: 'stateDocument',
      state: stateNode
    };
  }

  /**
   * Transform an Operation component into OperationNode
   */
  private transformOperation(node: JsxElement | JsxSelfClosingElement): OperationNode {
    const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

    // Extract required name prop
    const name = getAttributeValue(opening, 'name');
    if (!name) {
      throw this.createError('Operation component requires name prop', node);
    }

    // Extract SQL template from children (text content)
    let sqlTemplate = '';
    if (Node.isJsxElement(node)) {
      const parts: string[] = [];
      for (const child of node.getJsxChildren()) {
        if (Node.isJsxText(child)) {
          parts.push(child.getText());
        } else if (Node.isJsxExpression(child)) {
          // Handle template literals in expressions
          const expr = child.getExpression();
          if (expr && Node.isStringLiteral(expr)) {
            parts.push(expr.getLiteralValue());
          } else if (expr && Node.isNoSubstitutionTemplateLiteral(expr)) {
            parts.push(expr.getLiteralValue());
          }
        }
      }
      sqlTemplate = parts.join('').trim();
    }

    // Infer arguments from $variable patterns in SQL
    const args = extractSqlArguments(sqlTemplate);

    return {
      kind: 'operation',
      name,
      sqlTemplate,
      args
    };
  }
}

/**
 * Convenience function to transform a JSX element to a DocumentNode, AgentDocumentNode, SkillDocumentNode, MCPConfigDocumentNode, or StateDocumentNode
 */
export function transform(node: JsxElement | JsxSelfClosingElement | JsxFragment, sourceFile?: SourceFile): DocumentNode | AgentDocumentNode | SkillDocumentNode | MCPConfigDocumentNode | StateDocumentNode {
  const transformer = new Transformer();
  return transformer.transform(node, sourceFile);
}
