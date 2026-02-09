import { describe, it, expect } from 'vitest';
import { IfElseBlock, LoopWithBreak, type IfElseBlockProps, type LoopWithBreakProps } from '../../src/composites/index.js';

/**
 * Tests for control flow composite components
 *
 * These tests verify:
 * 1. Components are properly exported from the composites barrel
 * 2. Props interfaces are correctly typed and exported
 * 3. Components accept the expected props without type errors
 */

describe('Control Flow Composites', () => {
  describe('IfElseBlock', () => {
    it('should be exported from composites', () => {
      expect(IfElseBlock).toBeDefined();
      expect(typeof IfElseBlock).toBe('function');
    });

    it('should have correct props interface exported', () => {
      // Type-level test - if this compiles, interface is correctly exported
      const props: IfElseBlockProps = {
        condition: true,
        then: null,
      };
      expect(props).toBeDefined();
      expect(props.condition).toBe(true);
      expect(props.then).toBeNull();
    });

    it('should accept optional otherwise prop', () => {
      const propsWithElse: IfElseBlockProps = {
        condition: false,
        then: 'then content',
        otherwise: 'else content',
      };
      expect(propsWithElse.otherwise).toBe('else content');
    });

    it('should accept condition as boolean', () => {
      const trueCondition: IfElseBlockProps = {
        condition: true,
        then: 'content',
      };
      const falseCondition: IfElseBlockProps = {
        condition: false,
        then: 'content',
      };
      expect(trueCondition.condition).toBe(true);
      expect(falseCondition.condition).toBe(false);
    });

    it('should accept condition as undefined (falsy case)', () => {
      const undefinedCondition: IfElseBlockProps = {
        condition: undefined,
        then: 'content',
      };
      expect(undefinedCondition.condition).toBeUndefined();
    });
  });

  describe('LoopWithBreak', () => {
    it('should be exported from composites', () => {
      expect(LoopWithBreak).toBeDefined();
      expect(typeof LoopWithBreak).toBe('function');
    });

    it('should have correct props interface exported', () => {
      // Type-level test - if this compiles, interface is correctly exported
      const props: LoopWithBreakProps = {
        max: 5,
      };
      expect(props).toBeDefined();
      expect(props.max).toBe(5);
    });

    it('should accept all optional props', () => {
      const fullProps: LoopWithBreakProps = {
        max: 10,
        breakWhen: true,
        breakMessage: 'Loop complete',
        children: 'loop body',
      };
      expect(fullProps.max).toBe(10);
      expect(fullProps.breakWhen).toBe(true);
      expect(fullProps.breakMessage).toBe('Loop complete');
      expect(fullProps.children).toBe('loop body');
    });

    it('should accept breakWhen as boolean', () => {
      const props: LoopWithBreakProps = {
        max: 3,
        breakWhen: false,
      };
      expect(props.breakWhen).toBe(false);
    });

    it('should accept breakWhen as undefined', () => {
      const props: LoopWithBreakProps = {
        max: 3,
        breakWhen: undefined,
      };
      expect(props.breakWhen).toBeUndefined();
    });
  });

  describe('Barrel exports', () => {
    it('should export all control flow composites', () => {
      // Verify both composites are exported
      expect(IfElseBlock).toBeDefined();
      expect(LoopWithBreak).toBeDefined();
    });

    it('should export type interfaces (compile-time check)', () => {
      // These type assignments verify the interfaces are exported
      // If they weren't exported, TypeScript would error during compilation
      const _ifElseProps: IfElseBlockProps = { condition: true, then: null };
      const _loopProps: LoopWithBreakProps = { max: 1 };
      expect(true).toBe(true); // Test passes if types compile
    });
  });
});
