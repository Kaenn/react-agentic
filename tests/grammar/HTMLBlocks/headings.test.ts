/**
 * Grammar Tests: Headings (h1-h6)
 *
 * Tests HTML heading elements transformation to markdown.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent, wrapInAgent, expectAgentTransformError } from '../_helpers/test-utils.js';

describe('Headings (h1-h6)', () => {
  describe('type safety', () => {
    it('compiles h1 through h6', () => {
      for (let level = 1; level <= 6; level++) {
        const content = `<h${level}>Heading ${level}</h${level}>`;
        expect(() => transformAgentContent(content)).not.toThrow();
      }
    });

    it('accepts inline children', () => {
      const content = '<h1>Title with <b>bold</b></h1>';
      expect(() => transformAgentContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits h1 as # prefix', () => {
      const output = transformAgentContent('<h1>Title</h1>');
      expect(output).toContain('# Title');
    });

    it('emits h2 as ## prefix', () => {
      const output = transformAgentContent('<h2>Subtitle</h2>');
      expect(output).toContain('## Subtitle');
    });

    it('emits h3 as ### prefix', () => {
      const output = transformAgentContent('<h3>Section</h3>');
      expect(output).toContain('### Section');
    });

    it('emits h4 as #### prefix', () => {
      const output = transformAgentContent('<h4>Subsection</h4>');
      expect(output).toContain('#### Subsection');
    });

    it('emits h5 as ##### prefix', () => {
      const output = transformAgentContent('<h5>Detail</h5>');
      expect(output).toContain('##### Detail');
    });

    it('emits h6 as ###### prefix', () => {
      const output = transformAgentContent('<h6>Fine print</h6>');
      expect(output).toContain('###### Fine print');
    });

    it('preserves inline formatting in headings', () => {
      const output = transformAgentContent("<h1>Title with <b>bold</b>{' '}and{' '}<i>italic</i></h1>");
      expect(output).toContain('# Title with **bold** and *italic*');
    });

    it('preserves inline code in headings', () => {
      const output = transformAgentContent('<h2>Using <code>npm install</code></h2>');
      expect(output).toContain('## Using `npm install`');
    });
  });

  describe('whitespace handling', () => {
    it('trims leading and trailing whitespace', () => {
      const output = transformAgentContent('<h1>   Trimmed Title   </h1>');
      expect(output).toContain('# Trimmed Title');
    });

    it('normalizes internal whitespace', () => {
      const output = transformAgentContent('<h1>Multiple   Spaces</h1>');
      expect(output).toContain('# Multiple Spaces');
    });
  });
});
