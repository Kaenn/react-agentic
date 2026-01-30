/**
 * Grammar Tests: WriteState Component
 *
 * Tests WriteState for writing to state registry.
 * WriteState requires useStateRef() for state prop.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('<WriteState>', () => {
  describe('type safety', () => {
    it('compiles with field mode', () => {
      const tsx = `
        const settings = useStateRef("settings");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <WriteState
                state={settings}
                field="user.theme"
                value="dark"
              />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(tsx, true)).not.toThrow();
    });

    it('compiles with merge mode', () => {
      const tsx = `
        const settings = useStateRef("settings");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <WriteState
                state={settings}
                merge={{ theme: "dark" }}
              />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(tsx, true)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits skill invocation for field write', () => {
      const tsx = `
        const settings = useStateRef("settings");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <WriteState
                state={settings}
                field="user.theme"
                value="dark"
              />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      // Should emit a state write instruction
      expect(output).toContain('settings');
      expect(output).toContain('user.theme');
    });

    it('emits skill invocation for merge write', () => {
      const tsx = `
        const config = useStateRef("config");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <WriteState
                state={config}
                merge={{ debug: true }}
              />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      // Should emit a state write instruction with merge
      expect(output).toContain('config');
    });

    it('handles variable references', () => {
      const tsx = `
        const state = useStateRef("state");
        const timestamp = useVariable("TIMESTAMP");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <Assign var={timestamp} bash="date +%s" />
              <WriteState
                state={state}
                field="lastUpdate"
                value={timestamp}
              />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('TIMESTAMP');
    });
  });
});
