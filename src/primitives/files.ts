/**
 * JSX component stubs for react-agentic - File reading primitives
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

import type { FilesFromSchema, FileSchema } from './schema.js';

/**
 * Props for the ReadFiles component
 */
export interface ReadFilesProps {
  /** Files schema from defineFiles() */
  files: FilesFromSchema<FileSchema>;
}

/**
 * ReadFiles component - emit bash commands to read file contents
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime. Emits bash code block with cat commands
 * that store file contents in variables.
 *
 * @example Basic usage
 * const files = defineFiles({
 *   state: { path: '.planning/STATE.md', required: true },
 *   requirements: { path: '.planning/REQUIREMENTS.md', required: false },
 * });
 *
 * <ReadFiles files={files} />
 *
 * // Output:
 * // ```bash
 * // STATE_CONTENT=$(cat .planning/STATE.md)
 * // REQUIREMENTS_CONTENT=$(cat .planning/REQUIREMENTS.md 2>/dev/null)
 * // ```
 *
 * @example Access file content later
 * <If test={`[ -n "$STATE_CONTENT" ]`}>
 *   <p>State file loaded successfully</p>
 * </If>
 *
 * Replaces verbose patterns:
 * <AssignGroup>
 *   <Assign var={stateContent} bash={`cat .planning/STATE.md`} />
 *   <Assign var={reqContent} bash={`cat .planning/REQUIREMENTS.md 2>/dev/null`} />
 * </AssignGroup>
 */
export function ReadFiles(_props: ReadFilesProps): null {
  return null;
}
