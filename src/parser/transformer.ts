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
  JsxAttribute,
  JsxSpreadAttribute,
  SourceFile,
  TemplateExpression,
  PropertyAccessExpression,
  ObjectLiteralExpression,
  BinaryExpression,
} from 'ts-morph';
import { TranspileError, getNodeLocation, getSourceCode } from '../cli/errors.js';
import type {
  BaseBlockNode,
  BlockNode,
  InlineNode,
  AgentDocumentNode,
  AgentFrontmatterNode,
  ListNode,
  ListItemNode,
  BlockquoteNode,
  CodeBlockNode,
  LinkNode,
  FrontmatterNode,
  XmlBlockNode,
  GroupNode,
  SpawnAgentNode,
  SpawnAgentInput,
  TypeReference,
  AssignNode,
  AssignGroupNode,
  IfNode,
  ElseNode,
  LoopNode,
  OnStatusNode,
  OnStatusDefaultNode,
  OutputReference,
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
  ReadFilesNode,
  ReadFileEntry,
  PromptTemplateNode,
  StructuredReturnsNode,
  ReturnStatusNode,
} from '../ir/index.js';
// Note: RoleNode, UpstreamInputNode, DownstreamConsumerNode, MethodologyNode
// are no longer needed. Those components are now composites that emit XmlBlockNode.
import { getElementName, getAttributeValue, getTestAttributeValue, extractText, extractInlineText, getArrayAttributeValue, resolveSpreadAttribute, resolveComponentImport, extractTypeArguments, extractVariableDeclarations, extractInputObjectLiteral, resolveTypeImport, extractInterfaceProperties, extractStateSchema, extractSqlArguments, analyzeRenderPropsChildren, type ExtractedVariable, type RenderPropsInfo } from './parser.js';

// Document transformers - extracted functions for Agent, Skill, MCPConfig, State
import {
  transformAgent as documentTransformAgent,
  transformSkill as documentTransformSkill,
  transformMCPConfig as documentTransformMCPConfig,
  transformState as documentTransformState,
} from './transformers/document.js';
import type { TransformContext } from './transformers/types.js';

// Swarm transformers
import { transformTaskDef, transformTaskPipeline, transformShutdownSequence } from './transformers/swarm.js';
import type { TaskDefNode, TaskPipelineNode, ShutdownSequenceNode } from '../ir/swarm-nodes.js';

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
 * Inline HTML elements that should be wrapped in paragraphs when at block level
 */
const INLINE_ELEMENTS = new Set([
  'a', 'b', 'i', 'strong', 'em', 'code', 'span', 'br',
]);

/**
 * Check if a tag name represents an inline element
 */
function isInlineElement(tagName: string): boolean {
  return INLINE_ELEMENTS.has(tagName);
}

/**
 * Special component names that are NOT custom user components
 */
