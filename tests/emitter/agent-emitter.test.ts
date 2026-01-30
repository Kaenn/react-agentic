import { describe, it, expect } from 'vitest';
import { emitAgent } from '../../src/emitter/emitter.js';
import type { AgentDocumentNode, AgentFrontmatterNode } from '../../src/ir/index.js';

/**
 * Helper to create AgentDocumentNode for testing
 */
function createAgentDoc(
  frontmatter: Omit<AgentFrontmatterNode, 'kind'>,
  children: AgentDocumentNode['children'] = []
): AgentDocumentNode {
  return {
    kind: 'agentDocument',
    frontmatter: { kind: 'agentFrontmatter', ...frontmatter },
    children,
  };
}

describe('Agent emission', () => {
  it('emits Agent with required fields only', () => {
    const doc = createAgentDoc({
      name: 'minimal-agent',
      description: 'Minimal agent description',
    });

    const output = emitAgent(doc);

    expect(output).toContain('---');
    expect(output).toContain('name: minimal-agent');
    expect(output).toContain('description: Minimal agent description');
    expect(output).not.toContain('tools:');
    expect(output).not.toContain('color:');
  });

  it('emits Agent with all frontmatter fields', () => {
    const doc = createAgentDoc({
      name: 'full-agent',
      description: 'Full featured agent',
      tools: 'Read Grep Glob Write',
      color: 'cyan',
    });

    const output = emitAgent(doc);

    expect(output).toContain('name: full-agent');
    expect(output).toContain('description: Full featured agent');
    expect(output).toContain('tools: Read Grep Glob Write');
    expect(output).toContain('color: cyan');
  });

  it('emits tools as string (not array)', () => {
    const doc = createAgentDoc({
      name: 'tool-agent',
      description: 'Agent with tools',
      tools: 'Read Grep Glob',
    });

    const output = emitAgent(doc);

    // Should be: tools: Read Grep Glob
    // NOT: tools:\n  - Read\n  - Grep\n  - Glob
    expect(output).toContain('tools: Read Grep Glob');
    expect(output).not.toMatch(/tools:\s*\n\s+-/);
  });

  it('emits Agent with body content', () => {
    const doc = createAgentDoc(
      {
        name: 'content-agent',
        description: 'Agent with content',
      },
      [
        { kind: 'heading', level: 1, children: [{ kind: 'text', value: 'Role' }] },
        { kind: 'paragraph', children: [{ kind: 'text', value: 'You are a helpful agent.' }] },
      ]
    );

    const output = emitAgent(doc);

    expect(output).toContain('# Role');
    expect(output).toContain('You are a helpful agent.');
  });

  it('omits undefined optional fields', () => {
    const doc = createAgentDoc({
      name: 'minimal',
      description: 'Minimal agent',
    });

    const output = emitAgent(doc);

    // Should not have tools or color fields at all
    expect(output).not.toContain('tools:');
    expect(output).not.toContain('color:');
    // Verify it's valid YAML frontmatter
    expect(output).toMatch(/^---\n/);
    expect(output).toMatch(/\n---\n/);
  });

  it('emits Agent with empty body (frontmatter only)', () => {
    const doc = createAgentDoc({
      name: 'empty-body',
      description: 'Agent with no body content',
      tools: 'Read',
    });

    const output = emitAgent(doc);

    expect(output).toContain('name: empty-body');
    expect(output).toContain('description: Agent with no body content');
    expect(output).toContain('tools: Read');
    // Should end with frontmatter closing and newline
    expect(output).toMatch(/---\n$/);
  });

  it('emits Agent with multiple body blocks', () => {
    const doc = createAgentDoc(
      {
        name: 'multi-block',
        description: 'Agent with multiple blocks',
      },
      [
        { kind: 'heading', level: 1, children: [{ kind: 'text', value: 'Role' }] },
        { kind: 'paragraph', children: [{ kind: 'text', value: 'You are a research agent.' }] },
        { kind: 'heading', level: 2, children: [{ kind: 'text', value: 'Guidelines' }] },
        {
          kind: 'list',
          ordered: false,
          items: [
            { kind: 'listItem', children: [{ kind: 'paragraph', children: [{ kind: 'text', value: 'Be thorough' }] }] },
            { kind: 'listItem', children: [{ kind: 'paragraph', children: [{ kind: 'text', value: 'Be accurate' }] }] },
          ],
        },
      ]
    );

    const output = emitAgent(doc);

    expect(output).toContain('# Role');
    expect(output).toContain('You are a research agent.');
    expect(output).toContain('## Guidelines');
    expect(output).toContain('- Be thorough');
    expect(output).toContain('- Be accurate');
  });

  it('matches expected GSD format structure', () => {
    const doc = createAgentDoc({
      name: 'gsd-agent',
      description: 'GSD format verification',
      tools: 'Read Grep',
      color: 'blue',
    });

    const output = emitAgent(doc);

    // Verify full GSD format structure
    expect(output).toMatchInlineSnapshot(`
      "---
      name: gsd-agent
      description: GSD format verification
      tools: Read Grep
      color: blue
      ---
      "
    `);
  });
});
