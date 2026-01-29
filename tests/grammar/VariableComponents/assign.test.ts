/**
 * Grammar Tests: Assign Component
 *
 * Tests Assign component for variable assignments.
 * Assign uses the `var` prop with a VariableRef from useVariable().
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent, wrapInAgent, expectAgentTransformError } from '../_helpers/test-utils.js';

describe('<Assign>', () => {
  describe('type safety', () => {
    it('compiles with var and bash props', () => {
      const tsx = `
        const TIMESTAMP = useVariable("TIMESTAMP");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={TIMESTAMP} bash={\`date -u +"%Y-%m-%dT%H:%M:%SZ"\`} />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(tsx, true)).not.toThrow();
    });

    it('compiles with var and value props', () => {
      const tsx = `
        const OUTPUT = useVariable("OUTPUT");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={OUTPUT} value="/tmp/result.md" />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(tsx, true)).not.toThrow();
    });

    it('compiles with var and env props', () => {
      const tsx = `
        const PHASE = useVariable("PHASE");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={PHASE} env="PHASE_NUMBER" />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(tsx, true)).not.toThrow();
    });

    it('accepts comment prop', () => {
      const tsx = `
        const DIR = useVariable("DIR");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={DIR} bash="pwd" comment="Get current directory" />
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
          const TIMESTAMP = useVariable("TIMESTAMP");
          export default function Doc() {
            return (
              <Agent name="test" description="Test">
                <Assign var={TIMESTAMP} bash={\`date +%s\`} />
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
          const PHASE_DIR = useVariable("PHASE_DIR");
          export default function Doc() {
            return (
              <Agent name="test" description="Test">
                <Assign var={PHASE_DIR} bash={\`ls -d .planning/phases/\${PHASE}-*\`} />
              </Agent>
            );
          }
        `;
        const output = transformAgentContent(tsx, true);
        expect(output).toContain('${PHASE}');
      });
    });

    describe('value assignment', () => {
      it('emits VAR=value format', () => {
        const tsx = `
          const OUTPUT = useVariable("OUTPUT");
          export default function Doc() {
            return (
              <Agent name="test" description="Test">
                <Assign var={OUTPUT} value="/tmp/out.md" />
              </Agent>
            );
          }
        `;
        const output = transformAgentContent(tsx, true);
        expect(output).toContain('OUTPUT=/tmp/out.md');
      });

      it('quotes values with spaces', () => {
        const tsx = `
          const MSG = useVariable("MSG");
          export default function Doc() {
            return (
              <Agent name="test" description="Test">
                <Assign var={MSG} value="hello world" />
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
          const PHASE = useVariable("PHASE");
          export default function Doc() {
            return (
              <Agent name="test" description="Test">
                <Assign var={PHASE} env="PHASE_NUMBER" />
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
          const DIR = useVariable("DIR");
          export default function Doc() {
            return (
              <Agent name="test" description="Test">
                <Assign var={DIR} bash="pwd" comment="Get working directory" />
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
      const tsx = wrapInAgent(`<Assign bash="echo hi" />`);
      expectAgentTransformError(tsx, /requires var prop/);
    });

    it('throws when no assignment prop provided', () => {
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
      expectAgentTransformError(tsx, /requires one of: bash, value, or env/);
    });

    it('throws when multiple assignment props provided', () => {
      const tsx = `
        const TEST = useVariable("TEST");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={TEST} bash="echo hi" value="static" />
            </Agent>
          );
        }
      `;
      expectAgentTransformError(tsx, /accepts only one of: bash, value, or env/);
    });
  });
});
