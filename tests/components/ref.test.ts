import { describe, expect, it } from 'vitest';
import { Ref, REF_MARKER, type RefProps, type RuntimeVar, type RuntimeVarProxy } from '../../src/jsx.js';

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
});
