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

/**
 * Error class for cross-file validation errors
 * Includes source locations for both the usage site (Command) and definition site (Agent)
 */
export class CrossFileError extends TranspileError {
  readonly agentLocation: SourceLocation | undefined;

  constructor(
    message: string,
    commandLocation: SourceLocation,
    agentLocation?: SourceLocation,
    sourceCode?: string
  ) {
    super(message, commandLocation, sourceCode);
    this.name = 'CrossFileError';
    this.agentLocation = agentLocation;
  }
}

/**
 * Format a CrossFileError for display
 * Shows both the command (primary) and agent (secondary) locations
 *
 * Example output:
 * ```
 * commands/plan.tsx:15:5 - error: SpawnAgent prompt missing required property: 'phase'
 *
 *   15 | <SpawnAgent<ResearcherInput>
 *      |  ^
 *
 * Agent interface defined at: agents/researcher.tsx:3:1
 * ```
 */
export function formatCrossFileError(error: CrossFileError): string {
  const parts: string[] = [];

  // Primary location (command/usage site)
  parts.push(formatTranspileError(error));

  // Secondary location (agent/definition site)
  if (error.agentLocation) {
    const { file, line, column } = error.agentLocation;
    parts.push('');
    parts.push(
      `${pc.dim('Agent interface defined at:')} ${pc.cyan(file)}:${pc.dim(String(line))}:${pc.dim(String(column))}`
    );
  }

  return parts.join('\n');
}
