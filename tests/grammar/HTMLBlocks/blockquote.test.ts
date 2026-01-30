/**
 * Grammar Tests: Blockquote (<blockquote>)
 *
 * Tests blockquote element transformation to markdown.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('Blockquote (<blockquote>)', () => {
  describe('type safety', () => {
    it('compiles with block children', () => {
      const content = '<blockquote><p>Quote text</p></blockquote>';
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('accepts multiple paragraphs', () => {
      const content = `
        <blockquote>
          <p>First paragraph</p>
          <p>Second paragraph</p>
        </blockquote>
      `;
      expect(() => transformAgentContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits with > prefix', () => {
      const output = transformAgentContent(`
        <blockquote>
          <p>A wise quote</p>
        </blockquote>
      `);
      expect(output).toContain('> A wise quote');
    });

    it('prefixes each line with >', () => {
      const output = transformAgentContent(`
        <blockquote>
          <p>First line</p>
          <p>Second line</p>
        </blockquote>
      `);
      expect(output).toContain('> First line');
      expect(output).toContain('> Second line');
    });

    it('preserves inline formatting', () => {
      const output = transformAgentContent(`
        <blockquote>
          <p>Quote with <b>bold</b> text</p>
        </blockquote>
      `);
      expect(output).toContain('> Quote with **bold** text');
    });
  });

  describe('nested blockquotes', () => {
    it('handles nested blockquote', () => {
      const output = transformAgentContent(`
        <blockquote>
          <p>Outer</p>
          <blockquote>
            <p>Inner</p>
          </blockquote>
        </blockquote>
      `);
      expect(output).toContain('> Outer');
      expect(output).toContain('> > Inner');
    });
  });

  describe('blockquote with other blocks', () => {
    it('handles heading inside blockquote', () => {
      const output = transformAgentContent(`
        <blockquote>
          <h2>Title</h2>
          <p>Content</p>
        </blockquote>
      `);
      expect(output).toContain('> ## Title');
      expect(output).toContain('> Content');
    });

    it('handles list inside blockquote', () => {
      const output = transformAgentContent(`
        <blockquote>
          <ul>
            <li>Item one</li>
            <li>Item two</li>
          </ul>
        </blockquote>
      `);
      expect(output).toContain('> - Item one');
      expect(output).toContain('> - Item two');
    });
  });
});
