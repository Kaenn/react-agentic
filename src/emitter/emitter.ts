/**
 * Markdown Emitter - Converts IR to Markdown output
 *
 * Uses switch-based emission with exhaustiveness checking.
 * Handles nested structures (lists, inline formatting) through recursive calls.
 */

import matter from 'gray-matter';
import type {
  BlockNode,
  BlockquoteNode,
  CodeBlockNode,
  DocumentNode,
  FrontmatterNode,
  HeadingNode,
  InlineNode,
  ListItemNode,
  ListNode,
  ParagraphNode,
  XmlBlockNode,
} from '../ir/index.js';
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
      case 'xmlBlock':
        return this.emitXmlBlock(node);
      case 'raw':
        return node.content;
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
   * Emit a sequence of inline nodes
   */
  private emitInlineChildren(nodes: InlineNode[]): string {
    return nodes.map((node) => this.emitInline(node)).join('');
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
        // Nested list: emit with proper indentation
        const nestedList = this.emitBlock(child);
        // Add indent to each line of nested list
        const indentedLines = nestedList
          .split('\n')
          .map((line) => indent + '  ' + line)
          .join('\n');
        contentParts.push(indentedLines);
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
   * Emit XML block - <name>content</name>
   */
  private emitXmlBlock(node: XmlBlockNode): string {
    const innerContent = node.children.map((child) => this.emitBlock(child)).join('\n\n');

    return `<${node.name}>\n${innerContent}\n</${node.name}>`;
  }
}

/**
 * Convenience function for emitting a document
 */
export function emit(doc: DocumentNode): string {
  const emitter = new MarkdownEmitter();
  return emitter.emit(doc);
}
