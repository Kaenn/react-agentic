/**
 * Grammar Tests: Loop/Break Control Flow
 *
 * Tests Loop and Break iteration components.
 * V3 runtime components for Command documents.
 */

import { describe, it, expect } from 'vitest';
import { transformCommand, expectTransformError } from '../_helpers/test-utils.js';

describe('Loop/Break Control Flow', () => {
  describe('<Loop>', () => {
    describe('type safety', () => {
      it('compiles with max prop', () => {
        const tsx = `
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <Loop max={5}>
                  <p>Iteration</p>
                </Loop>
              </Command>
            );
          }
        `;
        expect(() => transformCommand(tsx)).not.toThrow();
      });

      it('accepts counter prop (must be useRuntimeVar)', () => {
        const tsx = `
          const i = useRuntimeVar<number>('I');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <Loop max={3} counter={i}>
                  <p>Iteration</p>
                </Loop>
              </Command>
            );
          }
        `;
        expect(() => transformCommand(tsx)).not.toThrow();
      });
    });

    describe('output correctness', () => {
      it('emits Loop header with max', () => {
        const tsx = `
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <Loop max={5}>
                  <p>Do something</p>
                </Loop>
              </Command>
            );
          }
        `;
        const output = transformCommand(tsx);
        expect(output).toContain('**Loop up to 5 times');
      });

      it('emits counter when specified (useRuntimeVar)', () => {
        const tsx = `
          const i = useRuntimeVar<number>('I');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <Loop max={10} counter={i}>
                  <p>Iteration body</p>
                </Loop>
              </Command>
            );
          }
        `;
        const output = transformCommand(tsx);
        // Counter is emitted in parentheses: (counter: $VAR)
        expect(output).toContain('(counter: $I)');
      });

      it('emits loop body', () => {
        const tsx = `
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <Loop max={3}>
                  <p>Step 1</p>
                  <p>Step 2</p>
                </Loop>
              </Command>
            );
          }
        `;
        const output = transformCommand(tsx);
        expect(output).toContain('Step 1');
        expect(output).toContain('Step 2');
      });
    });
  });

  describe('<Break>', () => {
    describe('type safety', () => {
      it('compiles inside Loop', () => {
        const tsx = `
          const ctx = useRuntimeVar<{ done: boolean }>('CTX');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <Loop max={5}>
                  <If condition={ctx.done}>
                    <Break />
                  </If>
                </Loop>
              </Command>
            );
          }
        `;
        expect(() => transformCommand(tsx)).not.toThrow();
      });

      it('accepts message prop', () => {
        const tsx = `
          const ctx = useRuntimeVar<{ complete: boolean }>('CTX');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <Loop max={5}>
                  <If condition={ctx.complete}>
                    <Break message="Task completed" />
                  </If>
                </Loop>
              </Command>
            );
          }
        `;
        expect(() => transformCommand(tsx)).not.toThrow();
      });
    });

    describe('output correctness', () => {
      it('emits Break instruction', () => {
        const tsx = `
          const ctx = useRuntimeVar<{ stop: boolean }>('CTX');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <Loop max={5}>
                  <If condition={ctx.stop}>
                    <Break />
                  </If>
                </Loop>
              </Command>
            );
          }
        `;
        const output = transformCommand(tsx);
        expect(output).toContain('**Break loop**');
      });

      it('emits message when provided', () => {
        const tsx = `
          const ctx = useRuntimeVar<{ found: boolean }>('CTX');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <Loop max={10}>
                  <If condition={ctx.found}>
                    <Break message="Found the item" />
                  </If>
                </Loop>
              </Command>
            );
          }
        `;
        const output = transformCommand(tsx);
        expect(output).toContain('**Break loop:** Found the item');
      });
    });

    describe('constraint C2: Break only in Loop', () => {
      // Note: Break outside Loop is not currently validated at transform time.
      // This test documents current behavior - Break compiles but has no effect.
      it('compiles Break outside Loop (no validation)', () => {
        const tsx = `
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <Break />
              </Command>
            );
          }
        `;
        // Currently no validation - it compiles
        expect(() => transformCommand(tsx)).not.toThrow();
      });
    });
  });
});
