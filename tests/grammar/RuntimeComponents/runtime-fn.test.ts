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
      expect(output).toContain('$CTX.status');
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

    it('emits function call in declarative format', () => {
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
      // Should emit declarative table format instead of bash
      expect(output).toContain('**Runtime Call**');
      expect(output).toContain('| Argument | Source |');
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

    it('emits RuntimeVar reference as variable path (not literal string)', () => {
      const tsx = `
        async function process(args: { phaseId: string }): Promise<{ done: boolean }> {
          return { done: true };
        }

        const Process = runtimeFn(process);
        const ctx = useRuntimeVar<{ phaseId: string }>('CTX');
        const result = useRuntimeVar<{ done: boolean }>('RESULT');

        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <Process.Call args={{ phaseId: ctx.phaseId }} output={result} />
            </Command>
          );
        }
      `;
      const output = transformCommand(tsx);
      // Should contain the variable path, not a literal string
      expect(output).toContain('CTX.phaseId');
      // Should NOT contain quoted literal string
      expect(output).not.toContain('"ctx.phaseId"');
    });

    it('emits nested property access correctly', () => {
      const tsx = `
        async function process(args: { path: string }): Promise<{ done: boolean }> {
          return { done: true };
        }

        const Process = runtimeFn(process);
        const ctx = useRuntimeVar<{ data: { nested: { value: string } } }>('CTX');
        const result = useRuntimeVar<{ done: boolean }>('RESULT');

        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <Process.Call args={{ path: ctx.data.nested.value }} output={result} />
            </Command>
          );
        }
      `;
      const output = transformCommand(tsx);
      // Should contain the full nested path
      expect(output).toContain('CTX.data.nested.value');
    });

    it('emits ternary expression as jq conditional', () => {
      const tsx = `
        async function process(args: { mode: string }): Promise<{ done: boolean }> {
          return { done: true };
        }

        const Process = runtimeFn(process);
        const ctx = useRuntimeVar<{ flags: { gaps: boolean } }>('CTX');
        const result = useRuntimeVar<{ done: boolean }>('RESULT');

        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <Process.Call args={{ mode: ctx.flags.gaps ? 'gap_closure' : 'standard' }} output={result} />
            </Command>
          );
        }
      `;
      const output = transformCommand(tsx);
      // Should contain a jq conditional expression
      expect(output).toContain('if $CTX.flags.gaps then');
      expect(output).toContain('gap_closure');
      expect(output).toContain('standard');
      // Bash command should use jq expression
      expect(output).toContain("jq -r 'if .flags.gaps then");
    });

    it('emits comparison expression as description', () => {
      const tsx = `
        async function process(args: { passed: boolean }): Promise<{ done: boolean }> {
          return { done: true };
        }

        const Process = runtimeFn(process);
        const status = useRuntimeVar<{ status: string }>('STATUS');
        const result = useRuntimeVar<{ done: boolean }>('RESULT');

        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <Process.Call args={{ passed: status.status === 'PASSED' }} output={result} />
            </Command>
          );
        }
      `;
      const output = transformCommand(tsx);
      // Should contain a human-readable description of the comparison
      expect(output).toContain('equals');
      expect(output).toContain('PASSED');
    });

    it('emits logical OR expression as description', () => {
      const tsx = `
        async function process(args: { skip: boolean }): Promise<{ done: boolean }> {
          return { done: true };
        }

        const Process = runtimeFn(process);
        const ctx = useRuntimeVar<{ flags: { skipResearch: boolean; gaps: boolean } }>('CTX');
        const result = useRuntimeVar<{ done: boolean }>('RESULT');

        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <Process.Call args={{ skip: ctx.flags.skipResearch || ctx.flags.gaps }} output={result} />
            </Command>
          );
        }
      `;
      const output = transformCommand(tsx);
      // Should contain a human-readable description of the OR
      expect(output).toContain('OR');
    });

    it('handles mixed literal and RuntimeVar args', () => {
      const tsx = `
        async function process(args: { name: string; count: number; active: boolean }): Promise<{ done: boolean }> {
          return { done: true };
        }

        const Process = runtimeFn(process);
        const ctx = useRuntimeVar<{ name: string }>('CTX');
        const result = useRuntimeVar<{ done: boolean }>('RESULT');

        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <Process.Call args={{ name: ctx.name, count: 42, active: true }} output={result} />
            </Command>
          );
        }
      `;
      const output = transformCommand(tsx);
      // Should contain both RuntimeVar reference and literals
      expect(output).toContain('CTX.name');
      expect(output).toContain('42');
      expect(output).toContain('true');
    });

    it('emits declarative table format', () => {
      const tsx = `
        async function doWork(args: { input: string }): Promise<{ output: string }> {
          return { output: args.input };
        }

        const Work = runtimeFn(doWork);
        const ctx = useRuntimeVar<{ input: string }>('CTX');
        const result = useRuntimeVar<{ output: string }>('RESULT');

        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <Work.Call args={{ input: ctx.input }} output={result} />
            </Command>
          );
        }
      `;
      const output = transformCommand(tsx);
      // Should emit declarative table format with bash execution
      expect(output).toContain('**Runtime Call**');
      expect(output).toContain('| Argument | Source |');
      expect(output).toContain('```bash');
      expect(output).toContain('node .claude/runtime/runtime.js');
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
