/**
 * Grammar Tests: V3 Runtime Components
 *
 * Tests for V3 runtime features:
 * - useRuntimeVar() - Typed runtime variable creation
 * - runtimeFn() - Function extraction for runtime
 * - <Fn.Call> - Runtime function invocation
 */

import { describe, it, expect } from 'vitest';
import { transformCommand } from '../_helpers/test-utils.js';

describe('V3 Runtime Components', () => {
  describe('useRuntimeVar()', () => {
    it('creates typed runtime variable', () => {
      const tsx = `
        const ctx = useRuntimeVar<{ name: string }>('CTX');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <p>Using variable</p>
            </Command>
          );
        }
      `;
      expect(() => transformCommand(tsx)).not.toThrow();
    });

    it('allows property access on RuntimeVar', () => {
      const tsx = `
        const ctx = useRuntimeVar<{ user: { name: string } }>('CTX');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <If condition={ctx.user}>
                <p>Has user</p>
              </If>
            </Command>
          );
        }
      `;
      expect(() => transformCommand(tsx)).not.toThrow();
    });

    it('emits property access in condition', () => {
      const tsx = `
        const ctx = useRuntimeVar<{ status: string }>('CTX');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <If condition={ctx.status}>
                <p>Status exists</p>
              </If>
            </Command>
          );
        }
      `;
      const output = transformCommand(tsx);
      // RuntimeVar property access is shown in the If condition
      expect(output).toContain('ctx.status');
    });
  });

  describe('runtimeFn() / <Fn.Call>', () => {
    it('compiles with runtimeFn and Call', () => {
      const tsx = `
        async function initProject(args: { path: string }): Promise<{ success: boolean }> {
          return { success: true };
        }

        const Init = runtimeFn(initProject);
        const result = useRuntimeVar<{ success: boolean }>('RESULT');

        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <Init.Call args={{ path: "." }} output={result} />
            </Command>
          );
        }
      `;
      expect(() => transformCommand(tsx)).not.toThrow();
    });

    it('emits function call syntax', () => {
      const tsx = `
        async function doWork(args: { input: string }): Promise<{ output: string }> {
          return { output: args.input };
        }

        const Work = runtimeFn(doWork);
        const result = useRuntimeVar<{ output: string }>('RESULT');

        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <Work.Call args={{ input: "test" }} output={result} />
            </Command>
          );
        }
      `;
      const output = transformCommand(tsx);
      // Should emit bash code block with function invocation
      expect(output).toContain('```bash');
    });

    it('supports RuntimeVar in args', () => {
      const tsx = `
        async function process(args: { value: string }): Promise<{ done: boolean }> {
          return { done: true };
        }

        const Process = runtimeFn(process);
        const input = useRuntimeVar<string>('INPUT');
        const result = useRuntimeVar<{ done: boolean }>('RESULT');

        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <Process.Call args={{ value: input }} output={result} />
            </Command>
          );
        }
      `;
      expect(() => transformCommand(tsx)).not.toThrow();
    });
  });

  describe('combined usage', () => {
    it('works with control flow components', () => {
      const tsx = `
        async function checkStatus(args: {}): Promise<{ ready: boolean }> {
          return { ready: true };
        }

        const Check = runtimeFn(checkStatus);
        const status = useRuntimeVar<{ ready: boolean }>('STATUS');

        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <Check.Call args={{}} output={status} />
              <If condition={status.ready}>
                <p>System is ready</p>
              </If>
              <Else>
                <p>System not ready</p>
              </Else>
            </Command>
          );
        }
      `;
      expect(() => transformCommand(tsx)).not.toThrow();
    });

    it('works in Loop', () => {
      const tsx = `
        async function iterate(args: { n: number }): Promise<{ done: boolean }> {
          return { done: args.n > 3 };
        }

        const Iterate = runtimeFn(iterate);
        const i = useRuntimeVar<number>('I');
        const result = useRuntimeVar<{ done: boolean }>('RESULT');

        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <Loop max={5} counter={i}>
                <Iterate.Call args={{ n: i }} output={result} />
                <If condition={result.done}>
                  <Break message="Iteration complete" />
                </If>
              </Loop>
            </Command>
          );
        }
      `;
      expect(() => transformCommand(tsx)).not.toThrow();
    });
  });
});
