/**
 * Grammar Tests: Source Helper Functions
 *
 * Tests source helper functions (file, bash, value, env) that return
 * typed source objects for use with <Assign from={...}> pattern.
 */

import { describe, it, expect } from 'vitest';
import { file, bash, value, env, isFileSource, isBashSource, isValueSource, isEnvSource, isAssignSource } from '../../../src/primitives/sources.js';

describe('Source Helper Functions', () => {
  describe('file()', () => {
    it('returns FileSource with correct __sourceType', () => {
      const source = file('.planning/STATE.md');
      expect(source.__sourceType).toBe('file');
      expect(source.path).toBe('.planning/STATE.md');
    });

    it('returns FileSource without optional flag by default', () => {
      const source = file('test.txt');
      expect(source.__sourceType).toBe('file');
      expect(source.path).toBe('test.txt');
      expect(source.optional).toBeUndefined();
    });

    it('sets optional flag when provided', () => {
      const source = file('config.json', { optional: true });
      expect(source.__sourceType).toBe('file');
      expect(source.path).toBe('config.json');
      expect(source.optional).toBe(true);
    });

    it('handles optional: false explicitly', () => {
      const source = file('required.txt', { optional: false });
      expect(source.__sourceType).toBe('file');
      expect(source.path).toBe('required.txt');
      expect(source.optional).toBe(false);
    });
  });

  describe('bash()', () => {
    it('returns BashSource with correct __sourceType', () => {
      const source = bash('date +%s');
      expect(source.__sourceType).toBe('bash');
      expect(source.command).toBe('date +%s');
    });

    it('handles complex bash commands', () => {
      const source = bash('ls -d .planning/phases/${PHASE}-* | head -1');
      expect(source.__sourceType).toBe('bash');
      expect(source.command).toBe('ls -d .planning/phases/${PHASE}-* | head -1');
    });

    it('handles multi-line bash commands', () => {
      const source = bash(`
        grep -A3 "Phase" ROADMAP.md |
        tail -1
      `);
      expect(source.__sourceType).toBe('bash');
      expect(source.command).toContain('grep');
      expect(source.command).toContain('tail');
    });
  });

  describe('value()', () => {
    it('returns ValueSource with correct __sourceType', () => {
      const source = value('/tmp/output.md');
      expect(source.__sourceType).toBe('value');
      expect(source.value).toBe('/tmp/output.md');
    });

    it('returns ValueSource without raw flag by default', () => {
      const source = value('hello');
      expect(source.__sourceType).toBe('value');
      expect(source.value).toBe('hello');
      expect(source.raw).toBeUndefined();
    });

    it('sets raw flag when provided', () => {
      const source = value('$HOME/projects', { raw: true });
      expect(source.__sourceType).toBe('value');
      expect(source.value).toBe('$HOME/projects');
      expect(source.raw).toBe(true);
    });

    it('handles raw: false explicitly', () => {
      const source = value('quoted', { raw: false });
      expect(source.__sourceType).toBe('value');
      expect(source.value).toBe('quoted');
      expect(source.raw).toBe(false);
    });
  });

  describe('env()', () => {
    it('returns EnvSource with correct __sourceType', () => {
      const source = env('PHASE_NUMBER');
      expect(source.__sourceType).toBe('env');
      expect(source.envVar).toBe('PHASE_NUMBER');
    });

    it('handles environment variable names', () => {
      const source = env('HOME');
      expect(source.__sourceType).toBe('env');
      expect(source.envVar).toBe('HOME');
    });
  });

  describe('Type Guards', () => {
    describe('isFileSource()', () => {
      it('returns true for FileSource', () => {
        const source = file('test.txt');
        expect(isFileSource(source)).toBe(true);
      });

      it('returns false for BashSource', () => {
        const source = bash('echo hi');
        expect(isFileSource(source)).toBe(false);
      });

      it('returns false for ValueSource', () => {
        const source = value('test');
        expect(isFileSource(source)).toBe(false);
      });

      it('returns false for EnvSource', () => {
        const source = env('HOME');
        expect(isFileSource(source)).toBe(false);
      });

      it('returns false for non-source objects', () => {
        expect(isFileSource({})).toBe(false);
        expect(isFileSource(null)).toBe(false);
        expect(isFileSource('string')).toBe(false);
        expect(isFileSource(undefined)).toBe(false);
      });
    });

    describe('isBashSource()', () => {
      it('returns true for BashSource', () => {
        const source = bash('pwd');
        expect(isBashSource(source)).toBe(true);
      });

      it('returns false for FileSource', () => {
        const source = file('test.txt');
        expect(isBashSource(source)).toBe(false);
      });

      it('returns false for ValueSource', () => {
        const source = value('test');
        expect(isBashSource(source)).toBe(false);
      });

      it('returns false for EnvSource', () => {
        const source = env('HOME');
        expect(isBashSource(source)).toBe(false);
      });

      it('returns false for non-source objects', () => {
        expect(isBashSource({})).toBe(false);
        expect(isBashSource(null)).toBe(false);
        expect(isBashSource(123)).toBe(false);
      });
    });

    describe('isValueSource()', () => {
      it('returns true for ValueSource', () => {
        const source = value('hello');
        expect(isValueSource(source)).toBe(true);
      });

      it('returns false for FileSource', () => {
        const source = file('test.txt');
        expect(isValueSource(source)).toBe(false);
      });

      it('returns false for BashSource', () => {
        const source = bash('echo hi');
        expect(isValueSource(source)).toBe(false);
      });

      it('returns false for EnvSource', () => {
        const source = env('HOME');
        expect(isValueSource(source)).toBe(false);
      });

      it('returns false for non-source objects', () => {
        expect(isValueSource([])).toBe(false);
        expect(isValueSource(null)).toBe(false);
        expect(isValueSource(true)).toBe(false);
      });
    });

    describe('isEnvSource()', () => {
      it('returns true for EnvSource', () => {
        const source = env('PATH');
        expect(isEnvSource(source)).toBe(true);
      });

      it('returns false for FileSource', () => {
        const source = file('test.txt');
        expect(isEnvSource(source)).toBe(false);
      });

      it('returns false for BashSource', () => {
        const source = bash('echo hi');
        expect(isEnvSource(source)).toBe(false);
      });

      it('returns false for ValueSource', () => {
        const source = value('test');
        expect(isEnvSource(source)).toBe(false);
      });

      it('returns false for non-source objects', () => {
        expect(isEnvSource({ __sourceType: 'unknown' })).toBe(false);
        expect(isEnvSource(null)).toBe(false);
        expect(isEnvSource(undefined)).toBe(false);
      });
    });

    describe('isAssignSource()', () => {
      it('returns true for FileSource', () => {
        const source = file('test.txt');
        expect(isAssignSource(source)).toBe(true);
      });

      it('returns true for BashSource', () => {
        const source = bash('pwd');
        expect(isAssignSource(source)).toBe(true);
      });

      it('returns true for ValueSource', () => {
        const source = value('hello');
        expect(isAssignSource(source)).toBe(true);
      });

      it('returns true for EnvSource', () => {
        const source = env('HOME');
        expect(isAssignSource(source)).toBe(true);
      });

      it('returns false for non-source objects', () => {
        expect(isAssignSource({})).toBe(false);
        expect(isAssignSource({ __sourceType: 'invalid' })).toBe(false);
        expect(isAssignSource(null)).toBe(false);
        expect(isAssignSource('string')).toBe(false);
        expect(isAssignSource(42)).toBe(false);
      });
    });
  });

  describe('Options Handling', () => {
    it('file() accepts no options (optional parameter)', () => {
      expect(() => file('test.txt')).not.toThrow();
    });

    it('value() accepts no options (optional parameter)', () => {
      expect(() => value('test')).not.toThrow();
    });

    it('bash() and env() have no options', () => {
      expect(() => bash('echo hi')).not.toThrow();
      expect(() => env('HOME')).not.toThrow();
    });

    it('file() ignores undefined options', () => {
      const source = file('test.txt', undefined);
      expect(source.optional).toBeUndefined();
    });

    it('value() ignores undefined options', () => {
      const source = value('test', undefined);
      expect(source.raw).toBeUndefined();
    });

    it('file() ignores empty options object', () => {
      const source = file('test.txt', {});
      expect(source.optional).toBeUndefined();
    });

    it('value() ignores empty options object', () => {
      const source = value('test', {});
      expect(source.raw).toBeUndefined();
    });
  });
});
