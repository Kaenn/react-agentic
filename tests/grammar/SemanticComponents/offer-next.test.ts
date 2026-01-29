/**
 * Grammar Tests: OfferNext Component
 *
 * Tests OfferNext for route navigation suggestions.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('<OfferNext>', () => {
  describe('type safety', () => {
    it('compiles with routes array', () => {
      const content = `
        <OfferNext routes={[
          { name: 'Continue', path: '/continue' }
        ]} />
      `;
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('accepts description in routes', () => {
      const content = `
        <OfferNext routes={[
          { name: 'Continue', description: 'Proceed to next step', path: '/continue' }
        ]} />
      `;
      expect(() => transformAgentContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits offer_next XML block', () => {
      const output = transformAgentContent(`
        <OfferNext routes={[{ name: 'Test', path: '/test' }]} />
      `);
      expect(output).toContain('<offer_next>');
      expect(output).toContain('</offer_next>');
    });

    it('emits route name as bold', () => {
      const output = transformAgentContent(`
        <OfferNext routes={[{ name: 'Continue', path: '/continue' }]} />
      `);
      expect(output).toContain('**Continue**');
    });

    it('emits route path as code', () => {
      const output = transformAgentContent(`
        <OfferNext routes={[{ name: 'Test', path: '/gsd:execute' }]} />
      `);
      expect(output).toContain('`/gsd:execute`');
    });

    it('emits description when provided', () => {
      const output = transformAgentContent(`
        <OfferNext routes={[
          { name: 'Execute', description: 'Run the plan', path: '/execute' }
        ]} />
      `);
      expect(output).toContain('**Execute**: Run the plan');
    });
  });

  describe('multiple routes', () => {
    it('emits all routes as bullet list', () => {
      const output = transformAgentContent(`
        <OfferNext routes={[
          { name: 'Option A', path: '/a' },
          { name: 'Option B', path: '/b' },
          { name: 'Option C', path: '/c' }
        ]} />
      `);
      expect(output).toContain('**Option A**');
      expect(output).toContain('**Option B**');
      expect(output).toContain('**Option C**');
      expect(output).toContain('`/a`');
      expect(output).toContain('`/b`');
      expect(output).toContain('`/c`');
    });
  });
});
