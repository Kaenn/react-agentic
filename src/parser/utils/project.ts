/**
 * ts-morph Project creation and file parsing utilities
 */

import {
  Project,
  SourceFile,
  ScriptTarget,
  ModuleKind,
  ts,
} from 'ts-morph';

export interface CreateProjectOptions {
  /**
   * Use in-memory filesystem (default: false)
   * Set to true for test scenarios where files don't exist on disk
   */
  inMemory?: boolean;
}

/**
 * Create a ts-morph Project configured for JSX parsing
 *
 * @param options.inMemory - Use in-memory filesystem (default: false)
 */
export function createProject(options: CreateProjectOptions = {}): Project {
  return new Project({
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
    },
    useInMemoryFileSystem: options.inMemory ?? false,
  });
}

/**
 * Add and parse a file from the filesystem
 */
export function parseFile(project: Project, filePath: string): SourceFile {
  return project.addSourceFileAtPath(filePath);
}

/**
 * Parse an in-memory TSX string
 */
export function parseSource(
  project: Project,
  source: string,
  fileName = 'source.tsx'
): SourceFile {
  return project.createSourceFile(fileName, source, { overwrite: true });
}
