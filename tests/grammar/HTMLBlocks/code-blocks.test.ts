/**
 * Grammar Tests: Code Blocks (<pre>/<code>)
 *
 * Tests code block transformation to markdown fenced code blocks.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('Code Blocks (<pre>/<code>)', () => {
  describe('type safety', () => {
    it('compiles pre with code child', () => {
      const content = '<pre><code>const x = 1;</code></pre>';
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('compiles pre without code child', () => {
      const content = '<pre>plain preformatted</pre>';
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('accepts className for language', () => {
      const content = '<pre><code className="language-typescript">const x: number = 1;</code></pre>';
      expect(() => transformAgentContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits fenced code block', () => {
      const output = transformAgentContent('<pre><code>const x = 1;</code></pre>');
      expect(output).toContain('```\nconst x = 1;\n```');
    });

    it('emits with language specifier', () => {
      const output = transformAgentContent('<pre><code className="language-typescript">const x: number = 1;</code></pre>');
      expect(output).toContain('```typescript\nconst x: number = 1;\n```');
    });

    it('handles JSX expression className', () => {
      const output = transformAgentContent('<pre><code className={"language-javascript"}>let y = 2;</code></pre>');
      expect(output).toContain('```javascript\nlet y = 2;\n```');
    });

    it('handles pre without code child', () => {
      const output = transformAgentContent('<pre>plain text</pre>');
      expect(output).toContain('```\nplain text\n```');
    });
  });

  describe('whitespace handling', () => {
    it('preserves indentation', () => {
      const output = transformAgentContent(`<pre><code>line1
  indented
line3</code></pre>`);
      expect(output).toContain('  indented');
    });

    it('preserves blank lines', () => {
      const output = transformAgentContent(`<pre><code>line1

line3</code></pre>`);
      expect(output).toContain('line1\n\nline3');
    });
  });

  describe('common languages', () => {
    const languages = ['javascript', 'typescript', 'python', 'bash', 'json', 'yaml', 'html', 'css'];

    languages.forEach((lang) => {
      it(`handles language-${lang}`, () => {
        const output = transformAgentContent(`<pre><code className="language-${lang}">code</code></pre>`);
        expect(output).toContain(`\`\`\`${lang}`);
      });
    });
  });
});
