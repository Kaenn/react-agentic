/**
 * Grammar Tests: If/Else Control Flow
 *
 * Tests If and Else conditional components.
 * V3 runtime components for Command documents.
 */

import { describe, it, expect } from 'vitest';
import { transformCommand, expectTransformError } from '../_helpers/test-utils.js';

describe('If/Else Control Flow', () => {
  describe('<If>', () => {
    describe('type safety', () => {
      it('compiles with condition prop', () => {
        const tsx = `
          const ctx = useRuntimeVar<{ error?: string }>('CTX');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <If condition={ctx.error}>
                  <p>Has error</p>
                </If>
              </Command>
            );
          }
        `;
        expect(() => transformCommand(tsx)).not.toThrow();
      });

      it('accepts boolean literal condition', () => {
        const tsx = `
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <If condition={true}>
                  <p>Always</p>
                </If>
              </Command>
            );
          }
        `;
        expect(() => transformCommand(tsx)).not.toThrow();
      });
    });

    describe('output correctness', () => {
      it('emits If condition header', () => {
        const tsx = `
          const ctx = useRuntimeVar<{ error?: string }>('CTX');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <If condition={ctx.error}>
                  <p>Handle error</p>
                </If>
              </Command>
            );
          }
        `;
        const output = transformCommand(tsx);
        expect(output).toContain('**If');
        expect(output).toContain('ctx.error');
      });

      it('emits block content', () => {
        const tsx = `
          const ctx = useRuntimeVar<{ done: boolean }>('CTX');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <If condition={ctx.done}>
                  <p>Task complete</p>
                  <p>All done</p>
                </If>
              </Command>
            );
          }
        `;
        const output = transformCommand(tsx);
        expect(output).toContain('Task complete');
        expect(output).toContain('All done');
      });
    });
  });

  describe('<Else>', () => {
    describe('type safety', () => {
      it('compiles when following If', () => {
        const tsx = `
          const ctx = useRuntimeVar<{ success: boolean }>('CTX');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <If condition={ctx.success}>
                  <p>Success path</p>
                </If>
                <Else>
                  <p>Failure path</p>
                </Else>
              </Command>
            );
          }
        `;
        expect(() => transformCommand(tsx)).not.toThrow();
      });
    });

    describe('output correctness', () => {
      it('emits Otherwise header', () => {
        const tsx = `
          const ctx = useRuntimeVar<{ ok: boolean }>('CTX');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <If condition={ctx.ok}>
                  <p>Good</p>
                </If>
                <Else>
                  <p>Not good</p>
                </Else>
              </Command>
            );
          }
        `;
        const output = transformCommand(tsx);
        expect(output).toContain('**Otherwise:**');
        expect(output).toContain('Not good');
      });
    });

    describe('constraint C1: Else must follow If', () => {
      it('throws when Else is standalone', () => {
        const tsx = `
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <Else>
                  <p>No If before</p>
                </Else>
              </Command>
            );
          }
        `;
        expectTransformError(tsx, /<Else> must follow <If>/);
      });
    });
  });

  describe('condition expressions', () => {
    it('handles property access', () => {
      const tsx = `
        const ctx = useRuntimeVar<{ user: { name: string } }>('CTX');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <If condition={ctx.user.name}>
                <p>Has name</p>
              </If>
            </Command>
          );
        }
      `;
      const output = transformCommand(tsx);
      expect(output).toContain('ctx.user.name');
    });
  });
});
