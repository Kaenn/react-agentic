/**
 * ts-morph Parser - TSX file parsing and JSX AST extraction
 *
 * Provides utilities for parsing TSX files and extracting JSX elements
 * for transformation into IR nodes.
 */

import {
  Project,
  SourceFile,
  ScriptTarget,
  ModuleKind,
  ts,
} from 'ts-morph';

/**
 * Create a ts-morph Project configured for JSX parsing
 */
export function createProject(): Project {
  return new Project({
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
    },
    useInMemoryFileSystem: true,
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
