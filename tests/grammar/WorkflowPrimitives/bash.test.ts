/**
 * Grammar Tests: Bash Component
 *
 * Tests Bash component for bash code blocks.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('<Bash>', () => {
  describe('type safety', () => {
    it('compiles with text content', () => {
      const content = '<Bash>echo "hello"</Bash>';
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('compiles with template literal', () => {
      const content = '<Bash>{`npm install`}</Bash>';
      expect(() => transformAgentContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits bash code block', () => {
      const output = transformAgentContent('<Bash>echo "test"</Bash>');
      expect(output).toContain('```bash');
      expect(output).toContain('echo "test"');
      expect(output).toContain('```');
    });

    it('preserves multiline commands', () => {
      const output = transformAgentContent(`
        <Bash>
          git add .
          git commit -m "message"
          git push
        </Bash>
      `);
      expect(output).toContain('git add');
      expect(output).toContain('git commit');
      expect(output).toContain('git push');
    });

    it('preserves pipes and redirects', () => {
      const output = transformAgentContent('<Bash>cat file.txt | grep pattern > output.txt</Bash>');
      expect(output).toContain('cat file.txt | grep pattern > output.txt');
    });

    it('preserves variable syntax', () => {
      const output = transformAgentContent('<Bash>{`VAR=$(pwd)`}</Bash>');
      expect(output).toContain('VAR=$(pwd)');
    });
  });

  describe('special characters', () => {
    it('handles quotes', () => {
      const output = transformAgentContent(`<Bash>echo "quoted string"</Bash>`);
      expect(output).toContain('"quoted string"');
    });

    it('handles single quotes', () => {
      const output = transformAgentContent(`<Bash>{"echo 'single quotes'"}</Bash>`);
      expect(output).toContain("'single quotes'");
    });

    it('handles backslashes', () => {
      const output = transformAgentContent(`<Bash>{\`find . -name "*.txt" \\\\\n  | xargs grep pattern\`}</Bash>`);
      expect(output).toContain('\\');
    });
  });
});
