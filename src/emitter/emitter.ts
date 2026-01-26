/**
 * Markdown Emitter - Converts IR to Markdown output
 *
 * Uses switch-based emission with exhaustiveness checking.
 * Handles nested structures (lists, inline formatting) through recursive calls.
 */

import matter from 'gray-matter';
import type { SourceFile } from 'ts-morph';
import type {
  AgentDocumentNode,
  AgentFrontmatterNode,
  AssignNode,
  BlockNode,
  BlockquoteNode,
  CodeBlockNode,
  DocumentNode,
  ElseNode,
  FrontmatterNode,
  HeadingNode,
  IfNode,
  InlineNode,
  InputPropertyValue,
  ListItemNode,
  ListNode,
  OnStatusNode,
  ParagraphNode,
  ReadStateNode,
  SkillDocumentNode,
  SkillFileNode,
  SkillFrontmatterNode,
  SpawnAgentInput,
  SpawnAgentNode,
  TypeReference,
  WriteStateNode,
  XmlBlockNode,
} from '../ir/index.js';
import { resolveTypeImport, extractInterfaceProperties } from '../parser/parser.js';
import { assertNever } from './utils.js';

/**
 * Context for tracking nested list state
 */
interface ListContext {
  ordered: boolean;
  index: number;
}

/**
 * MarkdownEmitter class - Encapsulates emission state and logic
 *
 * Uses a stack to track nested list context for proper indentation
 * and marker selection.
 */
export class MarkdownEmitter {
  private listStack: ListContext[] = [];

  /**
   * Main entry point - emit a complete document
   */
  emit(doc: DocumentNode): string {
    const parts: string[] = [];

    if (doc.frontmatter) {
      parts.push(this.emitFrontmatter(doc.frontmatter));
    }

    for (const child of doc.children) {
      parts.push(this.emitBlock(child));
    }

    // Join with double newlines for block separation, then ensure single trailing newline
    const result = parts.join('\n\n');
    return result ? result + '\n' : '';
  }

  /**
   * Emit YAML frontmatter using gray-matter
   */
  private emitFrontmatter(node: FrontmatterNode): string {
    // gray-matter.stringify adds content after frontmatter, we just want the frontmatter
    const result = matter.stringify('', node.data);
    // Result is "---\nkey: value\n---\n", trim trailing newline
    return result.trimEnd();
  }

  /**
   * Emit Agent frontmatter (GSD format: tools as string)
   */
  private emitAgentFrontmatter(node: AgentFrontmatterNode): string {
    const data: Record<string, unknown> = {
      name: node.name,
      description: node.description,
    };
    if (node.tools) {
      data.tools = node.tools;
    }
    if (node.color) {
      data.color = node.color;
    }
    return matter.stringify('', data).trimEnd();
  }

  /**
   * Emit Skill frontmatter (Claude Code format: kebab-case keys)
   */
  private emitSkillFrontmatter(node: SkillFrontmatterNode): string {
    const data: Record<string, unknown> = {
      name: node.name,
      description: node.description,
    };

    // Map camelCase props to kebab-case YAML keys
    if (node.disableModelInvocation !== undefined) {
      data['disable-model-invocation'] = node.disableModelInvocation;
    }
    if (node.userInvocable !== undefined) {
      data['user-invocable'] = node.userInvocable;
    }
    if (node.allowedTools && node.allowedTools.length > 0) {
      data['allowed-tools'] = node.allowedTools;
    }
    if (node.argumentHint) {
      data['argument-hint'] = node.argumentHint;
    }
    if (node.model) {
      data['model'] = node.model;
    }
    if (node.context) {
      data['context'] = node.context;
    }
    if (node.agent) {
      data['agent'] = node.agent;
    }

    return matter.stringify('', data).trimEnd();
  }

  /**
   * Emit an AgentDocumentNode to markdown
   * @param doc - The agent document node
   * @param sourceFile - Optional source file for type resolution (needed for structured_returns)
   */
  emitAgent(doc: AgentDocumentNode, sourceFile?: SourceFile): string {
    const parts: string[] = [];

    // Agent frontmatter (GSD format)
    parts.push(this.emitAgentFrontmatter(doc.frontmatter));

    // Body content (same as Command)
    for (const child of doc.children) {
      parts.push(this.emitBlock(child));
    }

    // Auto-generate structured_returns if outputType present
    if (doc.frontmatter.outputType && sourceFile) {
      const structuredReturns = this.emitStructuredReturns(doc.frontmatter.outputType, sourceFile);
      if (structuredReturns) {
        parts.push(structuredReturns);
      }
    }

    // Join with double newlines for block separation, then ensure single trailing newline
    const result = parts.join('\n\n');
    return result ? result + '\n' : '';
  }

