import type { ReactNode } from 'react';
import { ExecutionContext } from '../workflow/sections/semantic.js';

/**
 * Enhanced execution context with title and additional content
 *
 * Wraps ExecutionContext with common file reference patterns.
 *
 * @param props - Component props
 * @param props.files - File paths to reference
 * @param props.prefix - Path prefix (default: '@')
 * @param props.title - Optional section title
 * @param props.children - Additional content after file list
 *
 * @example Basic file context
 * ```tsx
 * import { FileContext } from 'react-agentic/composites';
 *
 * <FileContext files={[
 *   "~/.claude/agents/my-agent.md",
 *   ".planning/PROJECT.md"
 * ]} />
 * ```
 *
 * @example With title and content
 * ```tsx
 * <FileContext
 *   title="Reference Files"
 *   files={["/path/to/config.json", "/path/to/schema.ts"]}
 * >
 *   <p>These files contain the configuration and type definitions.</p>
 * </FileContext>
 * ```
 *
 * @see {@link ExecutionContext} for the underlying context primitive
 */
export interface FileContextProps {
  /** File paths to reference (@ prefix added automatically) */
  files: string[];
  /** Path prefix (default: '@') */
  prefix?: string;
  /** Optional section title */
  title?: string;
  /** Additional content after file list */
  children?: ReactNode;
}

export const FileContext = ({
  files,
  prefix,
  title,
  children
}: FileContextProps): ReactNode => {
  return (
    <>
      {title && <p><b>{title}</b></p>}
      <ExecutionContext paths={files} prefix={prefix}>
        {children}
      </ExecutionContext>
    </>
  );
};
