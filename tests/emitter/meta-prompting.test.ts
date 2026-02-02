/**
 * Meta-prompting emitter tests
 *
 * Tests for ReadFile emission patterns.
 */

import { describe, it, expect } from 'vitest';
import { emit, type DocumentNode } from '../../src/index.js';
import type { ReadFileNode } from '../../src/ir/nodes.js';

/**
 * Helper to create a document with a single block
 */
function doc(child: DocumentNode['children'][0]): DocumentNode {
  return {
    kind: 'document',
    children: [child],
  };
}

describe('emitReadFile', () => {
  describe('required files', () => {
    it('emits VAR=$(cat path) for required file', () => {
      const node: ReadFileNode = {
        kind: 'readFile',
        path: '.planning/STATE.md',
        varName: 'STATE_CONTENT',
        required: true,
      };

      expect(emit(doc(node))).toBe('```bash\nSTATE_CONTENT=$(cat .planning/STATE.md)\n```\n');
    });

    it('smart quotes path with variable reference - quotes var, not glob', () => {
      const node: ReadFileNode = {
        kind: 'readFile',
        path: '${PHASE_DIR}/*-CONTEXT.md',
        varName: 'CONTEXT',
        required: true,
      };

      // Variable part quoted, glob part unquoted so it expands
      expect(emit(doc(node))).toBe('```bash\nCONTEXT=$(cat "${PHASE_DIR}"/*-CONTEXT.md)\n```\n');
    });

    it('quotes entire path when no globs present', () => {
      const node: ReadFileNode = {
        kind: 'readFile',
        path: '${PHASE_DIR}/STATE.md',
        varName: 'STATE',
        required: true,
      };

      expect(emit(doc(node))).toBe('```bash\nSTATE=$(cat "${PHASE_DIR}/STATE.md")\n```\n');
    });

    it('quotes path with spaces', () => {
      const node: ReadFileNode = {
        kind: 'readFile',
        path: 'my file.md',
        varName: 'CONTENT',
        required: true,
      };

      expect(emit(doc(node))).toBe('```bash\nCONTENT=$(cat "my file.md")\n```\n');
    });
  });

  describe('optional files', () => {
    it('emits VAR=$(cat path 2>/dev/null) for optional file', () => {
      const node: ReadFileNode = {
        kind: 'readFile',
        path: '.planning/REQUIREMENTS.md',
        varName: 'REQS',
        required: false,
      };

      expect(emit(doc(node))).toBe('```bash\nREQS=$(cat .planning/REQUIREMENTS.md 2>/dev/null)\n```\n');
    });

    it('smart quotes and suppresses errors for optional file with variable and glob', () => {
      const node: ReadFileNode = {
        kind: 'readFile',
        path: '${PHASE_DIR}/*-RESEARCH.md',
        varName: 'RESEARCH',
        required: false,
      };

      // Variable part quoted, glob part unquoted so it expands
      expect(emit(doc(node))).toBe('```bash\nRESEARCH=$(cat "${PHASE_DIR}"/*-RESEARCH.md 2>/dev/null)\n```\n');
    });
  });
});
