/**
 * V3 Markdown Emitter
 *
 * Converts V3 IR nodes to Markdown output with jq expressions.
 * Extends v1 emitter patterns for shared block types.
 *
 * Key differences from v1:
 * - RuntimeCallNode emits as bash code block with node invocation
 * - IfNode emits with jq-based conditions
 * - RuntimeVar interpolation uses jq expressions
 */

import matter from 'gray-matter';
import type {
  DocumentNode,
  BlockNode,
  IfNode,
  ElseNode,
  LoopNode,
  BreakNode,
  ReturnNode,
  AskUserNode,
  RuntimeCallNode,
  SpawnAgentNode,
  Condition,
  RuntimeVarRefNode,
  RuntimeVarDeclNode,
  InputValue,
} from '../ir/index.js';
import type { InlineNode } from '../ir/nodes.js';

// ============================================================================
// jq Expression Generation
// ============================================================================

/**
 * Convert RuntimeVarRefNode to jq shell expression
 *
 * @example
 * toJqExpression({ varName: 'CTX', path: ['user', 'name'] })
 * // Returns: $(echo "$CTX" | jq -r '.user.name')
 */
function toJqExpression(ref: RuntimeVarRefNode): string {
  const jqPath = ref.path.length === 0 ? '.' : '.' + ref.path.join('.');
  return `$(echo "$${ref.varName}" | jq -r '${jqPath}')`;
}

/**
 * Convert Condition to shell condition string
 */
function conditionToShell(condition: Condition): string {
  switch (condition.type) {
    case 'ref': {
      // Truthy check: non-empty and not "null" and not "false"
      const jq = toJqExpression(condition.ref);
      return `${jq} != "" && ${jq} != "null" && ${jq} != "false"`;
    }

    case 'literal':
      return condition.value ? 'true' : 'false';

    case 'not': {
      const inner = conditionToShell(condition.operand);
      return `! (${inner})`;
    }

    case 'and': {
      const left = conditionToShell(condition.left);
      const right = conditionToShell(condition.right);
      return `(${left}) && (${right})`;
    }

    case 'or': {
      const left = conditionToShell(condition.left);
      const right = conditionToShell(condition.right);
      return `(${left}) || (${right})`;
    }

    case 'eq': {
      const left = conditionToShell(condition.left);
      const rightVal = JSON.stringify(condition.right);
      // For ref on left, compare the jq output
      if (condition.left.type === 'ref') {
        const jq = toJqExpression(condition.left.ref);
        return `${jq} = ${rightVal}`;
      }
      return `${left} = ${rightVal}`;
    }

    case 'neq': {
      const left = conditionToShell(condition.left);
      const rightVal = JSON.stringify(condition.right);
      if (condition.left.type === 'ref') {
        const jq = toJqExpression(condition.left.ref);
        return `${jq} != ${rightVal}`;
      }
      return `${left} != ${rightVal}`;
    }

    case 'gt': {
      if (condition.left.type === 'ref') {
        const jq = toJqExpression(condition.left.ref);
        return `${jq} -gt ${condition.right}`;
      }
      return `${conditionToShell(condition.left)} -gt ${condition.right}`;
    }

    case 'gte': {
      if (condition.left.type === 'ref') {
        const jq = toJqExpression(condition.left.ref);
        return `${jq} -ge ${condition.right}`;
      }
      return `${conditionToShell(condition.left)} -ge ${condition.right}`;
    }

    case 'lt': {
      if (condition.left.type === 'ref') {
        const jq = toJqExpression(condition.left.ref);
        return `${jq} -lt ${condition.right}`;
      }
      return `${conditionToShell(condition.left)} -lt ${condition.right}`;
    }

    case 'lte': {
      if (condition.left.type === 'ref') {
        const jq = toJqExpression(condition.left.ref);
        return `${jq} -le ${condition.right}`;
      }
      return `${conditionToShell(condition.left)} -le ${condition.right}`;
    }
  }
}

/**
 * Convert Condition to prose-friendly string
 *
 * Used in markdown output like: **If ctx.error:**
 */
