/**
 * Grammar Tests: OnStatusDefault Component
 *
 * Tests OnStatusDefault for catch-all agent status handling.
 * OnStatusDefault can follow OnStatus blocks or provide explicit output prop.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('<OnStatusDefault>', () => {
  describe('sibling pairing', () => {
    it('accepts OnStatusDefault after OnStatus', () => {
      const tsx = `
        const out = useOutput("test-agent");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <OnStatus output={out} status="SUCCESS">
                <p>Success!</p>
              </OnStatus>
              <OnStatusDefault>
                <p>Other status</p>
              </OnStatusDefault>
            </Agent>
          );
        }
      `;
      const result = transformAgentContent(tsx, true);
      expect(result).toContain('**On SUCCESS:**');
      expect(result).toContain('**On any other status:**');
      expect(result).toContain('Other status');
    });

    it('accepts OnStatusDefault with explicit output prop', () => {
      const tsx = `
        const out = useOutput("test-agent");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <OnStatusDefault output={out}>
                <p>Default handling</p>
              </OnStatusDefault>
            </Agent>
          );
        }
      `;
      const result = transformAgentContent(tsx, true);
      expect(result).toContain('**On any other status:**');
      expect(result).toContain('Default handling');
    });

    it('rejects standalone OnStatusDefault without output prop', () => {
      const tsx = `
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <OnStatusDefault>
                <p>Default</p>
              </OnStatusDefault>
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(tsx, true)).toThrow(/<OnStatusDefault> must follow <OnStatus>/);
    });
  });

  describe('output correctness', () => {
    it('emits after multiple OnStatus blocks', () => {
      const tsx = `
        const out = useOutput("test-agent");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <OnStatus output={out} status="SUCCESS">
                <p>Success</p>
              </OnStatus>
              <OnStatus output={out} status="BLOCKED">
                <p>Blocked</p>
              </OnStatus>
              <OnStatus output={out} status="ERROR">
                <p>Error</p>
              </OnStatus>
              <OnStatusDefault>
                <p>Unexpected status</p>
              </OnStatusDefault>
            </Agent>
          );
        }
      `;
      const result = transformAgentContent(tsx, true);
      expect(result).toContain('**On SUCCESS:**');
      expect(result).toContain('**On BLOCKED:**');
      expect(result).toContain('**On ERROR:**');
      expect(result).toContain('**On any other status:**');
      expect(result).toContain('Unexpected status');
    });

    it('handles empty OnStatusDefault', () => {
      const tsx = `
        const out = useOutput("test-agent");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <OnStatus output={out} status="SUCCESS">
                <p>Success</p>
              </OnStatus>
              <OnStatusDefault />
            </Agent>
          );
        }
      `;
      const result = transformAgentContent(tsx, true);
      expect(result).toContain('**On SUCCESS:**');
      expect(result).toContain('**On any other status:**');
    });
  });
});
