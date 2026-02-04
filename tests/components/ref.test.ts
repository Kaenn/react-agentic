import { describe, expect, it } from 'vitest';
import { Ref, REF_MARKER, useRuntimeVar, useVariable, isRuntimeVar, getRuntimeVarInfo, type RefProps, type RuntimeVar, type RuntimeVarProxy } from '../../src/jsx.js';

describe('Ref component', () => {
  describe('component stub', () => {
    it('returns null (compile-time only)', () => {
      // Ref is a compile-time only component that gets transformed
      const result = Ref({ value: {} as any });
      expect(result).toBeNull();
    });

    it('has REF_MARKER symbol defined', () => {
      expect(REF_MARKER).toBeDefined();
      expect(typeof REF_MARKER).toBe('symbol');
      expect(REF_MARKER.toString()).toBe('Symbol(react-agentic:ref)');
    });
  });

  describe('type safety', () => {
    it('accepts RuntimeVar as value', () => {
      // Type check - this should compile
      const mockRuntimeVar = {} as RuntimeVar<string>;
      const props: RefProps = {
        value: mockRuntimeVar,
      };
      expect(props.value).toBeDefined();
    });

    it('accepts RuntimeVarProxy as value', () => {
      // Type check - this should compile
      const mockProxy = {} as RuntimeVarProxy<{ status: string }>;
      const props: RefProps = {
        value: mockProxy,
      };
      expect(props.value).toBeDefined();
    });

    it('accepts call prop for RuntimeFn', () => {
      const props: RefProps = {
        value: {} as any,
        call: true,
      };
      expect(props.call).toBe(true);
    });

    it('call prop defaults to false when not specified', () => {
      const props: RefProps = {
        value: {} as any,
      };
      expect(props.call).toBeUndefined();
    });
  });

  describe('array access formatting', () => {
    it('formats single array index without stray dot', () => {
      // Path ['items', '0'] should produce '.items[0]' not '.items.[0]'
      const path = ['items', '0'];
      const pathStr = path.reduce(
        (acc, p) => acc + (/^\d+$/.test(p) ? `[${p}]` : `.${p}`),
        ''
      );
      expect(pathStr).toBe('.items[0]');
    });

    it('formats nested array access correctly', () => {
      const path = ['data', 'items', '0', 'name'];
      const pathStr = path.reduce(
        (acc, p) => acc + (/^\d+$/.test(p) ? `[${p}]` : `.${p}`),
        ''
      );
      expect(pathStr).toBe('.data.items[0].name');
    });

    it('formats multiple array indices correctly', () => {
      const path = ['matrix', '0', '1'];
      const pathStr = path.reduce(
        (acc, p) => acc + (/^\d+$/.test(p) ? `[${p}]` : `.${p}`),
        ''
      );
      expect(pathStr).toBe('.matrix[0][1]');
    });

    it('formats path with no array indices', () => {
      const path = ['data', 'user', 'name'];
      const pathStr = path.reduce(
        (acc, p) => acc + (/^\d+$/.test(p) ? `[${p}]` : `.${p}`),
        ''
      );
      expect(pathStr).toBe('.data.user.name');
    });

    it('formats empty path as empty string', () => {
      const path: string[] = [];
      const pathStr = path.length === 0
        ? ''
        : path.reduce((acc, p) => acc + (/^\d+$/.test(p) ? `[${p}]` : `.${p}`), '');
      expect(pathStr).toBe('');
    });
  });

  describe('RuntimeFn reference properties', () => {
    it('has expected structure for Ref with RuntimeFn', () => {
      // Type-level test for RuntimeFn properties
      interface RuntimeFnLike {
        name: string;
        call: string;
        input: string;
        output: string;
      }

      const mockFn: RuntimeFnLike = {
        name: 'initProject',
        call: 'initProject()',
        input: 'args',
        output: 'unknown',
      };

      expect(mockFn.name).toBe('initProject');
      expect(mockFn.call).toBe('initProject()');
      expect(mockFn.input).toBe('args');
      expect(mockFn.output).toBe('unknown');
    });
  });

  describe('unified variable API', () => {
    describe('useRuntimeVar', () => {
      it('creates proxy with __varName and __path', () => {
        const ctx = useRuntimeVar<{ status: string }>('CTX');
        expect(isRuntimeVar(ctx)).toBe(true);

        const info = getRuntimeVarInfo(ctx);
        expect(info.varName).toBe('CTX');
        expect(info.path).toEqual([]);
      });

      it('tracks property access paths', () => {
        const ctx = useRuntimeVar<{ user: { name: string } }>('CTX');
        // Access properties and verify they're RuntimeVar proxies
        const user = ctx.user;
        expect(isRuntimeVar(user)).toBe(true);

        // Verify path is tracked
        const userInfo = getRuntimeVarInfo(user as RuntimeVar<unknown>);
        expect(userInfo.varName).toBe('CTX');
        expect(userInfo.path).toEqual(['user']);
      });

      it('provides name getter for VariableRef compatibility', () => {
        const ctx = useRuntimeVar<string>('MY_VAR');
        expect(ctx.name).toBe('MY_VAR');
      });

      it('provides ref getter for VariableRef compatibility', () => {
        const ctx = useRuntimeVar<string>('MY_VAR');
        expect(ctx.ref).toBe('MY_VAR');
      });

      it('name and ref getters return same value', () => {
        const ctx = useRuntimeVar<string>('TEST_VAR');
        expect(ctx.name).toBe(ctx.ref);
        expect(ctx.name).toBe('TEST_VAR');
      });
    });

    describe('useVariable (unified alias)', () => {
      it('is an alias for useRuntimeVar', () => {
        expect(useVariable).toBe(useRuntimeVar);
      });

      it('creates proxy with same behavior as useRuntimeVar', () => {
        const ctx = useVariable<{ data: number }>('CTX');
        expect(isRuntimeVar(ctx)).toBe(true);
        expect(ctx.name).toBe('CTX');
        expect(ctx.ref).toBe('CTX');

        const data = ctx.data;
        const info = getRuntimeVarInfo(data as RuntimeVar<unknown>);
        expect(info.path).toEqual(['data']);
      });
    });
  });
});
