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
  RuntimeCallArgValue,
} from '../ir/index.js';
import type { InlineNode } from '../ir/nodes.js';
import { assertNever } from './utils.js';

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

    // Emit frontmatter using simple YAML to avoid unnecessary quoting
    if (doc.frontmatter) {
      const lines: string[] = ['---'];
      for (const [key, value] of Object.entries(doc.frontmatter.data)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
          // Handle arrays (like arguments)
          lines.push(`${key}:`);
          for (const item of value) {
            if (typeof item === 'object' && item !== null) {
              // Object in array - emit as indented YAML
              const entries = Object.entries(item);
              for (let i = 0; i < entries.length; i++) {
                const [k, v] = entries[i];
                if (i === 0) {
                  // First key gets the dash
                  lines.push(`  - ${k}: ${this.formatYamlValue(v)}`);
                } else {
                  // Subsequent keys are indented
                  lines.push(`    ${k}: ${this.formatYamlValue(v)}`);
                }
              }
            } else {
              // Simple value in array
              lines.push(`  - ${item}`);
            }
          }
        } else {
          lines.push(`${key}: ${value}`);
        }
      }
      lines.push('---');
      parts.push(lines.join('\n'));
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
        return node.children.map(c => this.emitBlock(c)).join('\n\n');
      case 'raw':
        return node.content;
      case 'indent':
        return this.emitIndent(node as import('../ir/nodes.js').IndentNode);

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

      // Contract components
      case 'role':
        return this.emitContractComponent('role', node);
      case 'upstreamInput':
        return this.emitContractComponent('upstream_input', node);
      case 'downstreamConsumer':
        return this.emitContractComponent('downstream_consumer', node);
      case 'methodology':
        return this.emitContractComponent('methodology', node);
      case 'structuredReturns':
        return this.emitStructuredReturns(node);

      default:
        return assertNever(node);
    }
  }

  /**
   * Emit RuntimeCallNode as declarative table + bash execution
   *
   * Output:
   * **Runtime Call**: `functionName`
   *
   * | Argument | Source |
   * |----------|--------|
   * | projectId | CTX.projectId |
   *
   * ```bash
   * RESULT=$(node .claude/runtime/runtime.js functionName '{"projectId": ...}')
   * ```
   */
  private emitRuntimeCall(node: RuntimeCallNode): string {
    const lines: string[] = [];

    // Function name header
    lines.push(`**Runtime Call**: \`${node.fnName}\``);
    lines.push('');

    // Build arguments table
    const argEntries = Object.entries(node.args);
    if (argEntries.length > 0) {
      lines.push('| Argument | Source |');
      lines.push('|----------|--------|');

      for (const [name, value] of argEntries) {
        const formattedValue = this.formatArgValue(value);
        // Escape pipe characters in values for table formatting
        const escapedValue = formattedValue.replace(/\|/g, '\\|');
        lines.push(`| ${name} | ${escapedValue} |`);
      }

      lines.push('');
    }

    // Build bash execution block
    lines.push('```bash');
    lines.push(`${node.outputVar}=$(node .claude/runtime/runtime.js ${node.fnName} '${this.buildJsonArgs(argEntries)}')`);
    lines.push('```');

    return lines.join('\n');
  }

  /**
   * Build JSON args string for bash command
   * Shows literal values directly, variable refs as placeholders
   */
  private buildJsonArgs(argEntries: [string, RuntimeCallArgValue][]): string {
    if (argEntries.length === 0) return '{}';

    const parts: string[] = [];
    for (const [name, value] of argEntries) {
      parts.push(`"${name}": ${this.formatArgForJson(value)}`);
    }
    return `{${parts.join(', ')}}`;
  }

  /**
   * Format a RuntimeCallArgValue for JSON in bash
   */
  private formatArgForJson(value: RuntimeCallArgValue): string {
    switch (value.type) {
      case 'literal':
        if (value.value === null) return 'null';
        if (typeof value.value === 'string') return `"${value.value}"`;
        if (typeof value.value === 'boolean') return value.value ? 'true' : 'false';
        return String(value.value);

      case 'runtimeVarRef': {
        const { varName, path } = value.ref;
        const jqPath = path.length === 0 ? '.' : '.' + path.join('.');
        return `"$(echo "$${varName}" | jq -r '${jqPath}')"`;
      }

      case 'expression':
        // For expressions, use a placeholder that indicates manual resolution
        return `"<${value.description}>"`;

      case 'json': {
        if (Array.isArray(value.value)) {
          const items = value.value.map(v => this.formatArgForJson(v));
          return `[${items.join(', ')}]`;
        }
        const entries = Object.entries(value.value as Record<string, RuntimeCallArgValue>)
          .map(([k, v]) => `"${k}": ${this.formatArgForJson(v)}`);
        return `{${entries.join(', ')}}`;
      }

      case 'conditional': {
        // Generate jq conditional expression
        const { varName, path } = value.condition;
        const jqPath = path.length === 0 ? '.' : '.' + path.join('.');
        const trueVal = this.formatLiteralForJson(value.whenTrue);
        const falseVal = this.formatLiteralForJson(value.whenFalse);
        return `"$(echo "$${varName}" | jq -r 'if ${jqPath} then ${trueVal} else ${falseVal} end')"`;
      }

      default:
        return '""';
    }
  }

  /**
   * Format a RuntimeCallArgValue for display in the arguments table
   */
  private formatArgValue(value: RuntimeCallArgValue): string {
    switch (value.type) {
      case 'literal':
        if (value.value === null) return 'null';
        if (typeof value.value === 'string') return `"${value.value}"`;
        return String(value.value);

      case 'runtimeVarRef': {
        const { varName, path } = value.ref;
        if (path.length === 0) {
          return varName;
        }
        return `${varName}.${path.join('.')}`;
      }

      case 'expression':
        return value.description;

      case 'json': {
        if (Array.isArray(value.value)) {
          const items = value.value.map(v => this.formatArgValue(v));
          return `[${items.join(', ')}]`;
        }
        const entries = Object.entries(value.value as Record<string, RuntimeCallArgValue>)
          .map(([k, v]) => `${k}: ${this.formatArgValue(v)}`);
        return `{ ${entries.join(', ')} }`;
      }

      case 'conditional': {
        const { varName, path } = value.condition;
        const condPath = path.length === 0 ? varName : `${varName}.${path.join('.')}`;
        const trueDisplay = this.formatArgValue(value.whenTrue);
        const falseDisplay = this.formatArgValue(value.whenFalse);
        return `if $${condPath} then ${trueDisplay} else ${falseDisplay}`;
      }

      default:
        return String(value);
    }
  }

  /**
   * Format a RuntimeCallArgValue as a jq-compatible literal for conditionals
   */
  private formatLiteralForJson(value: RuntimeCallArgValue): string {
    switch (value.type) {
      case 'literal':
        if (value.value === null) return 'null';
        if (typeof value.value === 'string') return `"${value.value}"`;
        if (typeof value.value === 'boolean') return value.value ? 'true' : 'false';
        return String(value.value);

      case 'runtimeVarRef': {
        const { varName, path } = value.ref;
        const jqPath = path.length === 0 ? '.' : '.' + path.join('.');
        // Return as jq expression that will be evaluated
        return `($ENV.${varName} | fromjson | ${jqPath})`;
      }

      case 'conditional': {
        // Recursively handle nested conditionals
        const jqPath = value.condition.path.length === 0 ? '.' : '.' + value.condition.path.join('.');
        const trueVal = this.formatLiteralForJson(value.whenTrue);
        const falseVal = this.formatLiteralForJson(value.whenFalse);
        return `(if ${jqPath} then ${trueVal} else ${falseVal} end)`;
      }

      default:
        // For complex types (expressions), use string representation
        return `"<complex>"`;
    }
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
   * Format a string or RuntimeVarRefNode for Task() output
   *
   * For static strings: returns escaped string in quotes
   * For RuntimeVarRefNode: returns jq expression (no quotes, will be interpolated)
   */
  private formatSpawnAgentProp(value: string | RuntimeVarRefNode): string {
    if (typeof value === 'string') {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    // RuntimeVarRefNode - use jq expression
    return toJqExpression(value);
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
    let subagentType: string | RuntimeVarRefNode = node.agent;
    let promptOutput: string;

    if (node.loadFromFile) {
      subagentType = 'general-purpose';
      const prefix = `First, read ${node.loadFromFile} for your role and instructions.\\n\\n`;
      promptOutput = `"${escapeQuotes(prefix + promptContent)}"`;
    } else {
      promptOutput = `"${escapeQuotes(promptContent)}"`;
    }

    // Format props - handle both static strings and RuntimeVar refs
    const formattedAgent = this.formatSpawnAgentProp(subagentType);
    const formattedModel = this.formatSpawnAgentProp(node.model);
    const formattedDescription = this.formatSpawnAgentProp(node.description);

    const taskBlock = `\`\`\`
Task(
  prompt=${promptOutput},
  subagent_type=${formattedAgent},
  model=${formattedModel},
  description=${formattedDescription}
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
    // Emit children and join with double newlines for block separation
    const parts: string[] = [];
    for (const child of node.children) {
      const emitted = this.emitBlock(child as BlockNode);
      if (emitted) parts.push(emitted);
    }
    // Join blocks with double newlines (same as document-level emission)
    const content = parts.join('\n\n');
    // Strip leading/trailing newlines, then add exactly one newline before closing tag
    const normalizedContent = content.replace(/^\n+/, '').replace(/\n+$/, '');
    return `<${node.name}${attrs}>\n${normalizedContent}\n</${node.name}>`;
  }

  /**
   * Format a value for YAML output
   * Quotes strings that contain special YAML characters
   */
  private formatYamlValue(value: unknown): string {
    if (typeof value === 'string') {
      // Quote if contains colon followed by space, or starts/ends with special chars
      if (value.includes(': ') || /^['"@&*!|>%]/.test(value) || /["'\n]/.test(value)) {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      return value;
    }
    if (typeof value === 'boolean') {
      return value.toString();
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    return String(value);
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

  private emitIndent(node: import('../ir/nodes.js').IndentNode): string {
    // Emit children content
    const content = node.children.map(c => this.emitBlock(c as BlockNode)).join('\n\n');

    // Prepend spaces to each line
    const indent = ' '.repeat(node.spaces);
    return content.split('\n').map(line => line ? indent + line : line).join('\n');
  }

  /**
   * Emit a contract component as XML block with snake_case tag name
   */
  private emitContractComponent(
    tagName: string,
    node: import('../ir/nodes.js').RoleNode | import('../ir/nodes.js').UpstreamInputNode | import('../ir/nodes.js').DownstreamConsumerNode | import('../ir/nodes.js').MethodologyNode
  ): string {
    const children = node.children.map(c => this.emitBlock(c as BlockNode)).join('\n\n');
    // Indent children for readability
    return `<${tagName}>\n${children}\n</${tagName}>`;
  }

  /**
   * Emit StructuredReturns with ## headings for each status
   */
  private emitStructuredReturns(node: import('../ir/nodes.js').StructuredReturnsNode): string {
    const sections = node.returns.map(returnNode => {
      const heading = `## ${returnNode.status}`;
      const content = returnNode.children
        .map(c => this.emitBlock(c as BlockNode))
        .join('\n\n');
      return content ? `${heading}\n\n${content}` : heading;
    }).join('\n\n');

    return `<structured_returns>\n\n${sections}\n\n</structured_returns>`;
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
