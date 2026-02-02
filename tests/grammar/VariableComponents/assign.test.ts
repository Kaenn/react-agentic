/**
 * Grammar Tests: Assign Component
 *
 * Tests Assign component for variable assignments.
 * Assign uses the `var` prop with a VariableRef from useVariable()
 * and `from` prop with source helpers (bash, value, env, file).
 *
 * Updated in Phase 38, Plan 04 to use new from={source} syntax exclusively.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent, wrapInAgent, expectAgentTransformError } from '../_helpers/test-utils.js';

describe('<Assign>', () => {
  describe('type safety', () => {
    it('compiles with var and from={bash(...)}', () => {
      const tsx = `
        import { bash } from 'react-agentic';
        const TIMESTAMP = useVariable("TIMESTAMP");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={TIMESTAMP} from={bash(\`date -u +"%Y-%m-%dT%H:%M:%SZ"\`)} />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(tsx, true)).not.toThrow();
    });

    it('compiles with var and from={value(...)}', () => {
      const tsx = `
        import { value } from 'react-agentic';
        const OUTPUT = useVariable("OUTPUT");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={OUTPUT} from={value("/tmp/result.md")} />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(tsx, true)).not.toThrow();
    });

    it('compiles with var and from={env(...)}', () => {
      const tsx = `
        import { env } from 'react-agentic';
        const PHASE = useVariable("PHASE");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={PHASE} from={env("PHASE_NUMBER")} />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(tsx, true)).not.toThrow();
    });

    it('accepts comment prop', () => {
      const tsx = `
        import { bash } from 'react-agentic';
        const DIR = useVariable("DIR");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={DIR} from={bash("pwd")} comment="Get current directory" />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(tsx, true)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    describe('bash assignment', () => {
      it('emits VAR=$(command) format', () => {
        const tsx = `
          import { bash } from 'react-agentic';
          const TIMESTAMP = useVariable("TIMESTAMP");
          export default function Doc() {
            return (
              <Agent name="test" description="Test">
                <Assign var={TIMESTAMP} from={bash(\`date +%s\`)} />
              </Agent>
            );
          }
        `;
        const output = transformAgentContent(tsx, true);
        expect(output).toContain('```bash');
        expect(output).toContain('TIMESTAMP=$(date +%s)');
      });

      it('preserves variable references in bash', () => {
        const tsx = `
          import { bash } from 'react-agentic';
          const PHASE_DIR = useVariable("PHASE_DIR");
          export default function Doc() {
            return (
              <Agent name="test" description="Test">
                <Assign var={PHASE_DIR} from={bash(\`ls -d .planning/phases/\${PHASE}-*\`)} />
              </Agent>
            );
          }
        `;
        const output = transformAgentContent(tsx, true);
        // Template interpolation emits $VAR without braces
        expect(output).toContain('$PHASE');
      });
    });

    describe('value assignment', () => {
      it('emits VAR="value" format (quoted by default)', () => {
        const tsx = `
          import { value } from 'react-agentic';
          const OUTPUT = useVariable("OUTPUT");
          export default function Doc() {
            return (
              <Agent name="test" description="Test">
                <Assign var={OUTPUT} from={value("/tmp/out.md")} />
              </Agent>
            );
          }
        `;
        const output = transformAgentContent(tsx, true);
        expect(output).toContain('OUTPUT="/tmp/out.md"');
      });

      it('quotes values with spaces', () => {
        const tsx = `
          import { value } from 'react-agentic';
          const MSG = useVariable("MSG");
          export default function Doc() {
            return (
              <Agent name="test" description="Test">
                <Assign var={MSG} from={value("hello world")} />
              </Agent>
            );
          }
        `;
        const output = transformAgentContent(tsx, true);
        expect(output).toContain('MSG="hello world"');
      });
    });

    describe('env assignment', () => {
      it('emits VAR=$ENV format', () => {
        const tsx = `
          import { env } from 'react-agentic';
          const PHASE = useVariable("PHASE");
          export default function Doc() {
            return (
              <Agent name="test" description="Test">
                <Assign var={PHASE} from={env("PHASE_NUMBER")} />
              </Agent>
            );
          }
        `;
        const output = transformAgentContent(tsx, true);
        expect(output).toContain('PHASE=$PHASE_NUMBER');
      });
    });

    describe('comment', () => {
      it('emits comment before assignment', () => {
        const tsx = `
          import { bash } from 'react-agentic';
          const DIR = useVariable("DIR");
          export default function Doc() {
            return (
              <Agent name="test" description="Test">
                <Assign var={DIR} from={bash("pwd")} comment="Get working directory" />
              </Agent>
            );
          }
        `;
        const output = transformAgentContent(tsx, true);
        expect(output).toContain('# Get working directory');
        expect(output).toContain('DIR=$(pwd)');
      });
    });
  });

  describe('error cases', () => {
    it('throws when var prop is missing', () => {
      const tsx = wrapInAgent(`
        import { bash } from 'react-agentic';
        <Assign from={bash("echo hi")} />
      `);
      expectAgentTransformError(tsx, /requires var prop/);
    });

    it('throws when from prop is missing', () => {
      const tsx = `
        const TEST = useVariable("TEST");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={TEST} />
            </Agent>
          );
        }
      `;
      expectAgentTransformError(tsx, /requires from prop/);
    });

    it('throws when from prop contains invalid source', () => {
      const tsx = `
        const TEST = useVariable("TEST");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={TEST} from="invalid" />
            </Agent>
          );
        }
      `;
      expectAgentTransformError(tsx, /from must be a JSX expression/);
    });
  });
});