function conditionToProse(condition: Condition): string {
  switch (condition.type) {
    case 'ref': {
      const path = condition.ref.path.length === 0
        ? condition.ref.varName.toLowerCase()
        : `${condition.ref.varName.toLowerCase()}.${condition.ref.path.join('.')}`;
      return path;
    }

    case 'literal':
      return condition.value ? 'true' : 'false';

    case 'not':
      return `!${conditionToProse(condition.operand)}`;

    case 'and':
      return `${conditionToProse(condition.left)} && ${conditionToProse(condition.right)}`;

    case 'or':
      return `${conditionToProse(condition.left)} || ${conditionToProse(condition.right)}`;

    case 'eq':
      return `${conditionToProse(condition.left)} === ${JSON.stringify(condition.right)}`;

    case 'neq':
      return `${conditionToProse(condition.left)} !== ${JSON.stringify(condition.right)}`;

    case 'gt':
      return `${conditionToProse(condition.left)} > ${condition.right}`;

    case 'gte':
      return `${conditionToProse(condition.left)} >= ${condition.right}`;

    case 'lt':
      return `${conditionToProse(condition.left)} < ${condition.right}`;

    case 'lte':
      return `${conditionToProse(condition.left)} <= ${condition.right}`;
  }
}

// ============================================================================
// V3 Markdown Emitter Class
// ============================================================================

/**
 * Emitter for V3 documents
 */
export class RuntimeMarkdownEmitter {
  /**
   * Emit a complete V3 document
   */
  emit(doc: DocumentNode): string {
    const parts: string[] = [];

    // Emit frontmatter
    if (doc.frontmatter) {
      const fm = matter.stringify('', doc.frontmatter.data).trimEnd();
      parts.push(fm);
    }

    // Emit body content
    for (const child of doc.children) {
      parts.push(this.emitBlock(child));
    }

    const result = parts.join('\n\n');
    return result ? result + '\n' : '';
  }

  /**
   * Emit a block node
   */
  private emitBlock(node: BlockNode): string {
    switch (node.kind) {
      // V3-specific nodes
      case 'runtimeCall':
        return this.emitRuntimeCall(node);
      case 'if':
        return this.emitIf(node);
      case 'else':
        return this.emitElse(node);
      case 'loop':
        return this.emitLoop(node);
      case 'break':
        return this.emitBreak(node);
      case 'return':
        return this.emitReturn(node);
      case 'askUser':
        return this.emitAskUser(node);
      case 'spawnAgent':
        return this.emitSpawnAgent(node);

      // Shared V1 nodes
      case 'heading':
        return '#'.repeat(node.level) + ' ' + this.emitInlineChildren(node.children);
      case 'paragraph':
        return this.emitInlineChildren(node.children);
      case 'list':
        return this.emitList(node);
      case 'codeBlock':
        return `\`\`\`${node.language || ''}\n${node.content}\n\`\`\``;
      case 'blockquote':
        return this.emitBlockquote(node);
      case 'thematicBreak':
        return '---';
      case 'table':
        return this.emitTable(node);
      case 'xmlBlock':
        return this.emitXmlBlock(node);
      case 'executionContext':
        return this.emitExecutionContext(node as import('../ir/nodes.js').ExecutionContextNode);
      case 'group':
        return node.children.map(c => this.emitBlock(c)).join('\n');
      case 'raw':
        return node.content;

      // V1 nodes that shouldn't appear in runtime documents
      case 'assign':
      case 'assignGroup':
      case 'onStatus':
      case 'readState':
      case 'writeState':
      case 'readFiles':
      case 'promptTemplate':
      case 'step':
      case 'successCriteria':
      case 'offerNext':
      case 'mcpServer':
      case 'runtimeVarDecl':
        throw new Error(`Unexpected node kind in runtime document: ${node.kind}`);

      default:
        // Exhaustiveness check
        const _exhaustive: never = node;
        throw new Error(`Unknown node kind: ${(_exhaustive as { kind: string }).kind}`);
    }
  }

