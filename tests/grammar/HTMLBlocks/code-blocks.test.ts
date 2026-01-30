/**
 * Grammar Tests: Code Blocks (<pre>/<code>)
 *
 * Tests code block transformation to markdown fenced code blocks.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent, transformCommandContent } from '../_helpers/test-utils.js';

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

describe('V3 Command Transformer - Code Blocks', () => {
  describe('<pre><code> pattern', () => {
    it('extracts content from nested <code> element', () => {
      const output = transformCommandContent('<pre><code>npx get-shit-done-cc@latest</code></pre>');
      expect(output).toContain('```\nnpx get-shit-done-cc@latest\n```');
    });

    it('extracts language from className="language-xxx"', () => {
      const output = transformCommandContent('<pre><code className="language-bash">npx get-shit-done-cc@latest</code></pre>');
      expect(output).toContain('```bash\nnpx get-shit-done-cc@latest\n```');
    });

    it('handles JSX expression className', () => {
      const output = transformCommandContent('<pre><code className={"language-javascript"}>let y = 2;</code></pre>');
      expect(output).toContain('```javascript\nlet y = 2;\n```');
    });

    it('handles template literals inside <code>', () => {
      const output = transformCommandContent('<pre><code>{`line1\nline2`}</code></pre>');
      expect(output).toContain('line1\nline2');
    });

    it('handles multiline code with proper indentation', () => {
      const output = transformCommandContent(`<pre><code>{\`.planning/
├── PROJECT.md
└── STATE.md\`}</code></pre>`);
      expect(output).toContain('.planning/');
      expect(output).toContain('├── PROJECT.md');
      expect(output).toContain('└── STATE.md');
    });

    it('handles pre without code child', () => {
      const output = transformCommandContent('<pre>plain text</pre>');
      expect(output).toContain('```\nplain text\n```');
    });

    it('handles pre with lang attribute (fallback if no code className)', () => {
      const output = transformCommandContent('<pre lang="python">print("hello")</pre>');
      expect(output).toContain('```python\nprint("hello")\n```');
    });

    it('code className takes precedence over pre lang', () => {
      const output = transformCommandContent('<pre lang="python"><code className="language-bash">echo hello</code></pre>');
      expect(output).toContain('```bash\necho hello\n```');
    });
  });

  describe('whitespace handling', () => {
    it('preserves indentation in code blocks', () => {
      const output = transformCommandContent(`<pre><code>line1
  indented
line3</code></pre>`);
      expect(output).toContain('  indented');
    });

    it('preserves blank lines', () => {
      const output = transformCommandContent(`<pre><code>line1

line3</code></pre>`);
      expect(output).toContain('line1\n\nline3');
    });
  });
});