const SPECIAL_COMPONENTS = new Set([
  'Command', 'Markdown', 'XmlBlock', 'Agent', 'SpawnAgent', 'Assign', 'AssignGroup', 'If', 'Else', 'Loop', 'OnStatus', 'OnStatusDefault',
  'Skill', 'SkillFile', 'SkillStatic', 'ReadState', 'WriteState',
  'MCPServer', 'MCPStdioServer', 'MCPHTTPServer', 'MCPConfig', 'State', 'Operation', 'Table', 'List',
  // Semantic workflow components
  'ExecutionContext', 'SuccessCriteria', 'OfferNext', 'XmlSection',
  'DeviationRules', 'CommitRules', 'WaveExecution', 'CheckpointHandling',
  // Step workflow primitive
  'Step',
  // Code block primitives
  'Bash',
  // File reading
  'ReadFiles',
  // Template primitives
  'PromptTemplate',
  // Swarm components
  'TaskDef', 'TaskPipeline', 'ShutdownSequence',
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

/**
 * Context values available for render props interpolation
 */
interface RenderPropsContext {
  /** Parameter name used in arrow function (e.g., 'ctx') */
  paramName: string;
  /** Context values that can be interpolated */
  values: Record<string, string>;
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
  /** Current render props context for interpolation (set during Command/Agent transformation) */
  private renderPropsContext: RenderPropsContext | undefined;

  /**
   * Create a TranspileError with source location context from a node
   */
  private createError(message: string, node: Node): TranspileError {
    const location = getNodeLocation(node);
    const sourceCode = getSourceCode(node.getSourceFile());
    return new TranspileError(message, location, sourceCode);
  }

  /**
   * Build a TransformContext from instance state for delegation to document transformers
   */
  private buildContext(): TransformContext {
    return {
      sourceFile: this.sourceFile,
      visitedPaths: this.visitedPaths,
      variables: this.variables,
      outputs: this.outputs,
      stateRefs: this.stateRefs,
      renderPropsContext: this.renderPropsContext,
      createError: this.createError.bind(this),
      // Provide V1 transformBlockChildren - ignores ctx since we use instance state
      transformBlockChildren: (children: Node[], _ctx: TransformContext) =>
        this.transformBlockChildren(children),
    };
  }

  /**
   * Transform a root JSX element/fragment into AgentDocumentNode, SkillDocumentNode, MCPConfigDocumentNode, or StateDocumentNode
   *
   * Note: Command documents use the runtime transformer (transformRuntimeCommand) for runtime feature support.
   *
   * @param node - The root JSX element/fragment to transform
   * @param sourceFile - Optional source file for component composition resolution
   */
  transform(node: JsxElement | JsxSelfClosingElement | JsxFragment, sourceFile?: SourceFile): AgentDocumentNode | SkillDocumentNode | MCPConfigDocumentNode | StateDocumentNode {
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

    // Fragment or unwrapped element: not supported in V1 transformer
    // Documents must use a wrapper component (Command, Agent, Skill, MCPConfig, State)
    // For Commands, use the runtime transformer which supports runtime features
    if (Node.isJsxFragment(node)) {
      throw new Error(
        'JSX Fragment not supported. Use a document wrapper: <Agent>, <Skill>, <MCPConfig>, <State>, or use runtime transformer for <Command>.'
      );
    }

    // Single element without wrapper
    throw new Error(
      `Unknown root element. Use a document wrapper: <Agent>, <Skill>, <MCPConfig>, <State>, or use runtime transformer for <Command>.`
    );
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
   * Transform a Command element
   *
   * NOTE: This transformer is deprecated for Commands. Commands should use the runtime transformer
   * which supports runtime features (useRuntimeVar, If/Else/Loop, etc.).
   */
  private transformCommand(node: JsxElement | JsxSelfClosingElement): never {
    throw this.createError(
      'This transformer is deprecated for Commands. Use the runtime transformer (transformRuntimeCommand) instead. ' +
      'Commands should import from react-agentic and use runtime features (useRuntimeVar, If, Else, Loop).',
      node
    );
  }

  /**
   * Transform an Agent element to AgentDocumentNode with frontmatter
   * Delegates to document.ts transformAgent()
   */
  private transformAgent(node: JsxElement | JsxSelfClosingElement): AgentDocumentNode {
    return documentTransformAgent(node, this.buildContext());
  }

  /**
   * Transform a Skill element to SkillDocumentNode with frontmatter, body, files, and statics
   * Delegates to document.ts transformSkill()
   */
  private transformSkill(node: JsxElement | JsxSelfClosingElement): SkillDocumentNode {
    return documentTransformSkill(node, this.buildContext());
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

    // AssignGroup block element (grouped variable assignments)
    if (name === 'AssignGroup') {
      return this.transformAssignGroup(node);
    }

    // If component - conditional block
    if (name === 'If') {
      return this.transformIf(node);
    }

    // Else component - standalone is an error (must follow If as sibling)
    if (name === 'Else') {
      throw this.createError('<Else> must follow <If> as sibling', node);
    }

    // Loop component - iteration block
    if (name === 'Loop') {
      return this.transformLoop(node);
    }

    // OnStatus component - status-based conditional block
    if (name === 'OnStatus') {
      return this.transformOnStatus(node);
    }

    // OnStatusDefault component - standalone is an error (must follow OnStatus as sibling OR have output prop)
    if (name === 'OnStatusDefault') {
      // Allow with explicit output prop
      const openingElement = Node.isJsxElement(node)
        ? node.getOpeningElement()
        : node;
      const hasOutputProp = openingElement.getAttribute('output');
      if (!hasOutputProp) {
        throw this.createError('<OnStatusDefault> must follow <OnStatus> as sibling or provide output prop', node);
      }
      return this.transformOnStatusDefault(node);
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

    // Bash code block primitive
    if (name === 'Bash') {
      return this.transformBash(node);
    }

    // ReadFiles - batch file reading
    if (name === 'ReadFiles') {
      return this.transformReadFiles(node);
    }

    // PromptTemplate - wrap content in markdown code fence
    if (name === 'PromptTemplate') {
      return this.transformPromptTemplate(node);
    }

    // Swarm components
    if (name === 'TaskDef') {
      return transformTaskDef(node, this.buildContext());
    }
    if (name === 'TaskPipeline') {
      return transformTaskPipeline(node, this.buildContext());
    }
    if (name === 'ShutdownSequence') {
      return transformShutdownSequence(node, this.buildContext());
    }

    // Contract components (inside Agent)
    // Role, UpstreamInput, DownstreamConsumer, Methodology are composites that wrap XmlBlock.
    // We handle them directly here to avoid requiring imports.
    if (name === 'Role') {
      const children = Node.isJsxElement(node)
        ? this.transformBlockChildren(node.getJsxChildren())
        : [];
      return { kind: 'xmlBlock', name: 'role', children: children as BaseBlockNode[] };
    }
    if (name === 'UpstreamInput') {
      const children = Node.isJsxElement(node)
        ? this.transformBlockChildren(node.getJsxChildren())
        : [];
      return { kind: 'xmlBlock', name: 'upstream_input', children: children as BaseBlockNode[] };
    }
    if (name === 'DownstreamConsumer') {
      const children = Node.isJsxElement(node)
        ? this.transformBlockChildren(node.getJsxChildren())
        : [];
      return { kind: 'xmlBlock', name: 'downstream_consumer', children: children as BaseBlockNode[] };
    }
    if (name === 'Methodology') {
      const children = Node.isJsxElement(node)
        ? this.transformBlockChildren(node.getJsxChildren())
        : [];
      return { kind: 'xmlBlock', name: 'methodology', children: children as BaseBlockNode[] };
    }
    if (name === 'StructuredReturns') {
      return this.transformStructuredReturns(node);
    }
    if (name === 'ReturnStatus' || name === 'StatusReturn') {
      // ReturnStatus/StatusReturn outside StructuredReturns - this is an error
      throw this.createError(`${name} component can only be used inside StructuredReturns`, node);
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

    return { kind: 'listItem', children: children as BaseBlockNode[] };
  }

  private transformBlockquote(node: JsxElement | JsxSelfClosingElement): BlockquoteNode {
    if (Node.isJsxSelfClosingElement(node)) {
      return { kind: 'blockquote', children: [] };
    }

    // Transform children as blocks (with If/Else sibling detection)
    const children = this.transformBlockChildren(node.getJsxChildren());

    return { kind: 'blockquote', children: children as BaseBlockNode[] };
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

      // Property access expressions: ctx.name, ctx.outputPath, etc.
      if (Node.isPropertyAccessExpression(expr)) {
        const objExpr = expr.getExpression();
        const propName = expr.getName();

        // Check if accessing render props context (e.g., ctx.name)
        if (Node.isIdentifier(objExpr) && this.renderPropsContext) {
          const objName = objExpr.getText();
          if (objName === this.renderPropsContext.paramName) {
            const value = this.renderPropsContext.values[propName];
            if (value !== undefined) {
              return { kind: 'text', value };
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

  private transformDiv(node: JsxElement | JsxSelfClosingElement): XmlBlockNode | GroupNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    // Get name attribute (optional - if missing, create invisible group)
    const nameAttr = getAttributeValue(openingElement, 'name');

    // Transform children as mixed content (inline elements get wrapped in paragraphs)
    const children = Node.isJsxElement(node)
      ? this.transformMixedChildren(node.getJsxChildren())
      : [];

    // No name attribute: invisible grouping container with tight spacing
    if (!nameAttr) {
      return {
        kind: 'group',
        children: children as BaseBlockNode[],
      };
    }

    // Has name attribute: XML block with wrapper tags
    // Validate XML name
    if (!isValidXmlName(nameAttr)) {
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

    return {
      kind: 'xmlBlock',
      name: nameAttr,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      children: children as BaseBlockNode[],
    };
  }

  /**
   * Transform mixed children (inline + block elements)
   * Consecutive inline elements and text are wrapped in a single paragraph
   * Block elements are transformed normally
   */
  private transformMixedChildren(jsxChildren: Node[]): BlockNode[] {
    const blocks: BlockNode[] = [];
    let inlineAccumulator: Node[] = [];

    const flushInline = () => {
      if (inlineAccumulator.length > 0) {
        // Transform accumulated inline content as a paragraph
        const inlineNodes = this.transformInlineNodes(inlineAccumulator);
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
        continue;
      }

      if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
        const name = getElementName(child);

        if (isInlineElement(name)) {
          // Accumulate inline elements
          inlineAccumulator.push(child);
        } else {
          // Flush any accumulated inline content before block element
          flushInline();
          // Transform block element
          const block = this.transformToBlock(child);
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

  /**
   * Transform a list of nodes to inline nodes
   * Used by transformMixedChildren for inline accumulation
   */
  private transformInlineNodes(nodes: Node[]): InlineNode[] {
    const result: InlineNode[] = [];

    for (const node of nodes) {
      if (Node.isJsxText(node)) {
        const text = extractText(node);
        if (text) {
          result.push({ kind: 'text', value: text });
        }
      } else if (Node.isJsxElement(node)) {
        const name = getElementName(node);
        const inlineNode = this.transformInlineElement(name, node);
        if (inlineNode) result.push(inlineNode);
      } else if (Node.isJsxSelfClosingElement(node)) {
        // Handle self-closing inline elements (like <br />)
        const name = getElementName(node);
        if (name === 'br') {
          result.push({ kind: 'lineBreak' });
        }
      } else if (Node.isJsxExpression(node)) {
        // Extract text from JSX expression
        const expr = node.getExpression();
        if (expr) {
          const text = expr.getText();
          // Remove surrounding quotes if it's a string literal
          const cleaned = text.replace(/^['"`]|['"`]$/g, '');
          if (cleaned) {
            result.push({ kind: 'text', value: cleaned });
          }
        }
      }
    }

    return result;
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
      children: children as BaseBlockNode[],
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
          } else if (Node.isPropertyAccessExpression(cell)) {
            // Handle context property access (e.g., ctx.name)
            const interpolated = this.interpolatePropertyAccess(cell);
            row.push(interpolated ?? cell.getText());
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
   * Interpolate a PropertyAccessExpression if it references render props context
   * Returns the interpolated value or null if not a context access
   */
  private interpolatePropertyAccess(expr: PropertyAccessExpression): string | null {
    const objExpr = expr.getExpression();
    const propName = expr.getName();

    if (Node.isIdentifier(objExpr) && this.renderPropsContext) {
      const objName = objExpr.getText();
      if (objName === this.renderPropsContext.paramName) {
        const value = this.renderPropsContext.values[propName];
        if (value !== undefined) {
          return value;
        }
      }
    }
    return null;
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
      children: children as BaseBlockNode[],
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

    // Extract number prop (supports both string and numeric literals)
    let stepNumber: string | undefined = undefined;
    const numberAttr = openingElement.getAttribute('number');
    if (numberAttr && Node.isJsxAttribute(numberAttr)) {
      const init = numberAttr.getInitializer();
      if (init) {
        // String literal: number="1.1"
        if (Node.isStringLiteral(init)) {
          stepNumber = init.getLiteralValue();
        }
        // JSX expression: number={1} or number={"1.1"}
        else if (Node.isJsxExpression(init)) {
          const expr = init.getExpression();
          if (expr) {
            if (Node.isNumericLiteral(expr)) {
              stepNumber = String(expr.getLiteralValue());
            } else if (Node.isStringLiteral(expr)) {
              stepNumber = expr.getLiteralValue();
            }
          }
        }
      }
    }

    // Extract name prop
    const name = getAttributeValue(openingElement, 'name');

    if (!stepNumber) {
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
      number: stepNumber,
      name,
      variant,
      children: children as BaseBlockNode[],
    };
  }

  /**
   * Transform <Bash> to CodeBlockNode with language 'bash'
   *
   * <Bash>ls -la</Bash>
   * becomes:
   * ```bash
   * ls -la
   * ```
   */
  private transformBash(node: JsxElement | JsxSelfClosingElement): CodeBlockNode {
    if (Node.isJsxSelfClosingElement(node)) {
      return { kind: 'codeBlock', language: 'bash', content: '' };
    }

    // Use extractCodeContent to preserve whitespace
    const content = this.extractCodeContent(node);

    return {
      kind: 'codeBlock',
      language: 'bash',
      content,
    };
  }


  /**
   * Extract path prop value, handling strings, templates, and RuntimeVar references
   *
   * Converts RuntimeVar property access to shell variable syntax:
   * - ctx.phaseDir -> $CTX_phaseDir
   * - ctx.phaseId -> $CTX_phaseId
   */
  private extractPathProp(
    element: JsxOpeningElement | JsxSelfClosingElement,
    name: string,
    node: Node
  ): string | undefined {
    const attr = element.getAttribute(name);
    if (!attr || !Node.isJsxAttribute(attr)) {
      return undefined;
    }

    const init = attr.getInitializer();
    if (!init) {
      return undefined;
    }

    // String literal: path="value"
    if (Node.isStringLiteral(init)) {
      return init.getLiteralValue();
    }

    // JSX expression: path={...}
    if (Node.isJsxExpression(init)) {
      const expr = init.getExpression();
      if (!expr) {
        return undefined;
      }

      // String literal inside expression: path={"value"}
      if (Node.isStringLiteral(expr)) {
        return expr.getLiteralValue();
      }

      // No-substitution template literal: path={`value`}
      if (Node.isNoSubstitutionTemplateLiteral(expr)) {
        return expr.getLiteralValue();
      }

      // Template expression with substitutions: path={`${ctx.phaseDir}/file.md`}
      if (Node.isTemplateExpression(expr)) {
        return this.extractPathTemplateContent(expr);
      }

      // Property access: path={ctx.phaseDir} -> $CTX_phaseDir
      if (Node.isPropertyAccessExpression(expr)) {
        return this.formatPropertyAccessAsShellVar(expr);
      }
    }

    return undefined;
  }

  /**
   * Extract template literal content, converting RuntimeVar refs to shell syntax
   *
   * Template like: `${ctx.phaseDir}/${ctx.phaseId}-RESEARCH.md`
   * Becomes: $CTX_phaseDir/$CTX_phaseId-RESEARCH.md
   */
  private extractPathTemplateContent(expr: TemplateExpression): string {
    const parts: string[] = [];

    // Head: text before first ${...}
    parts.push(expr.getHead().getLiteralText());

    // Spans: each has expression + literal text after
    for (const span of expr.getTemplateSpans()) {
      const spanExpr = span.getExpression();

      // Check if it's a property access (RuntimeVar reference)
      if (Node.isPropertyAccessExpression(spanExpr)) {
        parts.push(this.formatPropertyAccessAsShellVar(spanExpr));
      } else {
        // Preserve other expressions as ${...} syntax
        parts.push(`\${${spanExpr.getText()}}`);
      }

      parts.push(span.getLiteral().getLiteralText());
    }

    return parts.join('');
  }

  /**
   * Format property access expression as shell variable
   *
   * ctx.phaseDir -> $CTX_phaseDir
   * ctx.flags.research -> $CTX_flags_research
   */
  private formatPropertyAccessAsShellVar(expr: PropertyAccessExpression): string {
    const parts: string[] = [];
    let current: Node = expr;

    // Walk up the property access chain
    while (Node.isPropertyAccessExpression(current)) {
      const propAccess = current as PropertyAccessExpression;
      parts.unshift(propAccess.getName());
      current = propAccess.getExpression();
    }

    // Get the base identifier (e.g., 'ctx')
    if (Node.isIdentifier(current)) {
      const baseName = current.getText().toUpperCase(); // ctx -> CTX
      return `$${baseName}_${parts.join('_')}`;
    }

    // Fallback: just use the text as-is
    return `\${${expr.getText()}}`;
  }

  /**
   * Transform <ReadFiles> to ReadFilesNode
   *
   * Extracts the files prop (which should be a defineFiles() result)
   * and creates a ReadFilesNode with file entries.
   */
  private transformReadFiles(node: JsxElement | JsxSelfClosingElement): ReadFilesNode {
    const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

    // Get the 'files' prop - should be an identifier referencing defineFiles result
    const filesAttr = opening.getAttribute('files');
    if (!filesAttr || !Node.isJsxAttribute(filesAttr)) {
      throw this.createError('ReadFiles requires files prop', node);
    }

    const init = filesAttr.getInitializer();
    if (!init || !Node.isJsxExpression(init)) {
      throw this.createError('ReadFiles files prop must be a JSX expression', node);
    }

    const expr = init.getExpression();
    if (!expr) {
      throw this.createError('ReadFiles files prop expression is empty', node);
    }

    // The files prop should reference a variable that holds defineFiles() result
    // We need to trace back to find the defineFiles() call and extract its schema
    const files: ReadFileEntry[] = [];

    // If it's an identifier, look up the variable declaration
    if (Node.isIdentifier(expr)) {
      const varName = expr.getText();
      // Find the variable declaration in the source file
      const sourceFile = this.sourceFile;
      if (sourceFile) {
        const statements = sourceFile.getStatements();
        for (const stmt of statements) {
          if (Node.isVariableStatement(stmt)) {
            for (const decl of stmt.getDeclarationList().getDeclarations()) {
              if (decl.getName() === varName) {
                const initializer = decl.getInitializer();
                if (initializer && Node.isCallExpression(initializer)) {
                  const callee = initializer.getExpression();
                  if (Node.isIdentifier(callee) && callee.getText() === 'defineFiles') {
                    // Found the defineFiles call - extract the schema
                    const args = initializer.getArguments();
                    if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
                      this.extractFilesFromSchema(args[0], files);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    // If it's a call expression directly: <ReadFiles files={defineFiles({...})} />
    else if (Node.isCallExpression(expr)) {
      const callee = expr.getExpression();
      if (Node.isIdentifier(callee) && callee.getText() === 'defineFiles') {
        const args = expr.getArguments();
        if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
          this.extractFilesFromSchema(args[0], files);
        }
      }
    }

    if (files.length === 0) {
      throw this.createError('ReadFiles: could not extract files from defineFiles schema', node);
    }

    return {
      kind: 'readFiles',
      files,
    };
  }

  /**
   * Extract file entries from defineFiles schema object literal
   */
  private extractFilesFromSchema(obj: ObjectLiteralExpression, files: ReadFileEntry[]): void {
    for (const prop of obj.getProperties()) {
      if (Node.isPropertyAssignment(prop)) {
        const key = prop.getName();
        const value = prop.getInitializer();

        if (value && Node.isObjectLiteralExpression(value)) {
          // Extract path and required from the FileDef object
          let path: string | undefined;
          let required = true; // Default true

          for (const fileProp of value.getProperties()) {
            if (Node.isPropertyAssignment(fileProp)) {
              const propName = fileProp.getName();
              const propValue = fileProp.getInitializer();

              if (propName === 'path' && propValue) {
                if (Node.isStringLiteral(propValue)) {
                  path = propValue.getLiteralValue();
                } else if (Node.isNoSubstitutionTemplateLiteral(propValue)) {
                  path = propValue.getLiteralValue();
                } else if (Node.isTemplateExpression(propValue)) {
                  // Template with ${} - preserve as-is for shell interpolation
                  path = this.extractTemplatePath(propValue);
                }
              } else if (propName === 'required' && propValue) {
                if (propValue.getText() === 'false') {
                  required = false;
                }
              }
            }
          }

          if (path) {
            // Convert key to UPPER_SNAKE_CASE + _CONTENT
            const varName = key.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase() + '_CONTENT';
            files.push({ varName, path, required });
          }
        }
      }
    }
  }

  /**
   * Extract path from template expression, preserving ${} for shell
   */
  private extractTemplatePath(tmpl: TemplateExpression): string {
    let result = tmpl.getHead().getLiteralText();

    for (const span of tmpl.getTemplateSpans()) {
      const spanExpr = span.getExpression();
      // Convert TS ${expr} to shell $VAR (without braces for simplicity)
      result += '$' + spanExpr.getText();
      result += span.getLiteral().getLiteralText();
    }

    return result;
  }

  /**
   * Transform <PromptTemplate> to PromptTemplateNode
   *
   * <PromptTemplate>
   *   <XmlBlock name="objective">...</XmlBlock>
   * </PromptTemplate>
   *
   * Becomes:
   * ```markdown
   * <objective>
   * ...
   * </objective>
   * ```
   */
  private transformPromptTemplate(node: JsxElement | JsxSelfClosingElement): PromptTemplateNode {
    if (Node.isJsxSelfClosingElement(node)) {
      return { kind: 'promptTemplate', children: [] };
    }

    // Transform children normally
    const children = this.transformBlockChildren(node.getJsxChildren());

    return {
      kind: 'promptTemplate',
      children: children as BaseBlockNode[],
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
      children: children as BaseBlockNode[],
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
      children: children as BaseBlockNode[],
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
          } else if (Node.isBinaryExpression(expr)) {
            // Binary expression: string concatenation like `text ` + var + ` more`
            const concat = this.evaluateStringConcatenation(expr);
            if (concat !== null) {
              parts.push(concat);
            }
          } else if (Node.isPropertyAccessExpression(expr)) {
            // Property access: obj.prop (like AGENT_PATHS.researcher)
            // Try to resolve the value from a const declaration
            const value = this.resolvePropertyAccess(expr);
            if (value !== null) {
              parts.push(value);
            }
          }
          // Other expressions (function calls, etc.) cannot be evaluated at transpile time
        }
      }
    }

    // Trim outer boundaries, preserve internal whitespace
    const content = parts.join('').trim();

    return { kind: 'raw', content };
  }

  // Note: transformRole, transformUpstreamInput, transformDownstreamConsumer, transformMethodology
  // have been removed. Those components are now composites that wrap XmlBlock.

  private transformReturnStatus(node: JsxElement | JsxSelfClosingElement): ReturnStatusNode {
    const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

    const status = getAttributeValue(opening, 'status');
    if (!status) {
      throw this.createError('Return requires status prop', node);
    }

    const children = Node.isJsxElement(node)
      ? this.transformBlockChildren(node.getJsxChildren())
      : [];

    return {
      kind: 'returnStatus',
      status,
      children: children as BaseBlockNode[],
    };
  }

  private transformStructuredReturns(node: JsxElement | JsxSelfClosingElement): StructuredReturnsNode {
    if (Node.isJsxSelfClosingElement(node)) {
      throw this.createError('StructuredReturns must have at least one child', node);
    }

    const returns: ReturnStatusNode[] = [];

    for (const child of node.getJsxChildren()) {
      // Skip whitespace-only text
      if (Node.isJsxText(child)) {
        const text = child.getText().trim();
        if (!text) continue;
        // Non-empty text inside StructuredReturns is an error
        throw this.createError(
          'StructuredReturns can only contain StatusReturn components, not text',
          child
        );
      }

      if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
        const childName = getElementName(child);
        if (childName === 'ReturnStatus' || childName === 'StatusReturn') {
          returns.push(this.transformReturnStatus(child));
        } else {
          throw this.createError(
            `StructuredReturns can only contain StatusReturn components, not <${childName}>`,
            child
          );
        }
      }
    }

    if (returns.length === 0) {
      throw this.createError('StructuredReturns must have at least one StatusReturn child', node);
    }

    return {
      kind: 'structuredReturns',
      returns,
    };
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
   *
   * Also supports:
   * - agent={AgentRef} for type-safe agent references
   * - loadFromFile prop for "load from file" pattern
   */
  private transformSpawnAgent(node: JsxElement | JsxSelfClosingElement): SpawnAgentNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    // Extract agent prop - can be string OR AgentRef identifier
    const { agentName, agentPath } = this.extractAgentProp(openingElement);
    const model = getAttributeValue(openingElement, 'model');
    const description = getAttributeValue(openingElement, 'description');

    // Extract loadFromFile prop
    const loadFromFile = this.extractLoadFromFileProp(openingElement, agentPath);

    // Extract prompt, promptVariable, and input props
    const prompt = this.extractPromptProp(openingElement);
    const promptVariable = getAttributeValue(openingElement, 'promptVariable');
    const input = this.extractInputProp(openingElement);

    // Extract extra instructions from children (when using input prop)
    const extraInstructions = Node.isJsxElement(node)
      ? this.extractExtraInstructions(node)
      : undefined;

    // Validate required props
    if (!agentName) {
      throw this.createError('SpawnAgent requires agent prop', openingElement);
    }
    if (!model) {
      throw this.createError('SpawnAgent requires model prop', openingElement);
    }
    if (!description) {
      throw this.createError('SpawnAgent requires description prop', openingElement);
    }

    // Validate mutual exclusivity of prompt, promptVariable, and input
    const promptProps = [prompt, promptVariable, input].filter(Boolean).length;
    if (promptProps > 1) {
      throw this.createError(
        'Cannot use multiple prompt props on SpawnAgent. Use one of: prompt, promptVariable, or input.',
        openingElement
      );
    }

    // Require one of prompt, promptVariable, or input
    if (promptProps === 0) {
      throw this.createError(
        'SpawnAgent requires either prompt, promptVariable, or input prop',
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
      agent: agentName,
      model,
      description,
      ...(prompt && { prompt }),
      ...(promptVariable && { promptVariable }),
      ...(input && { input }),
      ...(extraInstructions && { extraInstructions }),
      ...(inputType && { inputType }),
      ...(loadFromFile && { loadFromFile }),
    };
  }

  /**
   * Extract agent prop - handles string OR AgentRef identifier
   *
   * Returns:
   * - agentName: The agent name string (required)
   * - agentPath: The agent's file path (if AgentRef with path)
   */
  private extractAgentProp(
    element: JsxOpeningElement | JsxSelfClosingElement
  ): { agentName: string | undefined; agentPath: string | undefined } {
    const attr = element.getAttribute('agent');
    if (!attr || !Node.isJsxAttribute(attr)) {
      return { agentName: undefined, agentPath: undefined };
    }

    const init = attr.getInitializer();

    // Case 1: String literal - agent="my-agent"
    if (init && Node.isStringLiteral(init)) {
      return { agentName: init.getLiteralValue(), agentPath: undefined };
    }

    // Case 2: JSX expression - agent={AgentRef}
    if (init && Node.isJsxExpression(init)) {
      const expr = init.getExpression();

      // Case 2a: Identifier referencing an AgentRef (e.g., agent={PhaseResearcher})
      if (expr && Node.isIdentifier(expr)) {
        const identName = expr.getText();

        // Try to resolve the identifier to find AgentRef properties
        const agentRef = this.resolveAgentRef(identName);
        if (agentRef) {
          return { agentName: agentRef.name, agentPath: agentRef.path };
        }

        // If not resolvable as AgentRef, treat identifier text as agent name
        // This allows for dynamic agent names from variables
        return { agentName: identName, agentPath: undefined };
      }

      // Case 2b: String literal in expression - agent={"my-agent"}
      if (expr && Node.isStringLiteral(expr)) {
        return { agentName: expr.getLiteralValue(), agentPath: undefined };
      }
    }

    return { agentName: undefined, agentPath: undefined };
  }

  /**
   * Try to resolve an identifier to an AgentRef definition
   *
   * Looks for:
   * 1. Imported AgentRef (from defineAgent call in source file)
   * 2. Local AgentRef constant
   */
  private resolveAgentRef(
    identName: string
  ): { name: string; path?: string } | undefined {
    if (!this.sourceFile) return undefined;

    // Find the symbol for this identifier
    const symbol = this.sourceFile.getLocal(identName);
    if (!symbol) return undefined;

    // Get the declaration
    const declarations = symbol.getDeclarations();
    if (!declarations || declarations.length === 0) return undefined;

    for (const decl of declarations) {
      // Check for import declaration
      if (Node.isImportSpecifier(decl)) {
        // Trace through import to find the defineAgent call in source file
        const resolved = this.resolveImportedAgentRef(decl, identName);
        if (resolved) return resolved;
        continue;
      }

      // Check for variable declaration with defineAgent call
      if (Node.isVariableDeclaration(decl)) {
        const init = decl.getInitializer();
        if (init && Node.isCallExpression(init)) {
          const callExpr = init.getExpression();
          if (callExpr && callExpr.getText() === 'defineAgent') {
            // Extract the config object from defineAgent({...})
            const args = init.getArguments();
            if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
              return this.extractAgentRefFromObject(args[0]);
            }
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Resolve an imported AgentRef by tracing to its source file
   */
  private resolveImportedAgentRef(
    importSpec: Node,
    identName: string
  ): { name: string; path?: string } | undefined {
    // Navigate up the tree to find ImportDeclaration
    // ImportSpecifier -> NamedImports -> ImportClause -> ImportDeclaration
    let current: Node | undefined = importSpec;
    while (current && !Node.isImportDeclaration(current)) {
      current = current.getParent();
    }

    if (!current || !Node.isImportDeclaration(current)) {
      return undefined;
    }

    const importDecl = current;

    // Resolve the source file
    const resolvedSourceFile = importDecl.getModuleSpecifierSourceFile();
    if (!resolvedSourceFile) {
      return undefined;
    }

    // Find the exported variable with the same name
    const exportedVar = resolvedSourceFile.getVariableDeclaration(identName);
    if (!exportedVar) {
      return undefined;
    }

    // Check if it's a defineAgent call
    const init = exportedVar.getInitializer();
    if (init && Node.isCallExpression(init)) {
      const callExpr = init.getExpression();
      if (callExpr && callExpr.getText() === 'defineAgent') {
        const args = init.getArguments();
        if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
          return this.extractAgentRefFromObject(args[0]);
        }
      }
    }

    return undefined;
  }

  /**
   * Extract AgentRef properties from defineAgent config object
   */
  private extractAgentRefFromObject(
    obj: ObjectLiteralExpression
  ): { name: string; path?: string } | undefined {
    let name: string | undefined;
    let path: string | undefined;

    for (const prop of obj.getProperties()) {
      if (Node.isPropertyAssignment(prop)) {
        const propName = prop.getName();
        const init = prop.getInitializer();

        if (propName === 'name' && init && Node.isStringLiteral(init)) {
          name = init.getLiteralValue();
        }
        if (propName === 'path' && init && Node.isStringLiteral(init)) {
          path = init.getLiteralValue();
        }
      }
    }

    if (name) {
      return { name, path };
    }
    return undefined;
  }

  /**
   * Extract loadFromFile prop
   *
   * Supports:
   * - loadFromFile (boolean true shorthand)
   * - loadFromFile={true}
   * - loadFromFile="explicit/path.md"
   *
   * When true, uses agentPath from AgentRef.
   * Returns resolved path string or undefined.
   */
  private extractLoadFromFileProp(
    element: JsxOpeningElement | JsxSelfClosingElement,
    agentPath: string | undefined
  ): string | undefined {
    const attr = element.getAttribute('loadFromFile');
    if (!attr || !Node.isJsxAttribute(attr)) {
      return undefined;
    }

    const init = attr.getInitializer();

    // Case 1: Boolean shorthand - loadFromFile (no value = true)
    if (!init) {
      if (!agentPath) {
        throw this.createError(
          'loadFromFile={true} requires an AgentRef with a path property. ' +
          'Either use agent={AgentRef} where AgentRef has a path, or provide an explicit path: loadFromFile="path/to/agent.md"',
          element
        );
      }
      return agentPath;
    }

    // Case 2: String literal - loadFromFile="path/to/agent.md"
    if (Node.isStringLiteral(init)) {
      return init.getLiteralValue();
    }

    // Case 3: JSX expression
    if (Node.isJsxExpression(init)) {
      const expr = init.getExpression();

      // Case 3a: Boolean true - loadFromFile={true}
      if (expr && expr.getText() === 'true') {
        if (!agentPath) {
          throw this.createError(
            'loadFromFile={true} requires an AgentRef with a path property. ' +
            'Either use agent={AgentRef} where AgentRef has a path, or provide an explicit path: loadFromFile="path/to/agent.md"',
            element
          );
        }
        return agentPath;
      }

      // Case 3b: Boolean false - loadFromFile={false}
      if (expr && expr.getText() === 'false') {
        return undefined;
      }

      // Case 3c: String literal - loadFromFile={"path/to/agent.md"}
      if (expr && Node.isStringLiteral(expr)) {
        return expr.getLiteralValue();
      }

      // Case 3d: Property access - loadFromFile={AGENT_PATHS.researcher}
      if (expr && Node.isPropertyAccessExpression(expr)) {
        const resolvedPath = this.resolvePropertyAccess(expr);
        if (resolvedPath) {
          return resolvedPath;
        }
        throw this.createError(
          `Cannot resolve property access ${expr.getText()} for loadFromFile. ` +
          'Make sure the object is a const with string literal values.',
          element
        );
      }
    }

    throw this.createError(
      'loadFromFile must be a boolean or string path',
      element
    );
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
        return { type: 'variable', varName: variable.envName };
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
   *
   * NOTE: V1 control flow is deprecated. Use V3 transformer with useRuntimeVar and condition-based If.
   */
  private transformIf(node: JsxElement | JsxSelfClosingElement): never {
    throw this.createError(
      'V1 If control flow is deprecated. Use V3 transformer with useRuntimeVar and condition-based If.',
      node
    );
  }

  /**
   * Transform an Else element to ElseNode
   *
   * NOTE: V1 control flow is deprecated. Use V3 transformer with useRuntimeVar and condition-based If/Else.
   */
  private transformElse(node: JsxElement | JsxSelfClosingElement): never {
    throw this.createError(
      'V1 Else control flow is deprecated. Use V3 transformer with useRuntimeVar and condition-based Else.',
      node
    );
  }

  /**
   * Transform Loop component to LoopNode IR
   *
   * NOTE: V1 control flow is deprecated. Use V3 transformer with useRuntimeVar and max-based Loop.
   */
  private transformLoop(node: JsxElement | JsxSelfClosingElement): never {
    throw this.createError(
      'V1 Loop control flow is deprecated. Use V3 transformer with useRuntimeVar and max-based Loop.',
      node
    );
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
      children: children as BaseBlockNode[],
    };
  }

  /**
   * Transform OnStatusDefault component to OnStatusDefaultNode
   * Handles catch-all for agent output statuses
   *
   * @param node - JSX element
   * @param outputRef - Output reference from preceding OnStatus (sibling detection) or explicit prop
   */
  private transformOnStatusDefault(
    node: JsxElement | JsxSelfClosingElement,
    outputRef?: OutputReference
  ): OnStatusDefaultNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    // Check for explicit output prop
    const outputAttr = openingElement.getAttribute('output');
    let resolvedOutputRef: OutputReference | undefined = outputRef;

    if (outputAttr && Node.isJsxAttribute(outputAttr)) {
      const outputInit = outputAttr.getInitializer();
      if (outputInit && Node.isJsxExpression(outputInit)) {
        const outputExpr = outputInit.getExpression();
        if (outputExpr && Node.isIdentifier(outputExpr)) {
          const outputIdentifier = outputExpr.getText();
          const agentName = this.outputs.get(outputIdentifier);
          if (agentName) {
            resolvedOutputRef = {
              kind: 'outputReference',
              agent: agentName,
            };
          }
        }
      }
    }

    // Validate we have an output reference
    if (!resolvedOutputRef) {
      throw this.createError(
        'OnStatusDefault must follow OnStatus blocks or provide output prop',
        openingElement
      );
    }

    // Transform children as block content
    const children = Node.isJsxElement(node)
      ? this.transformBlockChildren(node.getJsxChildren())
      : [];

    return {
      kind: 'onStatusDefault',
      outputRef: resolvedOutputRef,
      children: children as BaseBlockNode[],
    };
  }

  // ============================================================================
  // MCP Configuration Transformation
  // ============================================================================

  /**
   * Transform an MCPConfig element to MCPConfigDocumentNode
   * MCPConfig wraps multiple MCPServer elements into a single document
   * Delegates to document.ts transformMCPConfig()
   */
  private transformMCPConfig(node: JsxElement | JsxSelfClosingElement): MCPConfigDocumentNode {
    return documentTransformMCPConfig(node, this.buildContext());
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
        } else if (childName === 'OnStatus') {
          // Transform OnStatus
          const onStatusNode = this.transformOnStatus(child);
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
              const onStatusDefaultNode = this.transformOnStatusDefault(sibling, onStatusNode.outputRef);
              blocks.push(onStatusDefaultNode);
              i = nextIndex; // Skip past OnStatusDefault in outer loop
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
    if (!expr) {
      throw this.createError('Assign var must reference a useVariable or defineVars result', openingElement);
    }

    // Support both patterns:
    // - Identifier: var={phaseDir} (from useVariable)
    // - PropertyAccessExpression: var={vars.PHASE_DIR} (from defineVars)
    let localName: string;
    if (Node.isIdentifier(expr)) {
      localName = expr.getText();
    } else if (Node.isPropertyAccessExpression(expr)) {
      // e.g., vars.MODEL_PROFILE -> "vars.MODEL_PROFILE"
      localName = expr.getText();
    } else {
      throw this.createError('Assign var must reference a useVariable or defineVars result', openingElement);
    }

    // Look up in extracted variables to get the env name
    const variable = this.variables.get(localName);
    if (!variable) {
      throw this.createError(
        `Variable '${localName}' not found. Did you declare it with useVariable() or defineVars()?`,
        openingElement
      );
    }

    // Check for from prop (required)
    const fromProp = openingElement.getAttribute('from');

    if (!fromProp) {
      throw this.createError(
        'Assign requires from prop with a source helper: from={file(...)} or from={bash(...)} or from={value(...)} or from={env(...)}',
        openingElement
      );
    }

    if (!Node.isJsxAttribute(fromProp)) {
      throw this.createError('from prop must be a regular attribute, not a spread', openingElement);
    }

    // Extract optional comment prop
    const commentProp = this.extractAssignPropValue(openingElement, 'comment');

    const assignment = this.transformAssignFromProp(openingElement, fromProp);
    return {
      kind: 'assign',
      variableName: variable.envName,
      assignment,
      ...(commentProp && { comment: commentProp }),
    };
  }

  /**
   * Transform an Assign from prop to assignment object
   * Handles file(), bash(), value(), env() source helpers
   */
  private transformAssignFromProp(
    openingElement: JsxOpeningElement | JsxSelfClosingElement,
    fromAttr: JsxAttribute
  ): AssignNode['assignment'] {
    const init = fromAttr.getInitializer();
    if (!init || !Node.isJsxExpression(init)) {
      throw this.createError('Assign from must be a JSX expression: from={file(...)}', openingElement);
    }

    const expr = init.getExpression();
    if (!expr) {
      throw this.createError('Assign from must contain a source helper call', openingElement);
    }

    // Check if from prop is an Identifier (RuntimeFnComponent reference)
    if (Node.isIdentifier(expr)) {
      const identName = expr.getText();
      const sourceFile = openingElement.getSourceFile();
      const fnName = this.findRuntimeFnName(sourceFile, identName);

      if (fnName) {
        // Extract args prop (required for runtimeFn)
        const argsAttr = openingElement.getAttribute('args');
        let args: Record<string, unknown> = {};

        if (argsAttr && Node.isJsxAttribute(argsAttr)) {
          const argsInit = argsAttr.getInitializer();
          if (argsInit && Node.isJsxExpression(argsInit)) {
            const argsExpr = argsInit.getExpression();
            if (argsExpr && Node.isObjectLiteralExpression(argsExpr)) {
              args = this.extractArgsObject(argsExpr);
            }
          }
        }

        return { type: 'runtimeFn', fnName, args };
      }
    }

    // Check if it's a call expression to a source helper (file, bash, value, env)
    if (!Node.isCallExpression(expr)) {
      throw this.createError(
        'Assign from must be a source helper call: file(), bash(), value(), or env()',
        openingElement
      );
    }

    const fnExpr = expr.getExpression();
    if (!Node.isIdentifier(fnExpr)) {
      throw this.createError('Assign from must call a source helper: file(), bash(), value(), env()', openingElement);
    }

    const fnName = fnExpr.getText();
    const args = expr.getArguments();

    // Handle each source type
    switch (fnName) {
      case 'file': {
        if (args.length === 0) {
          throw this.createError('file() requires a path argument', openingElement);
        }

        const pathArg = args[0];
        let path: string;

        // Extract path from string literal or template
        if (Node.isStringLiteral(pathArg)) {
          path = pathArg.getLiteralValue();
        } else if (Node.isNoSubstitutionTemplateLiteral(pathArg)) {
          path = pathArg.getLiteralValue();
        } else if (Node.isTemplateExpression(pathArg)) {
          path = this.extractTemplatePath(pathArg);
        } else {
          throw this.createError('file() path must be a string or template literal', openingElement);
        }

        // Check for optional option (second argument)
        const options = args.length > 1 ? args[1] : undefined;
        let optional = false;

        if (options && Node.isObjectLiteralExpression(options)) {
          const optionalProp = options.getProperty('optional');
          if (optionalProp && Node.isPropertyAssignment(optionalProp)) {
            const optInit = optionalProp.getInitializer();
            if (optInit && (optInit.getText() === 'true' || optInit.getText() === 'false')) {
              optional = optInit.getText() === 'true';
            }
          }
        }

        return { type: 'file', path, ...(optional && { optional }) };
      }

      case 'bash': {
        if (args.length === 0) {
          throw this.createError('bash() requires a command argument', openingElement);
        }

        const cmdArg = args[0];
        let content: string;

        if (Node.isStringLiteral(cmdArg)) {
          content = cmdArg.getLiteralValue();
        } else if (Node.isNoSubstitutionTemplateLiteral(cmdArg)) {
          content = cmdArg.getLiteralValue();
        } else if (Node.isTemplateExpression(cmdArg)) {
          content = this.extractTemplatePath(cmdArg);
        } else {
          throw this.createError('bash() command must be a string or template literal', openingElement);
        }

        return { type: 'bash', content };
      }

      case 'value': {
        if (args.length === 0) {
          throw this.createError('value() requires a value argument', openingElement);
        }

        const valArg = args[0];
        let content: string;

        if (Node.isStringLiteral(valArg)) {
          content = valArg.getLiteralValue();
        } else if (Node.isNoSubstitutionTemplateLiteral(valArg)) {
          content = valArg.getLiteralValue();
        } else if (Node.isTemplateExpression(valArg)) {
          content = this.extractTemplatePath(valArg);
        } else {
          throw this.createError('value() must be a string or template literal', openingElement);
        }

        // Check for raw option (second argument)
        const options = args.length > 1 ? args[1] : undefined;
        let raw = false;

        if (options && Node.isObjectLiteralExpression(options)) {
          const rawProp = options.getProperty('raw');
          if (rawProp && Node.isPropertyAssignment(rawProp)) {
            const rawInit = rawProp.getInitializer();
            if (rawInit && (rawInit.getText() === 'true' || rawInit.getText() === 'false')) {
              raw = rawInit.getText() === 'true';
            }
          }
        }

        return { type: 'value', content, ...(raw && { raw }) };
      }

      case 'env': {
        if (args.length === 0) {
          throw this.createError('env() requires an environment variable name', openingElement);
        }

        const envArg = args[0];
        let content: string;

        if (Node.isStringLiteral(envArg)) {
          content = envArg.getLiteralValue();
        } else {
          throw this.createError('env() variable name must be a string literal', openingElement);
        }

        return { type: 'env', content };
      }

      default:
        throw this.createError(
          `Unknown source helper: ${fnName}. Use file(), bash(), value(), or env()`,
          openingElement
        );
    }
  }

  /**
   * Transform an AssignGroup element to AssignGroupNode
   * AssignGroup collects Assign children into a single bash code block
   */
  private transformAssignGroup(node: JsxElement | JsxSelfClosingElement): AssignGroupNode {
    // AssignGroup must have children
    if (Node.isJsxSelfClosingElement(node)) {
      throw this.createError('AssignGroup must have Assign children', node);
    }

    const children = node.getJsxChildren();
    const assignments: AssignNode[] = [];
    let pendingBlankBefore = false;  // Track <br/> for next assignment

    for (const child of children) {
      // Skip whitespace text nodes
      if (Node.isJsxText(child)) {
        const text = child.getText().trim();
        if (text === '') continue;
        throw this.createError('AssignGroup can only contain Assign or br elements, not text', child);
      }

      // Must be JSX element
      if (!Node.isJsxElement(child) && !Node.isJsxSelfClosingElement(child)) {
        throw this.createError('AssignGroup can only contain Assign or br elements', child);
      }

      // Get element name
      const opening = Node.isJsxElement(child) ? child.getOpeningElement() : child;
      const tagNameNode = opening.getTagNameNode();
      const name = tagNameNode.getText();

      // Handle <br/> - mark that next assignment should have extra blank line
      if (name === 'br') {
        pendingBlankBefore = true;
        continue;
      }

      // Must be Assign
      if (name !== 'Assign') {
        throw this.createError(`AssignGroup can only contain Assign or br elements, found: ${name}`, child);
      }

      // Transform the Assign element
      const assignNode = this.transformAssign(child);

      // Apply pending blank before flag
      if (pendingBlankBefore) {
        assignNode.blankBefore = true;
        pendingBlankBefore = false;
      }

      assignments.push(assignNode);
    }

    if (assignments.length === 0) {
      throw this.createError('AssignGroup must contain at least one Assign element', node);
    }

    return {
      kind: 'assignGroup',
      assignments,
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
   * Find the function name from a runtimeFn wrapper declaration
   * Scans source file for: const WrapperName = runtimeFn(fnName)
   */
  private findRuntimeFnName(sourceFile: SourceFile, wrapperName: string): string | null {
    for (const statement of sourceFile.getStatements()) {
      if (!Node.isVariableStatement(statement)) continue;

      for (const decl of statement.getDeclarationList().getDeclarations()) {
        if (decl.getName() !== wrapperName) continue;

        const init = decl.getInitializer();
        if (!init || !Node.isCallExpression(init)) continue;

        const callExpr = init.getExpression();
        if (!Node.isIdentifier(callExpr) || callExpr.getText() !== 'runtimeFn') continue;

        const args = init.getArguments();
        if (args.length > 0 && Node.isIdentifier(args[0])) {
          return args[0].getText();
        }
      }
    }
    return null;
  }

  /**
   * Extract object literal to Record<string, unknown>
   */
  private extractArgsObject(objExpr: ObjectLiteralExpression): Record<string, unknown> {
    const args: Record<string, unknown> = {};
    for (const prop of objExpr.getProperties()) {
      if (Node.isPropertyAssignment(prop)) {
        const name = prop.getName();
        const init = prop.getInitializer();
        if (init) {
          if (Node.isStringLiteral(init)) args[name] = init.getLiteralValue();
          else if (Node.isNumericLiteral(init)) args[name] = Number(init.getLiteralValue());
          else if (init.getText() === 'true') args[name] = true;
          else if (init.getText() === 'false') args[name] = false;
          else args[name] = init.getText(); // Fallback to source text
        }
      }
    }
    return args;
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
   * Delegates to document.ts transformState()
   */
  private transformState(node: JsxElement | JsxSelfClosingElement): StateDocumentNode {
    return documentTransformState(node, this.buildContext());
  }

  /**
   * Evaluate a binary expression that represents string concatenation.
   * Handles chains like: `text ` + AGENT_PATHS.researcher + ` more`
   * Returns the concatenated string or null if not evaluable.
   */
  private evaluateStringConcatenation(expr: BinaryExpression): string | null {
    const operator = expr.getOperatorToken().getText();
    if (operator !== '+') {
      return null;
    }

    const left = expr.getLeft();
    const right = expr.getRight();

    const leftValue = this.evaluateStringExpression(left);
    const rightValue = this.evaluateStringExpression(right);

    if (leftValue === null || rightValue === null) {
      return null;
    }

    return leftValue + rightValue;
  }

  /**
   * Evaluate an expression that should resolve to a string value.
   * Handles: string literals, template literals, property access, binary expressions.
   */
  private evaluateStringExpression(expr: Node): string | null {
    if (Node.isStringLiteral(expr)) {
      return expr.getLiteralValue();
    }
    if (Node.isNoSubstitutionTemplateLiteral(expr)) {
      return expr.getLiteralValue();
    }
    if (Node.isTemplateExpression(expr)) {
      // Template expression with substitutions - get the literal text
      let result = expr.getHead().getLiteralText();
      for (const span of expr.getTemplateSpans()) {
        const spanExpr = span.getExpression();
        // Try to evaluate the span expression
        const spanValue = this.evaluateStringExpression(spanExpr);
        if (spanValue !== null) {
          result += spanValue;
        } else if (Node.isIdentifier(spanExpr)) {
          result += `\${${spanExpr.getText()}}`;
        } else {
          result += `\${${spanExpr.getText()}}`;
        }
        const literal = span.getLiteral();
        if (Node.isTemplateMiddle(literal)) {
          result += literal.getLiteralText();
        } else if (Node.isTemplateTail(literal)) {
          result += literal.getLiteralText();
        }
      }
      return result;
    }
    if (Node.isPropertyAccessExpression(expr)) {
      return this.resolvePropertyAccess(expr);
    }
    if (Node.isBinaryExpression(expr)) {
      return this.evaluateStringConcatenation(expr);
    }
    if (Node.isParenthesizedExpression(expr)) {
      return this.evaluateStringExpression(expr.getExpression());
    }

    return null;
  }

  /**
   * Resolve a property access expression (e.g., AGENT_PATHS.researcher) to its value.
   * Only works for const declarations with object literals.
   */
  private resolvePropertyAccess(expr: PropertyAccessExpression): string | null {
    const objectExpr = expr.getExpression();
    const propertyName = expr.getName();

    if (!Node.isIdentifier(objectExpr)) {
      return null;
    }

    const objectName = objectExpr.getText();

    // Find the variable declaration in the source file
    const sourceFile = expr.getSourceFile();
    const varDecls = sourceFile.getVariableDeclarations();

    for (const varDecl of varDecls) {
      if (varDecl.getName() === objectName) {
        let initializer = varDecl.getInitializer();
        // Unwrap AsExpression (from "as const" syntax)
        if (initializer && Node.isAsExpression(initializer)) {
          initializer = initializer.getExpression();
        }
        if (initializer && Node.isObjectLiteralExpression(initializer)) {
          // Look for the property in the object literal
          for (const prop of initializer.getProperties()) {
            if (Node.isPropertyAssignment(prop) && prop.getName() === propertyName) {
              const propInit = prop.getInitializer();
              if (propInit && Node.isStringLiteral(propInit)) {
                return propInit.getLiteralValue();
              }
              if (propInit && Node.isNoSubstitutionTemplateLiteral(propInit)) {
                return propInit.getLiteralValue();
              }
            }
          }
        }
        break;
      }
    }

    return null;
  }
}

/**
 * Convenience function to transform a JSX element to an AgentDocumentNode, SkillDocumentNode, MCPConfigDocumentNode, or StateDocumentNode
 */
export function transform(node: JsxElement | JsxSelfClosingElement | JsxFragment, sourceFile?: SourceFile): AgentDocumentNode | SkillDocumentNode | MCPConfigDocumentNode | StateDocumentNode {
  const transformer = new Transformer();
  return transformer.transform(node, sourceFile);
}