  /**
   * Emit RuntimeCallNode as bash code block
   *
   * Output:
   * ```bash
   * CTX=$(node runtime.js fnName '{"args"}')
   * ```
   */
  private emitRuntimeCall(node: RuntimeCallNode): string {
    const argsJson = JSON.stringify(node.args);
    // Escape single quotes in JSON for shell
    const escapedArgs = argsJson.replace(/'/g, "'\"'\"'");
    return `\`\`\`bash\n${node.outputVar}=$(node runtime.js ${node.fnName} '${escapedArgs}')\n\`\`\``;
  }

  /**
   * Emit IfNode as prose conditional with jq
   *
   * Output:
   * **If ctx.error:**
   *
   * {children}
   */
  private emitIf(node: IfNode): string {
    const parts: string[] = [];
    const condProse = conditionToProse(node.condition);
    parts.push(`**If ${condProse}:**`);

    for (const child of node.children) {
      parts.push(this.emitBlock(child));
    }

    return parts.join('\n\n');
  }

  /**
   * Emit ElseNode
   */
  private emitElse(node: ElseNode): string {
    const parts: string[] = [];
    parts.push('**Otherwise:**');

    for (const child of node.children) {
      parts.push(this.emitBlock(child));
    }

    return parts.join('\n\n');
  }

  /**
   * Emit LoopNode as bounded loop
   *
   * Output:
   * **Loop up to N times:**
   *
   * {children}
   */
  private emitLoop(node: LoopNode): string {
    const parts: string[] = [];

    const counterInfo = node.counterVar ? ` (counter: $${node.counterVar})` : '';
    parts.push(`**Loop up to ${node.max} times${counterInfo}:**`);

    for (const child of node.children) {
      parts.push(this.emitBlock(child));
    }

    return parts.join('\n\n');
  }

  /**
   * Emit BreakNode
   */
  private emitBreak(node: BreakNode): string {
    if (node.message) {
      return `**Break loop:** ${node.message}`;
    }
    return '**Break loop**';
  }

  /**
   * Emit ReturnNode
   */
  private emitReturn(node: ReturnNode): string {
    const parts: string[] = ['**End command'];
    if (node.status) {
      parts[0] += ` (${node.status})`;
    }
    parts[0] += '**';
    if (node.message) {
      parts.push(node.message);
    }
    return parts.join(': ');
  }

  /**
   * Emit AskUserNode as AskUserQuestion syntax
   */
  private emitAskUser(node: AskUserNode): string {
    const lines: string[] = ['Use the AskUserQuestion tool:'];
    lines.push('');
    lines.push(`- Question: "${node.question}"`);

    if (node.header) {
      lines.push(`- Header: "${node.header}"`);
    }

    lines.push('- Options:');
    for (const opt of node.options) {
      const desc = opt.description ? ` - ${opt.description}` : '';
      lines.push(`  - "${opt.label}" (value: "${opt.value}")${desc}`);
    }

    lines.push('');
    lines.push(`Store the user's response in \`$${node.outputVar}\`.`);

    return lines.join('\n');
  }

