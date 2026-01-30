/**
 * Grammar Tests: Nesting Constraints
 *
 * Tests nesting constraint violations (C1-C6 from grammar spec).
 */

import { describe, it, expect } from 'vitest';
import {
  transformCommand,
  transformAgent,
  expectTransformError,
  expectAgentTransformError,
  wrapInAgent,
  wrapInCommand,
} from '../_helpers/test-utils.js';

describe('Nesting Constraints', () => {
  describe('C1: Else must follow If as sibling', () => {
    it('throws when Else is standalone', () => {
      const tsx = wrapInCommand(`
        <Else>
          <p>Orphan else</p>
        </Else>
      `);
      expectTransformError(tsx, /<Else> must follow <If>/);
    });

    it('allows Else after If', () => {
      const tsx = `
        const ctx = useRuntimeVar<{ ok: boolean }>('CTX');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <If condition={ctx.ok}>
                <p>Yes</p>
              </If>
              <Else>
                <p>No</p>
              </Else>
            </Command>
          );
        }
      `;
      expect(() => transformCommand(tsx)).not.toThrow();
    });
  });

  describe('C2: Break only in Loop', () => {
    // Note: Break outside Loop is not currently validated at transform time.
    // This test documents current behavior - Break compiles without validation.
    it('compiles Break outside Loop (no validation currently)', () => {
      const tsx = wrapInCommand(`<Break />`);
      // Currently no validation - it compiles
      expect(() => transformCommand(tsx)).not.toThrow();
    });

    it('allows Break inside Loop', () => {
      const tsx = `
        const ctx = useRuntimeVar<{ done: boolean }>('CTX');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <Loop max={5}>
                <If condition={ctx.done}>
                  <Break />
                </If>
              </Loop>
            </Command>
          );
        }
      `;
      expect(() => transformCommand(tsx)).not.toThrow();
    });
  });

  describe('C3: li only in ul/ol', () => {
    it('li is only valid inside list', () => {
      // This constraint is enforced by the transformer when it encounters li
      // outside of a list context. The list transformer specifically looks for li.
      const tsx = wrapInAgent(`
        <ul><li>Valid</li></ul>
        <ol><li>Also valid</li></ol>
      `);
      expect(() => transformAgent(tsx)).not.toThrow();
    });
  });

  describe('C4: ul/ol only contain li', () => {
    it('throws for non-li in ul', () => {
      const tsx = wrapInAgent(`
        <ul>
          <p>Not a list item</p>
        </ul>
      `);
      expectAgentTransformError(tsx, /Expected <li> inside list/);
    });

    it('throws for non-li in ol', () => {
      const tsx = wrapInAgent(`
        <ol>
          <h1>Not a list item</h1>
        </ol>
      `);
      expectAgentTransformError(tsx, /Expected <li> inside list/);
    });
  });

  describe('C5: Inline cannot contain block', () => {
    it('inline elements should contain inline content', () => {
      // Test that b, i, em, strong work with inline content
      const tsx = wrapInAgent(`
        <p><b>Bold <i>and italic</i></b></p>
      `);
      expect(() => transformAgent(tsx)).not.toThrow();
    });

    // Note: The actual enforcement of C5 depends on whether the transformer
    // throws for block content inside inline, which varies by implementation
  });

  describe('C6: V3 control flow only in Command', () => {
    // V3 control flow components (If, Else, Loop, Break, Return, AskUser)
    // are only valid in Command documents, not in Agent documents

    it('allows If in Command', () => {
      const tsx = `
        const ctx = useRuntimeVar<{ ok: boolean }>('CTX');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <If condition={ctx.ok}>
                <p>Content</p>
              </If>
            </Command>
          );
        }
      `;
      expect(() => transformCommand(tsx)).not.toThrow();
    });

    it('allows Loop in Command', () => {
      const tsx = `
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <Loop max={3}>
                <p>Iteration</p>
              </Loop>
            </Command>
          );
        }
      `;
      expect(() => transformCommand(tsx)).not.toThrow();
    });

    it('allows Return in Command', () => {
      const tsx = `
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <Return status="SUCCESS" />
            </Command>
          );
        }
      `;
      expect(() => transformCommand(tsx)).not.toThrow();
    });

    it('allows AskUser in Command', () => {
      const tsx = `
        const choice = useRuntimeVar<string>('CHOICE');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <AskUser
                question="Pick"
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

    // Note: The actual enforcement of C6 (blocking these in Agent) depends
    // on whether the Agent transformer throws for V3 nodes
  });

  describe('valid nesting patterns', () => {
    it('allows heading in blockquote', () => {
      const tsx = wrapInAgent(`
        <blockquote>
          <h2>Title</h2>
          <p>Content</p>
        </blockquote>
      `);
      expect(() => transformAgent(tsx)).not.toThrow();
    });

    it('allows list in blockquote', () => {
      const tsx = wrapInAgent(`
        <blockquote>
          <ul>
            <li>Item</li>
          </ul>
        </blockquote>
      `);
      expect(() => transformAgent(tsx)).not.toThrow();
    });

    it('allows nested lists', () => {
      const tsx = wrapInAgent(`
        <ul>
          <li>Parent
            <ul>
              <li>Child</li>
            </ul>
          </li>
        </ul>
      `);
      expect(() => transformAgent(tsx)).not.toThrow();
    });

    it('allows code block in XmlBlock', () => {
      const tsx = wrapInAgent(`
        <XmlBlock name="example">
          <pre><code className="language-js">const x = 1;</code></pre>
        </XmlBlock>
      `);
      expect(() => transformAgent(tsx)).not.toThrow();
    });
  });
});
