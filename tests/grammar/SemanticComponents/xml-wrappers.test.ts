/**
 * Grammar Tests: XML Wrapper Components
 *
 * Tests semantic XML wrapper components:
 * - DeviationRules
 * - CommitRules
 * - WaveExecution
 * - CheckpointHandling
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('XML Wrapper Components', () => {
  describe('<DeviationRules>', () => {
    it('compiles with children', () => {
      const content = `
        <DeviationRules>
          <p>Rule content</p>
        </DeviationRules>
      `;
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('emits deviation_rules XML block', () => {
      const output = transformAgentContent(`
        <DeviationRules>
          <p>Handle deviations carefully</p>
        </DeviationRules>
      `);
      expect(output).toContain('<deviation_rules>');
      expect(output).toContain('Handle deviations carefully');
      expect(output).toContain('</deviation_rules>');
    });
  });

  describe('<CommitRules>', () => {
    it('compiles with children', () => {
      const content = `
        <CommitRules>
          <p>Commit guidelines</p>
        </CommitRules>
      `;
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('emits commit_rules XML block', () => {
      const output = transformAgentContent(`
        <CommitRules>
          <p>Use atomic commits</p>
        </CommitRules>
      `);
      expect(output).toContain('<commit_rules>');
      expect(output).toContain('Use atomic commits');
      expect(output).toContain('</commit_rules>');
    });
  });

  describe('<WaveExecution>', () => {
    it('compiles with children', () => {
      const content = `
        <WaveExecution>
          <p>Wave process</p>
        </WaveExecution>
      `;
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('emits wave_execution XML block', () => {
      const output = transformAgentContent(`
        <WaveExecution>
          <p>Execute in waves</p>
        </WaveExecution>
      `);
      expect(output).toContain('<wave_execution>');
      expect(output).toContain('Execute in waves');
      expect(output).toContain('</wave_execution>');
    });
  });

  describe('<CheckpointHandling>', () => {
    it('compiles with children', () => {
      const content = `
        <CheckpointHandling>
          <p>Checkpoint process</p>
        </CheckpointHandling>
      `;
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('emits checkpoint_handling XML block', () => {
      const output = transformAgentContent(`
        <CheckpointHandling>
          <p>Save progress regularly</p>
        </CheckpointHandling>
      `);
      expect(output).toContain('<checkpoint_handling>');
      expect(output).toContain('Save progress regularly');
      expect(output).toContain('</checkpoint_handling>');
    });
  });

  describe('nesting', () => {
    it('allows nesting multiple wrappers', () => {
      const output = transformAgentContent(`
        <DeviationRules>
          <CommitRules>
            <p>Nested content</p>
          </CommitRules>
        </DeviationRules>
      `);
      expect(output).toContain('<deviation_rules>');
      expect(output).toContain('<commit_rules>');
      expect(output).toContain('Nested content');
      expect(output).toContain('</commit_rules>');
      expect(output).toContain('</deviation_rules>');
    });
  });
});