  /**
   * Emit a SkillDocumentNode to markdown (SKILL.md content)
   */
  emitSkill(doc: SkillDocumentNode): string {
    const parts: string[] = [];

    // Skill frontmatter
    parts.push(this.emitSkillFrontmatter(doc.frontmatter));

    // Body content
    for (const child of doc.children) {
      parts.push(this.emitBlock(child));
    }

    // Join with double newlines for block separation, then ensure single trailing newline
    const result = parts.join('\n\n');
    return result ? result + '\n' : '';
  }

  /**
   * Emit a SkillFileNode to markdown (supporting file content)
   */
  emitSkillFile(node: SkillFileNode): string {
    const parts: string[] = [];

    for (const child of node.children) {
      parts.push(this.emitBlock(child));
    }

    // Join with double newlines, ensure trailing newline
    const result = parts.join('\n\n');
    return result ? result + '\n' : '';
  }

  /**
   * Emit a block node - switch on kind with exhaustiveness
   */
  private emitBlock(node: BlockNode): string {
    switch (node.kind) {
      case 'heading':
        return this.emitHeading(node);
      case 'paragraph':
        return this.emitParagraph(node);
      case 'list':
        return this.emitList(node);
      case 'codeBlock':
        return this.emitCodeBlock(node);
      case 'blockquote':
        return this.emitBlockquote(node);
      case 'thematicBreak':
        return '---';
      case 'table':
        // TODO: Implement table emission in Phase 21 Plan 02
        throw new Error('Table emission not yet implemented');
      case 'xmlBlock':
        return this.emitXmlBlock(node);
      case 'raw':
        return node.content;
      case 'spawnAgent':
        return this.emitSpawnAgent(node);
      case 'assign':
        return this.emitAssign(node);
      case 'if':
        return this.emitIf(node);
      case 'else':
        return this.emitElse(node);
      case 'onStatus':
        return this.emitOnStatus(node);
      case 'readState':
        return this.emitReadState(node);
      case 'writeState':
        return this.emitWriteState(node);
      case 'mcpServer':
        // MCP servers are not emitted via markdown emitter
        // They go through settings.ts emitter to settings.json
        throw new Error('MCPServerNode should not be emitted via markdown emitter');
      default:
        return assertNever(node);
    }
  }

  /**
   * Emit an inline node - switch on kind with exhaustiveness
   */
  private emitInline(node: InlineNode): string {
    switch (node.kind) {
      case 'text':
        return node.value;
      case 'bold':
        return `**${this.emitInlineChildren(node.children)}**`;
      case 'italic':
        return `*${this.emitInlineChildren(node.children)}*`;
      case 'inlineCode':
        return `\`${node.value}\``;
      case 'link':
        return `[${this.emitInlineChildren(node.children)}](${node.url})`;
      case 'lineBreak':
        return '\n';
      default:
        return assertNever(node);
    }
  }

  /**
   * Emit a sequence of inline nodes with proper spacing
   *
   * JSX whitespace handling can strip spaces between elements like:
   *   `</code> → ` becomes `→ ` (space before arrow lost)
   *
   * This method ensures inline formatting elements (code, bold, italic)
   * have proper spacing when adjacent to text that doesn't end/start with space.
   */
  private emitInlineChildren(nodes: InlineNode[]): string {
    const parts: string[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const emitted = this.emitInline(node);
      const prev = parts[parts.length - 1];

      // Check if we need to insert a space between elements
      if (prev !== undefined && this.needsSpaceBetween(nodes[i - 1], node, prev, emitted)) {
        parts.push(' ');
      }

      parts.push(emitted);
    }

    return parts.join('');
  }

