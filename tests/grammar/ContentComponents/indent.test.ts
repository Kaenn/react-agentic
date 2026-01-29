/**
 * Grammar Tests: Indent Component
 *
 * Tests Indent component for indented content blocks.
 *
 * NOTE: Indent is defined in components but not yet implemented in the transformer.
 * These tests document the expected behavior when implemented.
 */

import { describe, it, expect } from 'vitest';
import { wrapInAgent, expectAgentTransformError } from '../_helpers/test-utils.js';

describe('<Indent>', () => {
  describe('current behavior', () => {
    // Indent component is defined in types but not imported in the test wrapper.
    // The V1 transformer treats it as an unknown component.
    it('throws component not imported error (not implemented)', () => {
      const tsx = wrapInAgent('<Indent><p>Content</p></Indent>');
      expectAgentTransformError(tsx, /Component 'Indent' not imported/);
    });
  });

  // The following tests document expected behavior when Indent is implemented
  describe.skip('type safety (when implemented)', () => {
    it.todo('compiles with children');
    it.todo('accepts spaces prop');
  });

  describe.skip('output correctness (when implemented)', () => {
    it.todo('indents content with default spaces (2)');
    it.todo('indents content with custom spaces');
    it.todo('indents each line of multiline content');
  });

  describe.skip('nested content (when implemented)', () => {
    it.todo('indents block elements');
    it.todo('handles nested Indent');
  });
});
