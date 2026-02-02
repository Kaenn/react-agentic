/**
 * Grammar Tests: Assign from Prop
 *
 * Tests the unified <Assign from={source}> pattern with all source types.
 * Validates the complete pipeline (TSX -> IR -> Markdown) for the unified assignment pattern.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent, expectAgentTransformError } from '../_helpers/test-utils.js';

describe('<Assign from={...}>', () => {
  describe('file() source', () => {
    it('emits VAR=$(cat path) format', () => {
      const tsx = `
        import { useVariable, file } from 'react-agentic';
        const STATE = useVariable("STATE");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={STATE} from={file('.planning/STATE.md')} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('STATE=$(cat .planning/STATE.md)');
    });

    it('handles optional flag with 2>/dev/null', () => {
      const tsx = `
        import { useVariable, file } from 'react-agentic';
        const CONFIG = useVariable("CONFIG");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={CONFIG} from={file('.config.json', { optional: true })} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('CONFIG=$(cat .config.json 2>/dev/null)');
    });

    it('handles template strings with variable refs', () => {
      const tsx = `
        import { useVariable, file, bash } from 'react-agentic';
        const PHASE_DIR = useVariable("PHASE_DIR");
        const PLAN = useVariable("PLAN");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={PHASE_DIR} from={bash('ls -d .planning/phases/38-*')} />
              <Assign var={PLAN} from={file(\`\${PHASE_DIR}/38-PLAN.md\`)} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      // Template interpolation should convert ${PHASE_DIR} to $PHASE_DIR
      expect(output).toContain('PLAN=$(cat "$PHASE_DIR"/38-PLAN.md)');
    });

    it('quotes paths with spaces', () => {
      const tsx = `
        import { useVariable, file } from 'react-agentic';
        const DATA = useVariable("DATA");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={DATA} from={file('/path/with spaces/file.txt')} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('DATA=$(cat "/path/with spaces/file.txt")');
    });

    it('quotes paths with $ characters', () => {
      const tsx = `
        import { useVariable, file } from 'react-agentic';
        const DATA = useVariable("DATA");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={DATA} from={file('.planning/\$temp.md')} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('DATA=$(cat ".planning/$temp.md")');
    });
  });

  describe('bash() source', () => {
    it('emits VAR=$(command) format', () => {
      const tsx = `
        import { useVariable, bash } from 'react-agentic';
        const TIMESTAMP = useVariable("TIMESTAMP");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={TIMESTAMP} from={bash('date +%s')} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('TIMESTAMP=$(date +%s)');
    });

    it('handles template strings with variable refs', () => {
      const tsx = `
        import { useVariable, bash } from 'react-agentic';
        const DIR = useVariable("DIR");
        const FILES = useVariable("FILES");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={DIR} from={bash('pwd')} />
              <Assign var={FILES} from={bash(\`ls \${DIR}\`)} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('FILES=$(ls $DIR)');
    });

    it('preserves complex bash commands', () => {
      const tsx = `
        import { useVariable, bash } from 'react-agentic';
        const PHASE_DIR = useVariable("PHASE_DIR");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={PHASE_DIR} from={bash('ls -d .planning/phases/38-* | head -1')} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('PHASE_DIR=$(ls -d .planning/phases/38-* | head -1)');
    });

    it('handles variable references in commands', () => {
      const tsx = `
        import { useVariable, bash } from 'react-agentic';
        const PHASE_DIR = useVariable("PHASE_DIR");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={PHASE_DIR} from={bash('ls -d .planning/phases/\${PHASE}-*')} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('${PHASE}');
    });
  });

  describe('value() source', () => {
    it('emits VAR="value" format by default', () => {
      const tsx = `
        import { useVariable, value } from 'react-agentic';
        const OUTPUT = useVariable("OUTPUT");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={OUTPUT} from={value('/tmp/output.md')} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('OUTPUT="/tmp/output.md"');
    });

    it('emits VAR=value unquoted with raw option', () => {
      const tsx = `
        import { useVariable, value } from 'react-agentic';
        const COUNT = useVariable("COUNT");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={COUNT} from={value('42', { raw: true })} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('COUNT=42');
      expect(output).not.toContain('COUNT="42"');
    });

    it('quotes values with spaces by default', () => {
      const tsx = `
        import { useVariable, value } from 'react-agentic';
        const MSG = useVariable("MSG");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={MSG} from={value('hello world')} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('MSG="hello world"');
    });

    it('handles empty string values', () => {
      const tsx = `
        import { useVariable, value } from 'react-agentic';
        const EMPTY = useVariable("EMPTY");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={EMPTY} from={value('')} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('EMPTY=""');
    });
  });

  describe('env() source', () => {
    it('emits VAR=$ENV_VAR format', () => {
      const tsx = `
        import { useVariable, env } from 'react-agentic';
        const PHASE = useVariable("PHASE");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={PHASE} from={env('PHASE_NUMBER')} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('PHASE=$PHASE_NUMBER');
    });

    it('handles different env var names', () => {
      const tsx = `
        import { useVariable, env } from 'react-agentic';
        const HOME_DIR = useVariable("HOME_DIR");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={HOME_DIR} from={env('HOME')} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('HOME_DIR=$HOME');
    });
  });

  describe('in AssignGroup', () => {
    it('works with multiple from sources', () => {
      const tsx = `
        import { useVariable, file, bash, value, env } from 'react-agentic';
        const STATE = useVariable("STATE");
        const TIMESTAMP = useVariable("TIMESTAMP");
        const OUTPUT = useVariable("OUTPUT");
        const HOME_DIR = useVariable("HOME_DIR");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <AssignGroup>
                <Assign var={STATE} from={file('.planning/STATE.md')} />
                <Assign var={TIMESTAMP} from={bash('date +%s')} />
                <Assign var={OUTPUT} from={value('/tmp/out.md')} />
                <Assign var={HOME_DIR} from={env('HOME')} />
              </AssignGroup>
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('STATE=$(cat .planning/STATE.md)');
      expect(output).toContain('TIMESTAMP=$(date +%s)');
      expect(output).toContain('OUTPUT="/tmp/out.md"');
      expect(output).toContain('HOME_DIR=$HOME');
      // Should be in single bash block
      const fenceCount = (output.match(/```bash/g) || []).length;
      expect(fenceCount).toBe(1);
    });

    it('handles mixed from and legacy syntax', () => {
      const tsx = `
        import { useVariable, file } from 'react-agentic';
        const STATE = useVariable("STATE");
        const TIMESTAMP = useVariable("TIMESTAMP");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <AssignGroup>
                <Assign var={STATE} from={file('.planning/STATE.md')} />
                <Assign var={TIMESTAMP} bash="date +%s" />
              </AssignGroup>
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('STATE=$(cat .planning/STATE.md)');
      expect(output).toContain('TIMESTAMP=$(date +%s)');
    });
  });

  describe('template string interpolation', () => {
    it('converts ${varRef} to $VAR_NAME in file paths', () => {
      const tsx = `
        import { useVariable, file, bash } from 'react-agentic';
        const PHASE_DIR = useVariable("PHASE_DIR");
        const PLAN = useVariable("PLAN");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={PHASE_DIR} from={bash('ls -d .planning/phases/38-*')} />
              <Assign var={PLAN} from={file(\`\${PHASE_DIR}/38-PLAN.md\`)} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('PLAN=$(cat "$PHASE_DIR"/38-PLAN.md)');
    });

    it('converts ${varRef} to $VAR_NAME in bash commands', () => {
      const tsx = `
        import { useVariable, bash } from 'react-agentic';
        const DIR = useVariable("DIR");
        const FILES = useVariable("FILES");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={DIR} from={bash('pwd')} />
              <Assign var={FILES} from={bash(\`ls \${DIR}\`)} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('FILES=$(ls $DIR)');
    });

    it('handles multiple variable refs in single template', () => {
      const tsx = `
        import { useVariable, bash } from 'react-agentic';
        const BASE_DIR = useVariable("BASE_DIR");
        const PHASE = useVariable("PHASE");
        const PHASE_DIR = useVariable("PHASE_DIR");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={BASE_DIR} from={bash('pwd')} />
              <Assign var={PHASE} from={bash('echo 38')} />
              <Assign var={PHASE_DIR} from={bash(\`ls -d \${BASE_DIR}/phases/\${PHASE}-*\`)} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('PHASE_DIR=$(ls -d $BASE_DIR/phases/$PHASE-*)');
    });
  });

  describe('with comment prop', () => {
    it('emits comment before assignment', () => {
      const tsx = `
        import { useVariable, file } from 'react-agentic';
        const STATE = useVariable("STATE");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={STATE} from={file('.planning/STATE.md')} comment="Load project state" />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('# Load project state');
      expect(output).toContain('STATE=$(cat .planning/STATE.md)');
    });
  });

  describe('error cases', () => {
    it('throws when both from and bash props provided', () => {
      const tsx = `
        import { useVariable, bash } from 'react-agentic';
        const TEST = useVariable("TEST");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={TEST} from={bash('echo hi')} bash="echo bye" />
            </Agent>
          );
        }
      `;
      expectAgentTransformError(tsx, /from prop is mutually exclusive with bash, value, and env props/);
    });

    it('throws when both from and value props provided', () => {
      const tsx = `
        import { useVariable, value } from 'react-agentic';
        const TEST = useVariable("TEST");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={TEST} from={value('hello')} value="world" />
            </Agent>
          );
        }
      `;
      expectAgentTransformError(tsx, /from prop is mutually exclusive with bash, value, and env props/);
    });

    it('throws when both from and env props provided', () => {
      const tsx = `
        import { useVariable, env } from 'react-agentic';
        const TEST = useVariable("TEST");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={TEST} from={env('HOME')} env="USER" />
            </Agent>
          );
        }
      `;
      expectAgentTransformError(tsx, /from prop is mutually exclusive with bash, value, and env props/);
    });

    it('throws when var prop is missing', () => {
      const tsx = `
        import { file } from 'react-agentic';
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign from={file('test.md')} />
            </Agent>
          );
        }
      `;
      expectAgentTransformError(tsx, /requires var prop/);
    });
  });
});
