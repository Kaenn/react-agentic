/**
 * Grammar Tests: OnStatus Component
 *
 * Tests OnStatus for agent output status handling.
 * OnStatus requires useOutput() for the output prop.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('<OnStatus>', () => {
  describe('type safety', () => {
    it('compiles with output and status props', () => {
      const tsx = `
        const researcherOut = useOutput("researcher");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <OnStatus output={researcherOut} status="SUCCESS">
                <p>Research completed</p>
              </OnStatus>
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(tsx, true)).not.toThrow();
    });

    it('accepts all status values', () => {
      const statuses = ['SUCCESS', 'BLOCKED', 'NOT_FOUND', 'ERROR', 'CHECKPOINT'];
      for (const status of statuses) {
        const tsx = `
          const out = useOutput("agent-${status.toLowerCase()}");
          export default function Doc() {
            return (
              <Agent name="test" description="Test">
                <OnStatus output={out} status="${status}">
                  <p>Handled</p>
                </OnStatus>
              </Agent>
            );
          }
        `;
        expect(() => transformAgentContent(tsx, true)).not.toThrow();
      }
    });
  });

  describe('output correctness', () => {
    it('emits On STATUS header', () => {
      const tsx = `
        const out = useOutput("myagent");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <OnStatus output={out} status="SUCCESS">
                <p>Done</p>
              </OnStatus>
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('SUCCESS');
    });

    it('emits block content', () => {
      const tsx = `
        const out = useOutput("worker");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <OnStatus output={out} status="BLOCKED">
                <p>Worker is blocked</p>
                <p>Please resolve</p>
              </OnStatus>
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('Worker is blocked');
      expect(output).toContain('Please resolve');
    });

    it('handles different statuses', () => {
      const tsx = `
        const out = useOutput("processor");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <OnStatus output={out} status="ERROR">
                <p>Error occurred</p>
              </OnStatus>
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('ERROR');
      expect(output).toContain('Error occurred');
    });
  });
});
