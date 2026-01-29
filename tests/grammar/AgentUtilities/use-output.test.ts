/**
 * Grammar Tests: useOutput Utility
 *
 * Tests useOutput function for creating output references.
 * Used with OnStatus to handle agent return statuses.
 */

import { describe, it, expect } from 'vitest';
import { useOutput } from '../../../src/components/Agent.js';

describe('useOutput()', () => {
  describe('basic functionality', () => {
    it('creates output reference with agent name', () => {
      const output = useOutput('researcher');
      expect(output.agent).toBe('researcher');
    });

    it('returns object with agent property', () => {
      const output = useOutput('my-agent');
      expect(output).toHaveProperty('agent');
      expect(typeof output.agent).toBe('string');
    });

    it('returns object with field function', () => {
      const output = useOutput('test');
      expect(output).toHaveProperty('field');
      expect(typeof output.field).toBe('function');
    });
  });

  describe('field() method', () => {
    it('generates field placeholder for string field', () => {
      const output = useOutput('researcher');
      const placeholder = output.field('status');
      expect(placeholder).toBe('{researcher.status}');
    });

    it('generates field placeholder with agent name', () => {
      const output = useOutput('my-custom-agent');
      const placeholder = output.field('result');
      expect(placeholder).toBe('{my-custom-agent.result}');
    });

    it('handles various field names', () => {
      const output = useOutput('agent');

      expect(output.field('status')).toBe('{agent.status}');
      expect(output.field('blockedBy')).toBe('{agent.blockedBy}');
      expect(output.field('error')).toBe('{agent.error}');
      expect(output.field('data')).toBe('{agent.data}');
    });
  });

  describe('type safety', () => {
    interface TestOutput {
      status: string;
      confidence: 'HIGH' | 'MEDIUM' | 'LOW';
      findings: string[];
    }

    it('accepts generic type parameter', () => {
      const output = useOutput<TestOutput>('typed-agent');
      expect(output.agent).toBe('typed-agent');
    });

    it('field method works with typed output', () => {
      const output = useOutput<TestOutput>('typed-agent');
      // TypeScript would catch invalid fields at compile time
      expect(output.field('status')).toBe('{typed-agent.status}');
      expect(output.field('confidence')).toBe('{typed-agent.confidence}');
      expect(output.field('findings')).toBe('{typed-agent.findings}');
    });
  });

  describe('edge cases', () => {
    it('handles agent names with hyphens', () => {
      const output = useOutput('gsd-phase-researcher');
      expect(output.agent).toBe('gsd-phase-researcher');
      expect(output.field('status')).toBe('{gsd-phase-researcher.status}');
    });

    it('handles agent names with underscores', () => {
      const output = useOutput('my_custom_agent');
      expect(output.agent).toBe('my_custom_agent');
      expect(output.field('result')).toBe('{my_custom_agent.result}');
    });

    it('handles simple single-word agent names', () => {
      const output = useOutput('worker');
      expect(output.agent).toBe('worker');
      expect(output.field('data')).toBe('{worker.data}');
    });
  });
});
