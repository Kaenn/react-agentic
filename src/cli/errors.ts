/**
 * Error Utilities - Source-located errors for transpilation
 *
 * Provides TypeScript-style error formatting with file path, line, column,
 * code snippets, and caret indicators.
 */
import pc from 'picocolors';
import { Node, SourceFile } from 'ts-morph';

/**
 * Source location information for an error
 */
export interface SourceLocation {
  /** Absolute path to the source file */
  file: string;
  /** 1-based line number */
  line: number;
  /** 1-based column number */
  column: number;
}

/**
 * Error class for transpilation errors with source location context
 */
export class TranspileError extends Error {
  readonly location: SourceLocation | undefined;
  readonly sourceCode: string | undefined;

  constructor(
    message: string,
    location?: SourceLocation,
    sourceCode?: string
  ) {
    super(message);
    this.name = 'TranspileError';
    this.location = location;
    this.sourceCode = sourceCode;
  }
}

/**
 * Get source location from a ts-morph Node
 *
 * @param node - The AST node to get location for
 * @returns SourceLocation with file path and 1-based line/column
 */
export function getNodeLocation(node: Node): SourceLocation {
  const sourceFile = node.getSourceFile();
  const pos = node.getStart();
  const { line, column } = sourceFile.getLineAndColumnAtPos(pos);

  return {
    file: sourceFile.getFilePath(),
    line,
    column,
  };
}

/**
 * Get source code from a source file for error display
 *
 * @param sourceFile - The source file
 * @returns The full source code text
 */
export function getSourceCode(sourceFile: SourceFile): string {
  return sourceFile.getFullText();
}

/**
 * Format a TranspileError for display
 *
 * Produces TypeScript-style error output:
 * ```
 * file.tsx:15:10 - error: Command requires name prop
 *
 *   15 | <Command description="test">
 *      |          ^
 * ```
 *
 * @param error - The transpile error to format
 * @returns Formatted error string with colors
 */
export function formatTranspileError(error: TranspileError): string {
  const parts: string[] = [];

  // Header: file:line:col - error: message
  if (error.location) {
    const { file, line, column } = error.location;
    parts.push(
      `${pc.cyan(file)}:${pc.dim(String(line))}:${pc.dim(String(column))} - ${pc.red('error:')} ${error.message}`
    );
  } else {
    parts.push(`${pc.red('error:')} ${error.message}`);
  }

  // Code snippet with caret
  if (error.location && error.sourceCode) {
    const { line, column } = error.location;
    const lines = error.sourceCode.split('\n');
    const errorLine = lines[line - 1]; // 0-indexed array

    if (errorLine !== undefined) {
      parts.push('');

      // Format: "  15 | code here"
      const lineNum = String(line);
      const padding = ' '.repeat(lineNum.length + 1);
      parts.push(`${pc.dim(`  ${lineNum} |`)} ${errorLine}`);

      // Caret line: "     |          ^"
      const caretPadding = ' '.repeat(column - 1);
      parts.push(`${pc.dim(`${padding} |`)} ${caretPadding}${pc.red('^')}`);
    }
  }

  return parts.join('\n');
}