  /**
   * Determine if a space is needed between two inline elements
   *
   * We need a space when:
   * - Previous element is formatting (code/bold/italic) AND doesn't end with space
   * - Current element is text AND doesn't start with space or punctuation
   *
   * OR:
   * - Previous element is text AND doesn't end with space
   * - Current element is formatting (code/bold/italic)
   */
  private needsSpaceBetween(
    prevNode: InlineNode,
    currNode: InlineNode,
    prevEmitted: string,
    currEmitted: string
  ): boolean {
    // Don't add space if previous ends with whitespace
    if (/\s$/.test(prevEmitted)) return false;

    // Don't add space if current starts with whitespace or punctuation
    if (/^[\s.,;:!?)}\]>]/.test(currEmitted)) return false;

    const prevIsFormatting = prevNode.kind === 'inlineCode' || prevNode.kind === 'bold' || prevNode.kind === 'italic';
    const currIsFormatting = currNode.kind === 'inlineCode' || currNode.kind === 'bold' || currNode.kind === 'italic';

    // Space needed: formatting → text (that doesn't start with space/punct)
    if (prevIsFormatting && currNode.kind === 'text') return true;

    // Space needed: text → formatting (when text doesn't end with space)
    if (prevNode.kind === 'text' && currIsFormatting) return true;

    // Space needed: formatting → formatting
    if (prevIsFormatting && currIsFormatting) return true;

    return false;
  }

  /**
   * Emit heading - '#' repeated level times + content
   */
  private emitHeading(node: HeadingNode): string {
    const hashes = '#'.repeat(node.level);
    const content = this.emitInlineChildren(node.children);
    return `${hashes} ${content}`;
  }

  /**
   * Emit paragraph - just inline content
   */
  private emitParagraph(node: ParagraphNode): string {
    return this.emitInlineChildren(node.children);
  }

  /**
   * Emit list - uses listStack for nesting context
   */
  private emitList(node: ListNode): string {
    this.listStack.push({ ordered: node.ordered, index: 1 });

    const items = node.items.map((item) => this.emitListItem(item));

    this.listStack.pop();

    return items.join('\n');
  }

  /**
   * Emit list item - marker + indented content
   */
  private emitListItem(item: ListItemNode): string {
    const current = this.listStack[this.listStack.length - 1];
    const marker = current.ordered ? `${current.index++}.` : '-';
    const indent = '  '.repeat(this.listStack.length - 1);

    // Handle the item's children - could be paragraphs, nested lists, etc.
    const contentParts: string[] = [];

    for (let i = 0; i < item.children.length; i++) {
      const child = item.children[i];

      if (child.kind === 'list') {
        // Nested list: emitList already handles indentation via listStack
        // The nested list items will have their own indent based on stack depth
        const nestedList = this.emitBlock(child);
        contentParts.push(nestedList);
      } else if (child.kind === 'paragraph' && i === 0) {
        // First paragraph is inline with marker
        contentParts.push(this.emitBlock(child));
      } else {
        // Subsequent paragraphs get their own line with indent
        const blockContent = this.emitBlock(child);
        const indentedContent = blockContent
          .split('\n')
          .map((line) => indent + '  ' + line)
          .join('\n');
        contentParts.push(indentedContent);
      }
    }

    // First content item is inline with marker
    const firstContent = contentParts[0] || '';
    const restContent = contentParts.slice(1);

    let result = `${indent}${marker} ${firstContent}`;

    if (restContent.length > 0) {
      result += '\n' + restContent.join('\n');
    }

    return result;
  }

  /**
   * Emit code block - triple backticks with optional language
   */
  private emitCodeBlock(node: CodeBlockNode): string {
    const lang = node.language || '';
    return `\`\`\`${lang}\n${node.content}\n\`\`\``;
  }

  /**
   * Emit blockquote - '> ' prefix per line
   */
  private emitBlockquote(node: BlockquoteNode): string {
    const content = node.children.map((child) => this.emitBlock(child)).join('\n\n');

    // Prefix each line with '> '
    return content
      .split('\n')
      .map((line) => (line ? `> ${line}` : '>'))
      .join('\n');
  }

  /**
   * Generate XML-structured prompt from SpawnAgentInput
   *
   * VariableRef -> <input>{var_name}</input>
   * Object literal -> <prop>value</prop> per property
   */
  private generateInputPrompt(input: SpawnAgentInput): string {
    if (input.type === 'variable') {
      // Wrap variable in <input> block with lowercase variable name
      return `<input>\n{${input.variableName.toLowerCase()}}\n</input>`;
    }

    // Object literal: create XML section per property
    const sections: string[] = [];
    for (const prop of input.properties) {
      const value = this.formatInputValue(prop.value);
      sections.push(`<${prop.name}>\n${value}\n</${prop.name}>`);
    }
    return sections.join('\n\n');
  }

  /**
   * Format InputPropertyValue for prompt output
   */
  private formatInputValue(value: InputPropertyValue): string {
    switch (value.type) {
      case 'string':
        return value.value;
      case 'placeholder':
        return `{${value.name}}`;
      case 'variable':
        return `{${value.name.toLowerCase()}}`;
    }
  }

  /**
   * Emit SpawnAgent as GSD Task() syntax
   *
   * Output format:
   * Task(
   *   prompt="...",
   *   subagent_type="...",
   *   model="...",
   *   description="..."
   * )
   */
  private emitSpawnAgent(node: SpawnAgentNode): string {
    // Escape double quotes in string values (backslash escape for Task() syntax)
    const escapeQuotes = (s: string): string => s.replace(/"/g, '\\"');

    // Determine prompt: use provided prompt OR generate from input
    let promptContent: string;
    if (node.prompt) {
      // Existing prompt-based usage (backward compat)
      promptContent = node.prompt;
    } else if (node.input) {
      // Generate from typed input
      promptContent = this.generateInputPrompt(node.input);
    } else {
      // Neither - shouldn't happen (transformer validates)
      throw new Error('SpawnAgent requires either prompt or input');
    }

    // Append extraInstructions if present
    if (node.extraInstructions) {
      promptContent = promptContent + '\n\n' + node.extraInstructions;
    }

    return `Task(
  prompt="${escapeQuotes(promptContent)}",
  subagent_type="${escapeQuotes(node.agent)}",
  model="${escapeQuotes(node.model)}",
  description="${escapeQuotes(node.description)}"
)`;
  }

  /**
   * Emit Assign node as bash code block with variable assignment
   *
   * Output format for bash:
   * ```bash
   * VAR_NAME=$(command)
   * ```
   *
   * Output format for value:
   * ```bash
   * VAR_NAME=value
   * ```
   * (with quotes if value contains spaces)
   *
   * Output format for env:
   * ```bash
   * VAR_NAME=$ENV_VAR
   * ```
   */
  private emitAssign(node: AssignNode): string {
    const { variableName, assignment } = node;

    let line: string;
    switch (assignment.type) {
      case 'bash':
        // Bash command: VAR=$(command)
        line = `${variableName}=$(${assignment.content})`;
        break;
      case 'value': {
        // Static value: quote if contains spaces
        const val = assignment.content;
        line = /\s/.test(val)
          ? `${variableName}="${val}"`
          : `${variableName}=${val}`;
        break;
      }
      case 'env':
        // Environment variable: VAR=$ENV
        line = `${variableName}=$${assignment.content}`;
        break;
    }

    return `\`\`\`bash\n${line}\n\`\`\``;
  }

  /**
   * Emit If node as prose-based conditional
   *
   * Output format:
   * **If {test}:**
   *
   * {content}
   */
  private emitIf(node: IfNode): string {
    const parts: string[] = [];

    // Emit condition header
    parts.push(`**If ${node.test}:**`);

    // Emit "then" block content with blank line after header
    for (const child of node.children) {
      parts.push(this.emitBlock(child));
    }

    return parts.join('\n\n');
  }

  /**
   * Emit Else node as prose-based conditional
   *
   * Output format:
   * **Otherwise:**
   *
   * {content}
   */
  private emitElse(node: ElseNode): string {
    const parts: string[] = [];

    // Emit "otherwise" header
    parts.push('**Otherwise:**');

    // Emit "else" block content with blank line after header
    for (const child of node.children) {
      parts.push(this.emitBlock(child));
    }

    return parts.join('\n\n');
  }

  /**
   * Emit OnStatus node as prose-based status conditional
   *
   * Output format:
   * **On SUCCESS:**
   *
   * {content}
   */
  private emitOnStatus(node: OnStatusNode): string {
    const parts: string[] = [];

    // Emit status header
    parts.push(`**On ${node.status}:**`);

    // Emit block content with blank line after header
    for (const child of node.children) {
      parts.push(this.emitBlock(child));
    }

    return parts.join('\n\n');
  }

  /**
   * Emit ReadState node as skill invocation
   *
   * Output format varies by whether field is specified:
   * - Full state: Use /react-agentic:state-read {key} and store in variable
   * - Field read: Use /react-agentic:state-read {key} --field {path}
   */
  private emitReadState(node: ReadStateNode): string {
    const { stateKey, variableName, field } = node;

    if (field) {
      // Read specific field
      return `Use skill \`/react-agentic:state-read ${stateKey} --field "${field}"\` and store result in \`${variableName}\`.`;
    } else {
      // Read full state
      return `Use skill \`/react-agentic:state-read ${stateKey}\` and store result in \`${variableName}\`.`;
    }
  }

  /**
   * Emit WriteState node as skill invocation
   *
   * Output format varies by mode:
   * - Field mode: /react-agentic:state-write {key} --field {path} --value {val}
   * - Merge mode: /react-agentic:state-write {key} --merge '{json}'
   */
  private emitWriteState(node: WriteStateNode): string {
    const { stateKey, mode, field, value } = node;

    if (mode === 'field') {
      // Field write mode
      const valueStr = value.type === 'variable'
        ? `$${value.content}`
        : `"${value.content}"`;
      return `Use skill \`/react-agentic:state-write ${stateKey} --field "${field}" --value ${valueStr}\`.`;
    } else {
      // Merge mode
      const mergeJson = value.content;
      return `Use skill \`/react-agentic:state-write ${stateKey} --merge '${mergeJson}'\`.`;
    }
  }

  /**
   * Generate <structured_returns> section from output type interface
   *
   * Resolves the TypeReference to its interface definition, extracts properties,
   * and generates status-specific templates based on field names.
   */
  private emitStructuredReturns(outputType: TypeReference, sourceFile: SourceFile): string | null {
    // Resolve the interface
    const resolved = resolveTypeImport(outputType.name, sourceFile);
    if (!resolved?.interface) {
      return null;
    }

    // Extract properties
    const props = extractInterfaceProperties(resolved.interface);
    if (props.length === 0) {
      return null;
    }

    // Find status property (should always exist if extending BaseOutput)
    const statusProp = props.find(p => p.name === 'status');
    const otherProps = props.filter(p => p.name !== 'status' && p.name !== 'message');

    // Generate template showing all fields
    const lines: string[] = [
      '<structured_returns>',
      '',
      '## Output Format',
      '',
      'Return a YAML code block with the following structure:',
      '',
      '```yaml',
      'status: SUCCESS | BLOCKED | NOT_FOUND | ERROR | CHECKPOINT',
    ];

    // Add message if in interface
    const messageProp = props.find(p => p.name === 'message');
    if (messageProp) {
      lines.push('message: "Human-readable status message"');
    }

    // Add other fields
    for (const prop of otherProps) {
      const required = prop.required ? '' : '  # optional';
      const typeHint = this.formatTypeHint(prop.type);
      lines.push(`${prop.name}: ${typeHint}${required}`);
    }

    lines.push('```');

    // Add status-specific guidance
    lines.push('');
    lines.push('### Status Codes');
    lines.push('');
    lines.push('- **SUCCESS**: Task completed successfully');
    lines.push('- **BLOCKED**: Cannot proceed, needs external input');
    lines.push('- **NOT_FOUND**: Requested resource not found');
    lines.push('- **ERROR**: Execution error occurred');
    lines.push('- **CHECKPOINT**: Milestone reached, pausing for verification');

    lines.push('');
    lines.push('</structured_returns>');

    return lines.join('\n');
  }

  /**
   * Format a TypeScript type as a hint for YAML output
   */
  private formatTypeHint(type: string): string {
    // Handle common types
    if (type === 'string') return '"..."';
    if (type === 'number') return '0';
    if (type === 'boolean') return 'true | false';
    if (type.includes('[]')) return '[...]';
    if (type.includes("'HIGH'") || type.includes("'MEDIUM'") || type.includes("'LOW'")) {
      return 'HIGH | MEDIUM | LOW';
    }
    // For complex types, show placeholder
    return `<${type.replace(/['"]/g, '')}>`;
  }

  /**
   * Emit XML block - <name attrs>content</name>
   */
  private emitXmlBlock(node: XmlBlockNode): string {
    // Serialize attributes if present
    const attrs = node.attributes
      ? ' ' + Object.entries(node.attributes)
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ')
      : '';

    const innerContent = node.children.map((child) => this.emitBlock(child)).join('\n\n');

    return `<${node.name}${attrs}>\n${innerContent}\n</${node.name}>`;
  }
}

/**
 * Convenience function for emitting a document
 */
export function emit(doc: DocumentNode): string {
  const emitter = new MarkdownEmitter();
  return emitter.emit(doc);
}

/**
 * Convenience function for emitting an agent document
 */
export function emitAgent(doc: AgentDocumentNode, sourceFile?: SourceFile): string {
  const emitter = new MarkdownEmitter();
  return emitter.emitAgent(doc, sourceFile);
}

/**
 * Convenience function for emitting a skill document
 */
export function emitSkill(doc: SkillDocumentNode): string {
  const emitter = new MarkdownEmitter();
  return emitter.emitSkill(doc);
}

/**
 * Convenience function for emitting a skill file
 */
export function emitSkillFile(node: SkillFileNode): string {
  const emitter = new MarkdownEmitter();
  return emitter.emitSkillFile(node);
}