  /**
   * Emit SpawnAgentNode as Task() syntax
   */
  private emitSpawnAgent(node: SpawnAgentNode): string {
    const escapeQuotes = (s: string): string => s.replace(/"/g, '\\"');

    // Build prompt
    let promptContent: string;
    if (node.prompt) {
      promptContent = node.prompt;
    } else if (node.input) {
      promptContent = this.formatInput(node.input);
    } else {
      promptContent = '';
    }

    // Handle loadFromFile
    let subagentType = node.agent;
    let promptOutput: string;

    if (node.loadFromFile) {
      subagentType = 'general-purpose';
      const prefix = `First, read ${node.loadFromFile} for your role and instructions.\\n\\n`;
      promptOutput = `"${escapeQuotes(prefix + promptContent)}"`;
    } else {
      promptOutput = `"${escapeQuotes(promptContent)}"`;
    }

    const taskBlock = `\`\`\`
Task(
  prompt=${promptOutput},
  subagent_type="${escapeQuotes(subagentType)}",
  model="${escapeQuotes(node.model)}",
  description="${escapeQuotes(node.description)}"
)
\`\`\``;

    // Add output capture if specified
    if (node.outputVar) {
      return `${taskBlock}\n\nStore the agent's result in \`$${node.outputVar}\`.`;
    }

    return taskBlock;
  }

  /**
   * Format V3 input for prompt
   */
  private formatInput(input: import('../ir/index.js').SpawnAgentInput): string {
    if (input.type === 'variable') {
      return `<input>\n{$${input.varName.toLowerCase()}}\n</input>`;
    }

    const sections: string[] = [];
    for (const prop of input.properties) {
      const value = this.formatInputValue(prop.value);
      sections.push(`<${prop.name}>\n${value}\n</${prop.name}>`);
    }
    return sections.join('\n\n');
  }

  /**
   * Format InputValue
   */
  private formatInputValue(value: InputValue): string {
    switch (value.type) {
      case 'string':
        return value.value;
      case 'runtimeVarRef':
        return toJqExpression(value.ref);
      case 'json':
        return JSON.stringify(value.value, null, 2);
    }
  }

  // ===========================================================================
  // Shared V1 Node Emitters
  // ===========================================================================

  private emitInlineChildren(nodes: InlineNode[]): string {
    return nodes.map(n => this.emitInline(n)).join('');
  }

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
    }
  }

  private emitList(node: import('../ir/nodes.js').ListNode): string {
    const items = node.items.map((item, idx) => {
      const marker = node.ordered ? `${(node.start ?? 1) + idx}.` : '-';
      const content = item.children.map(c => this.emitBlock(c as BlockNode)).join('\n');
      return `${marker} ${content}`;
    });
    return items.join('\n');
  }

  private emitBlockquote(node: import('../ir/nodes.js').BlockquoteNode): string {
    const content = node.children.map(c => this.emitBlock(c as BlockNode)).join('\n\n');
    return content.split('\n').map(line => `> ${line}`).join('\n');
  }

  private emitTable(node: import('../ir/nodes.js').TableNode): string {
    const lines: string[] = [];
    const colCount = node.headers?.length ?? node.rows[0]?.length ?? 0;

    if (node.headers?.length) {
      lines.push('| ' + node.headers.join(' | ') + ' |');
    }

    // Separator
    const seps = Array(colCount).fill(':---');
    lines.push('| ' + seps.join(' | ') + ' |');

    for (const row of node.rows) {
      lines.push('| ' + row.map(c => c ?? '').join(' | ') + ' |');
    }

    return lines.join('\n');
  }

  private emitXmlBlock(node: import('../ir/nodes.js').XmlBlockNode): string {
    const attrs = node.attributes
      ? ' ' + Object.entries(node.attributes).map(([k, v]) => `${k}="${v}"`).join(' ')
      : '';
    const content = node.children.map(c => this.emitBlock(c as BlockNode)).join('\n\n');
    return `<${node.name}${attrs}>\n${content}\n</${node.name}>`;
  }

  private emitExecutionContext(node: import('../ir/nodes.js').ExecutionContextNode): string {
    const lines: string[] = ['<execution_context>'];

    // Emit each path with prefix
    for (const path of node.paths) {
      const prefixedPath = path.startsWith(node.prefix) ? path : `${node.prefix}${path}`;
      lines.push(prefixedPath);
    }

    // Emit children if any
    if (node.children.length > 0) {
      const content = node.children.map(c => this.emitBlock(c as BlockNode)).join('\n\n');
      lines.push(content);
    }

    lines.push('</execution_context>');
    return lines.join('\n');
  }
}

// ============================================================================
// Convenience Function
// ============================================================================

/**
 * Emit a V3 document to markdown
 */
export function emitDocument(doc: DocumentNode): string {
  const emitter = new RuntimeMarkdownEmitter();
  return emitter.emit(doc);
}
