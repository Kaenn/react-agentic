/**
 * Grammar Tests: Div (<div>)
 *
 * Tests div element transformation:
 * - Named div (name="x") becomes <x>...</x> XML block
 * - Unnamed div becomes invisible grouping container (no XML tags)
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent, wrapInAgent, expectAgentTransformError } from '../_helpers/test-utils.js';

describe('Div (<div>)', () => {
  describe('named div (→ XML block)', () => {
    describe('type safety', () => {
      it('compiles with name prop', () => {
        const content = '<div name="example"><p>Content</p></div>';
        expect(() => transformAgentContent(content)).not.toThrow();
      });

      it('accepts additional attributes', () => {
        const content = '<div name="section" id="intro" class="main"><p>Content</p></div>';
        expect(() => transformAgentContent(content)).not.toThrow();
      });
    });

    describe('output correctness', () => {
      it('emits as XML block with name', () => {
        const output = transformAgentContent('<div name="example"><p>Content</p></div>');
        expect(output).toContain('<example>');
        expect(output).toContain('Content');
        expect(output).toContain('</example>');
      });

      it('emits additional attributes', () => {
        const output = transformAgentContent('<div name="section" id="intro" class="main"><p>Content</p></div>');
        expect(output).toContain('<section id="intro" class="main">');
        expect(output).toContain('</section>');
      });

      it('handles self-closing named div', () => {
        const output = transformAgentContent('<div name="break" />');
        expect(output).toContain('<break>');
        expect(output).toContain('</break>');
      });
    });

    describe('name validation', () => {
      it('throws for name with spaces', () => {
        const tsx = wrapInAgent('<div name="has spaces"><p>Content</p></div>');
        expectAgentTransformError(tsx, /Invalid XML tag name/);
      });

      it('throws for name starting with number', () => {
        const tsx = wrapInAgent('<div name="123start"><p>Content</p></div>');
        expectAgentTransformError(tsx, /Invalid XML tag name/);
      });

      it('throws for name starting with xml', () => {
        const tsx = wrapInAgent('<div name="xmlData"><p>Content</p></div>');
        expectAgentTransformError(tsx, /Invalid XML tag name/);
      });

      it('accepts valid XML names', () => {
        const validNames = ['example', 'my-block', 'section_one', 'Block123'];
        validNames.forEach((name) => {
          expect(() => transformAgentContent(`<div name="${name}"><p>Content</p></div>`)).not.toThrow();
        });
      });
    });
  });

  describe('unnamed div (→ invisible grouping)', () => {
    describe('type safety', () => {
      it('compiles without name prop', () => {
        const content = '<div><p>Content</p></div>';
        expect(() => transformAgentContent(content)).not.toThrow();
      });
    });

    describe('output correctness', () => {
      it('emits content without wrapper tags (invisible grouping)', () => {
        // Unnamed div is an invisible grouping container - no XML tags emitted
        const output = transformAgentContent('<div><p>Plain content</p></div>');
        expect(output).toContain('Plain content');
        // Should NOT have <div> tags - it's invisible grouping
        expect(output).not.toContain('<div>');
        expect(output).not.toContain('</div>');
      });
    });
  });

  describe('nesting', () => {
    it('allows nested named divs', () => {
      const output = transformAgentContent(`
        <div name="outer">
          <div name="inner">
            <p>Nested</p>
          </div>
        </div>
      `);
      expect(output).toContain('<outer>');
      expect(output).toContain('<inner>');
      expect(output).toContain('</inner>');
      expect(output).toContain('</outer>');
    });
  });
});
