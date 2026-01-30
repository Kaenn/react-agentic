/**
 * Grammar Tests: Step Component
 *
 * Tests Step component for numbered workflow steps.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('<Step>', () => {
  describe('type safety', () => {
    it('compiles with number and name props', () => {
      const content = `
        <Step number="1" name="Setup">
          <p>Setup instructions</p>
        </Step>
      `;
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('accepts variant prop', () => {
      const content = `
        <Step number="1" name="Setup" variant="bold">
          <p>Instructions</p>
        </Step>
      `;
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('accepts sub-step numbers', () => {
      const content = `
        <Step number="1.1" name="Sub-step">
          <p>Details</p>
        </Step>
      `;
      expect(() => transformAgentContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    describe('heading variant (default)', () => {
      it('emits ## Step N: Name format', () => {
        const output = transformAgentContent(`
          <Step number="1" name="Initialize">
            <p>Initialize the system</p>
          </Step>
        `);
        expect(output).toContain('## Step 1: Initialize');
        expect(output).toContain('Initialize the system');
      });
    });

    describe('bold variant', () => {
      it('emits **Step N: Name** format', () => {
        const output = transformAgentContent(`
          <Step number="2" name="Configure" variant="bold">
            <p>Configure settings</p>
          </Step>
        `);
        expect(output).toContain('**Step 2: Configure**');
        expect(output).toContain('Configure settings');
      });
    });

    describe('xml variant', () => {
      it('emits <step> XML format', () => {
        const output = transformAgentContent(`
          <Step number="3" name="Execute" variant="xml">
            <p>Run the task</p>
          </Step>
        `);
        expect(output).toContain('<step number="3" name="Execute">');
        expect(output).toContain('Run the task');
        expect(output).toContain('</step>');
      });
    });
  });

  describe('step content', () => {
    it('renders multiple children', () => {
      const output = transformAgentContent(`
        <Step number="1" name="Multi">
          <p>First paragraph</p>
          <p>Second paragraph</p>
          <ul>
            <li>Item</li>
          </ul>
        </Step>
      `);
      expect(output).toContain('First paragraph');
      expect(output).toContain('Second paragraph');
      expect(output).toContain('- Item');
    });

    it('renders code blocks', () => {
      const output = transformAgentContent(`
        <Step number="1" name="Code">
          <pre><code className="language-bash">npm install</code></pre>
        </Step>
      `);
      expect(output).toContain('## Step 1: Code');
      expect(output).toContain('```bash');
      expect(output).toContain('npm install');
    });
  });

  describe('sequential steps', () => {
    it('renders multiple steps in order', () => {
      const output = transformAgentContent(`
        <Step number="1" name="First">
          <p>Do first thing</p>
        </Step>
        <Step number="2" name="Second">
          <p>Do second thing</p>
        </Step>
        <Step number="3" name="Third">
          <p>Do third thing</p>
        </Step>
      `);
      expect(output).toContain('## Step 1: First');
      expect(output).toContain('## Step 2: Second');
      expect(output).toContain('## Step 3: Third');
    });
  });
});
