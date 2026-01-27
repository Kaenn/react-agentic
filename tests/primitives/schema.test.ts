import { describe, expect, it } from 'vitest';
import { defineVars, defineFiles, defineContext } from '../../src/index.js';

/**
 * Tests for schema-based declarations
 * - defineVars (Phase 2)
 * - defineFiles (Phase 3)
 * - defineContext (Phase 5)
 */

describe('Schema primitives', () => {
  describe('defineVars (Phase 2)', () => {
    it('creates VariableRefs from schema', () => {
      const vars = defineVars({
        PHASE: { type: 'string' },
        MODEL_PROFILE: { default: 'balanced' },
      });

      expect(vars.PHASE).toEqual({ name: 'PHASE', ref: 'PHASE' });
      expect(vars.MODEL_PROFILE).toEqual({ name: 'MODEL_PROFILE', ref: 'MODEL_PROFILE' });
    });

    it('handles empty schema', () => {
      const vars = defineVars({});
      expect(Object.keys(vars)).toEqual([]);
    });

    it('handles schema with type hints', () => {
      const vars = defineVars({
        COUNT: { type: 'number' },
        DEBUG: { type: 'boolean' },
        NAME: { type: 'string' },
      });

      expect(vars.COUNT.name).toBe('COUNT');
      expect(vars.DEBUG.name).toBe('DEBUG');
      expect(vars.NAME.name).toBe('NAME');
    });

    it('handles schema with defaults', () => {
      const vars = defineVars({
        PROFILE: { default: 'quality' },
        RETRIES: { default: 3 },
        VERBOSE: { default: true },
      });

      expect(vars.PROFILE).toEqual({ name: 'PROFILE', ref: 'PROFILE' });
      expect(vars.RETRIES).toEqual({ name: 'RETRIES', ref: 'RETRIES' });
      expect(vars.VERBOSE).toEqual({ name: 'VERBOSE', ref: 'VERBOSE' });
    });

    it('handles schema with empty definitions', () => {
      const vars = defineVars({
        SIMPLE: {},
        ANOTHER: undefined,
      });

      expect(vars.SIMPLE).toEqual({ name: 'SIMPLE', ref: 'SIMPLE' });
      expect(vars.ANOTHER).toEqual({ name: 'ANOTHER', ref: 'ANOTHER' });
    });
  });

  describe('defineFiles (Phase 3)', () => {
    it('creates FileRefs from schema', () => {
      const files = defineFiles({
        state: { path: '.planning/STATE.md', required: true },
        requirements: { path: '.planning/REQUIREMENTS.md', required: false },
      });

      expect(files.state).toEqual({
        varName: 'STATE_CONTENT',
        key: 'state',
        path: '.planning/STATE.md',
        required: true,
      });
      expect(files.requirements).toEqual({
        varName: 'REQUIREMENTS_CONTENT',
        key: 'requirements',
        path: '.planning/REQUIREMENTS.md',
        required: false,
      });
    });

    it('defaults required to true', () => {
      const files = defineFiles({
        config: { path: 'config.md' },
      });

      expect(files.config.required).toBe(true);
    });

    it('converts camelCase to UPPER_SNAKE_CASE', () => {
      const files = defineFiles({
        projectState: { path: 'state.md' },
        phaseRequirements: { path: 'req.md' },
      });

      expect(files.projectState.varName).toBe('PROJECT_STATE_CONTENT');
      expect(files.phaseRequirements.varName).toBe('PHASE_REQUIREMENTS_CONTENT');
    });

    it('provides _refs array', () => {
      const files = defineFiles({
        a: { path: 'a.md' },
        b: { path: 'b.md' },
      });

      expect(files._refs).toHaveLength(2);
      expect(files._refs[0].key).toBe('a');
      expect(files._refs[1].key).toBe('b');
    });

    it('handles empty schema', () => {
      const files = defineFiles({});
      expect(files._refs).toEqual([]);
    });
  });

  describe('defineContext (Phase 5)', () => {
    it('creates unified context with agents', () => {
      const ctx = defineContext({
        agents: {
          researcher: '~/.claude/agents/researcher.md',
          planner: { path: '~/.claude/agents/planner.md', model: 'sonnet' },
        },
      });

      expect(ctx.agents.researcher).toEqual({ path: '~/.claude/agents/researcher.md' });
      expect(ctx.agents.planner).toEqual({ path: '~/.claude/agents/planner.md', model: 'sonnet' });
    });

    it('creates unified context with vars', () => {
      const vars = defineVars({ PHASE: {} });
      const ctx = defineContext({ vars });

      expect(ctx.vars.PHASE).toEqual({ name: 'PHASE', ref: 'PHASE' });
    });

    it('creates unified context with files', () => {
      const files = defineFiles({ state: { path: 'state.md' } });
      const ctx = defineContext({ files });

      expect(ctx.files.state.path).toBe('state.md');
    });

    it('creates unified context with all parts', () => {
      const vars = defineVars({ PHASE: {} });
      const files = defineFiles({ state: { path: 'state.md' } });
      const ctx = defineContext({
        agents: { researcher: '~/.claude/agents/researcher.md' },
        vars,
        files,
      });

      expect(ctx.agents.researcher.path).toBe('~/.claude/agents/researcher.md');
      expect(ctx.vars.PHASE.name).toBe('PHASE');
      expect(ctx.files.state.path).toBe('state.md');
    });

    it('handles empty context', () => {
      const ctx = defineContext({});

      expect(ctx.agents).toEqual({});
      expect(ctx.vars).toEqual({});
      expect(ctx.files._refs).toEqual([]);
    });
  });
});
