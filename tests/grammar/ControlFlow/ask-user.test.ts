/**
 * Grammar Tests: AskUser Control Flow
 *
 * Tests AskUser component for interactive prompts.
 * V3 runtime component for Command documents.
 */

import { describe, it, expect } from 'vitest';
import { transformCommand } from '../_helpers/test-utils.js';

describe('AskUser Control Flow', () => {
  describe('<AskUser>', () => {
    describe('type safety', () => {
      it('compiles with required props', () => {
        const tsx = `
          const choice = useRuntimeVar<string>('CHOICE');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <AskUser
                  question="Which option?"
                  options={[
                    { label: 'Option A', value: 'a' },
                    { label: 'Option B', value: 'b' }
                  ]}
                  output={choice}
                />
              </Command>
            );
          }
        `;
        expect(() => transformCommand(tsx)).not.toThrow();
      });

      it('accepts header prop', () => {
        const tsx = `
          const choice = useRuntimeVar<string>('CHOICE');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <AskUser
                  question="Pick one"
                  header="Choice"
                  options={[
                    { label: 'A', value: 'a' },
                    { label: 'B', value: 'b' }
                  ]}
                  output={choice}
                />
              </Command>
            );
          }
        `;
        expect(() => transformCommand(tsx)).not.toThrow();
      });

      it('accepts multiSelect prop', () => {
        const tsx = `
          const choices = useRuntimeVar<string[]>('CHOICES');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <AskUser
                  question="Select features"
                  options={[
                    { label: 'Feature A', value: 'a' },
                    { label: 'Feature B', value: 'b' }
                  ]}
                  output={choices}
                  multiSelect
                />
              </Command>
            );
          }
        `;
        expect(() => transformCommand(tsx)).not.toThrow();
      });

      it('accepts option descriptions', () => {
        const tsx = `
          const choice = useRuntimeVar<string>('CHOICE');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <AskUser
                  question="Choose"
                  options={[
                    { label: 'A', value: 'a', description: 'First option' },
                    { label: 'B', value: 'b', description: 'Second option' }
                  ]}
                  output={choice}
                />
              </Command>
            );
          }
        `;
        expect(() => transformCommand(tsx)).not.toThrow();
      });
    });

    describe('output correctness', () => {
      it('emits AskUserQuestion tool reference', () => {
        const tsx = `
          const choice = useRuntimeVar<string>('CHOICE');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <AskUser
                  question="Which option?"
                  options={[
                    { label: 'A', value: 'a' },
                    { label: 'B', value: 'b' }
                  ]}
                  output={choice}
                />
              </Command>
            );
          }
        `;
        const output = transformCommand(tsx);
        expect(output).toContain('AskUserQuestion');
      });

      it('emits question', () => {
        const tsx = `
          const choice = useRuntimeVar<string>('CHOICE');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <AskUser
                  question="What do you want to do?"
                  options={[
                    { label: 'Start', value: 'start' },
                    { label: 'Stop', value: 'stop' }
                  ]}
                  output={choice}
                />
              </Command>
            );
          }
        `;
        const output = transformCommand(tsx);
        expect(output).toContain('What do you want to do?');
      });

      it('emits options', () => {
        const tsx = `
          const choice = useRuntimeVar<string>('CHOICE');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <AskUser
                  question="Choose"
                  options={[
                    { label: 'Alpha', value: 'alpha' },
                    { label: 'Beta', value: 'beta' }
                  ]}
                  output={choice}
                />
              </Command>
            );
          }
        `;
        const output = transformCommand(tsx);
        expect(output).toContain('Alpha');
        expect(output).toContain('Beta');
      });

      it('emits output variable reference', () => {
        const tsx = `
          const result = useRuntimeVar<string>('RESULT');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <AskUser
                  question="Choose"
                  options={[
                    { label: 'X', value: 'x' },
                    { label: 'Y', value: 'y' }
                  ]}
                  output={result}
                />
              </Command>
            );
          }
        `;
        const output = transformCommand(tsx);
        expect(output).toContain('$RESULT');
      });

      it('emits header when provided', () => {
        const tsx = `
          const choice = useRuntimeVar<string>('CHOICE');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <AskUser
                  question="Pick"
                  header="Selection"
                  options={[
                    { label: 'A', value: 'a' },
                    { label: 'B', value: 'b' }
                  ]}
                  output={choice}
                />
              </Command>
            );
          }
        `;
        const output = transformCommand(tsx);
        expect(output).toContain('Selection');
      });

      it('emits option descriptions when provided', () => {
        const tsx = `
          const choice = useRuntimeVar<string>('CHOICE');
          export default function Doc() {
            return (
              <Command name="test" description="Test">
                <AskUser
                  question="Choose"
                  options={[
                    { label: 'A', value: 'a', description: 'First choice' },
                    { label: 'B', value: 'b', description: 'Second choice' }
                  ]}
                  output={choice}
                />
              </Command>
            );
          }
        `;
        const output = transformCommand(tsx);
        expect(output).toContain('First choice');
      });
    });
  });
});
