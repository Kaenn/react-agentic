/**
 * Grammar Tests: defineAgent Utility
 *
 * Tests defineAgent and related functions for creating type-safe agent references.
 * Used with SpawnAgent for type-safe agent spawning.
 */

import { describe, it, expect } from 'vitest';
import {
  defineAgent,
  isAgentRef,
  getAgentName,
  getAgentPath,
  type AgentRef,
} from '../../../src/components/Agent.js';

describe('defineAgent()', () => {
  describe('basic functionality', () => {
    it('creates agent reference with name', () => {
      const ref = defineAgent({ name: 'my-agent' });
      expect(ref.name).toBe('my-agent');
    });

    it('creates agent reference with name and path', () => {
      const ref = defineAgent({
        name: 'custom-agent',
        path: '~/.claude/agents/custom.md',
      });
      expect(ref.name).toBe('custom-agent');
      expect(ref.path).toBe('~/.claude/agents/custom.md');
    });

    it('marks reference with __isAgentRef', () => {
      const ref = defineAgent({ name: 'test' });
      expect(ref.__isAgentRef).toBe(true);
    });
  });

  describe('path handling', () => {
    it('supports absolute paths', () => {
      const ref = defineAgent({
        name: 'agent',
        path: '/Users/dev/.claude/agents/agent.md',
      });
      expect(ref.path).toBe('/Users/dev/.claude/agents/agent.md');
    });

    it('supports home-relative paths', () => {
      const ref = defineAgent({
        name: 'agent',
        path: '~/.claude/agents/agent.md',
      });
      expect(ref.path).toBe('~/.claude/agents/agent.md');
    });

    it('supports project-relative paths', () => {
      const ref = defineAgent({
        name: 'agent',
        path: '.claude/agents/agent.md',
      });
      expect(ref.path).toBe('.claude/agents/agent.md');
    });

    it('path is undefined when not provided', () => {
      const ref = defineAgent({ name: 'simple' });
      expect(ref.path).toBeUndefined();
    });
  });

  describe('type safety', () => {
    interface ResearcherInput {
      query: string;
      maxResults: number;
    }

    it('accepts generic type parameter', () => {
      const ref = defineAgent<ResearcherInput>({
        name: 'researcher',
      });
      expect(ref.name).toBe('researcher');
    });

    it('preserves type information (compile-time check)', () => {
      // This test verifies the function signature accepts the generic
      // Actual type checking happens at compile time
      const ref: AgentRef<ResearcherInput> = defineAgent<ResearcherInput>({
        name: 'typed-researcher',
        path: '~/.claude/agents/researcher.md',
      });
      expect(ref.name).toBe('typed-researcher');
    });
  });
});

describe('isAgentRef()', () => {
  describe('positive cases', () => {
    it('returns true for defineAgent result', () => {
      const ref = defineAgent({ name: 'test' });
      expect(isAgentRef(ref)).toBe(true);
    });

    it('returns true for reference with path', () => {
      const ref = defineAgent({
        name: 'agent',
        path: '~/.claude/agents/agent.md',
      });
      expect(isAgentRef(ref)).toBe(true);
    });
  });

  describe('negative cases', () => {
    it('returns false for null', () => {
      expect(isAgentRef(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isAgentRef(undefined)).toBe(false);
    });

    it('returns false for string', () => {
      expect(isAgentRef('my-agent')).toBe(false);
    });

    it('returns false for number', () => {
      expect(isAgentRef(123)).toBe(false);
    });

    it('returns false for plain object without marker', () => {
      expect(isAgentRef({ name: 'fake' })).toBe(false);
    });

    it('returns false for object with wrong marker value', () => {
      expect(isAgentRef({ name: 'fake', __isAgentRef: false })).toBe(false);
    });

    it('returns false for array', () => {
      expect(isAgentRef(['agent'])).toBe(false);
    });
  });
});

describe('getAgentName()', () => {
  describe('string input', () => {
    it('returns string as-is', () => {
      expect(getAgentName('my-agent')).toBe('my-agent');
    });

    it('handles hyphenated names', () => {
      expect(getAgentName('gsd-phase-researcher')).toBe('gsd-phase-researcher');
    });

    it('handles simple names', () => {
      expect(getAgentName('worker')).toBe('worker');
    });
  });

  describe('AgentRef input', () => {
    it('extracts name from AgentRef', () => {
      const ref = defineAgent({ name: 'typed-agent' });
      expect(getAgentName(ref)).toBe('typed-agent');
    });

    it('extracts name from AgentRef with path', () => {
      const ref = defineAgent({
        name: 'path-agent',
        path: '~/.claude/agents/path-agent.md',
      });
      expect(getAgentName(ref)).toBe('path-agent');
    });
  });
});

describe('getAgentPath()', () => {
  describe('string input', () => {
    it('returns undefined for string', () => {
      expect(getAgentPath('my-agent')).toBeUndefined();
    });
  });

  describe('AgentRef input', () => {
    it('returns path from AgentRef', () => {
      const ref = defineAgent({
        name: 'agent',
        path: '~/.claude/agents/agent.md',
      });
      expect(getAgentPath(ref)).toBe('~/.claude/agents/agent.md');
    });

    it('returns undefined when AgentRef has no path', () => {
      const ref = defineAgent({ name: 'no-path' });
      expect(getAgentPath(ref)).toBeUndefined();
    });
  });
});
