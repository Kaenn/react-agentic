/**
 * Grammar Tests: ReadState Component
 *
 * Tests ReadState for reading from state registry.
 * ReadState requires useStateRef() for state prop and useVariable() for into prop.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('<ReadState>', () => {
  describe('type safety', () => {
    it('compiles with state and into props', () => {
      const tsx = `
        const projectState = useStateRef("projectContext");
        const ctx = useVariable("CTX");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <ReadState state={projectState} into={ctx} />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(tsx, true)).not.toThrow();
    });

    it('accepts field prop', () => {
      const tsx = `
        const settings = useStateRef("settings");
        const theme = useVariable("THEME");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <ReadState state={settings} into={theme} field="user.theme" />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(tsx, true)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits skill invocation for full state read', () => {
      const tsx = `
        const projectState = useStateRef("projectContext");
        const ctx = useVariable("CTX");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <ReadState state={projectState} into={ctx} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      // Should emit a state read instruction
      expect(output).toContain('projectContext');
      expect(output).toContain('CTX');
    });

    it('emits skill invocation with field for specific read', () => {
      const tsx = `
        const settings = useStateRef("settings");
        const val = useVariable("VAL");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <ReadState state={settings} into={val} field="user.preferences.theme" />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('user.preferences.theme');
    });
  });
});
