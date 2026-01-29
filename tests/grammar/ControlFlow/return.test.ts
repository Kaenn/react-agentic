/**
 * Grammar Tests: Return Control Flow
 *
 * Tests Return component for early command exit.
 * V3 runtime component for Command documents.
 */

import { describe, it, expect } from 'vitest';
import { transformCommand } from '../_helpers/test-utils.js';

describe('Return Control Flow', () => {
  describe('<Return>', () => {
    describe('type safety', () => {
      it('compiles without props', () => {
        const tsx = `
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <Return />
              </Command>
            );
          }
        `;
        expect(() => transformCommand(tsx)).not.toThrow();
      });

      it('accepts status prop', () => {
        const tsx = `
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <Return status="SUCCESS" />
              </Command>
            );
          }
        `;
        expect(() => transformCommand(tsx)).not.toThrow();
      });

      it('accepts message prop', () => {
        const tsx = `
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <Return message="Task completed" />
              </Command>
            );
          }
        `;
        expect(() => transformCommand(tsx)).not.toThrow();
      });

      it('accepts all status values', () => {
        const statuses = ['SUCCESS', 'BLOCKED', 'NOT_FOUND', 'ERROR', 'CHECKPOINT'];
        statuses.forEach((status) => {
          const tsx = `
            export default function Doc() {
              return (
                <Command name="test" description="Test">
                  <Return status="${status}" />
                </Command>
              );
            }
          `;
          expect(() => transformCommand(tsx)).not.toThrow();
        });
      });
    });

    describe('output correctness', () => {
      it('emits End command', () => {
        const tsx = `
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <Return />
              </Command>
            );
          }
        `;
        const output = transformCommand(tsx);
        expect(output).toContain('**End command**');
      });

      it('emits status when provided', () => {
        const tsx = `
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <Return status="SUCCESS" />
              </Command>
            );
          }
        `;
        const output = transformCommand(tsx);
        expect(output).toContain('**End command (SUCCESS)**');
      });

      it('emits message when provided', () => {
        const tsx = `
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <Return status="ERROR" message="Something went wrong" />
              </Command>
            );
          }
        `;
        const output = transformCommand(tsx);
        expect(output).toContain('**End command (ERROR)**: Something went wrong');
      });
    });

    describe('conditional return', () => {
      it('works inside If block', () => {
        const tsx = `
          const ctx = useRuntimeVar<{ error?: string }>('CTX');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <If condition={ctx.error}>
                  <Return status="ERROR" message="Failed" />
                </If>
                <p>Continue here</p>
              </Command>
            );
          }
        `;
        const output = transformCommand(tsx);
        expect(output).toContain('**If');
        expect(output).toContain('**End command (ERROR)**: Failed');
        expect(output).toContain('Continue here');
      });
    });
  });
});
