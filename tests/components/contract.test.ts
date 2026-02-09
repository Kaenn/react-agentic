/**
 * Contract Component Tests
 *
 * Tests for agent contract components: Role, UpstreamInput, DownstreamConsumer,
 * Methodology, StructuredReturns, and StatusReturn.
 */

import { describe, it, expect } from 'vitest';
import { transformAgent, wrapInAgent } from '../grammar/_helpers/test-utils.js';

// ============================================================================
// Test Helper
// ============================================================================

function compile(content: string): string {
  const fullTsx = wrapInAgent(content);
  return transformAgent(fullTsx);
}

function expectCompileError(content: string, expectedMessage: string): void {
  const fullTsx = wrapInAgent(content);
  expect(() => transformAgent(fullTsx)).toThrow(new RegExp(expectedMessage));
}

// ============================================================================
// Individual Component Tests
// ============================================================================

describe('Role component', () => {
  it('renders as <role> XML block', () => {
    const tsx = `
        <Role>
          You are a test agent. You do testing.
        </Role>
    `;
    expect(compile(tsx)).toMatchSnapshot();
  });

  it('supports markdown content', () => {
    const tsx = `
        <Role>
          You are a **planner**. Your responsibilities:

          - Create plans
          - Track progress
          - Report status
        </Role>
    `;
    expect(compile(tsx)).toMatchSnapshot();
  });
});

describe('UpstreamInput component', () => {
  it('renders as <upstream_input> XML block', () => {
    const tsx = `
        <UpstreamInput>
          The orchestrator provides context via planning_context block.
        </UpstreamInput>
    `;
    expect(compile(tsx)).toMatchSnapshot();
  });
});

describe('DownstreamConsumer component', () => {
  it('renders as <downstream_consumer> XML block', () => {
    const tsx = `
        <DownstreamConsumer>
          Your output is consumed by the executor phase.
        </DownstreamConsumer>
    `;
    expect(compile(tsx)).toMatchSnapshot();
  });
});

describe('Methodology component', () => {
  it('renders as <methodology> XML block', () => {
    const tsx = `
        <Methodology>
          1. Read the input
          2. Process the data
          3. Return structured output
        </Methodology>
    `;
    expect(compile(tsx)).toMatchSnapshot();
  });
});

describe('StructuredReturns component', () => {
  it('renders with ## headings for each status', () => {
    const tsx = `
        <StructuredReturns>
          <StatusReturn status="SUCCESS">All tasks completed successfully</StatusReturn>
          <StatusReturn status="BLOCKED">Cannot proceed due to missing context</StatusReturn>
          <StatusReturn status="ERROR">An error occurred during execution</StatusReturn>
        </StructuredReturns>
    `;
    expect(compile(tsx)).toMatchSnapshot();
  });

  it('supports rich content in StatusReturn descriptions', () => {
    const tsx = `
        <StructuredReturns>
          <StatusReturn status="SUCCESS">
            All tests passed.

            **Includes:**
            - Unit tests
            - Integration tests
          </StatusReturn>
          <StatusReturn status="FAILED">Some tests failed. See report.</StatusReturn>
        </StructuredReturns>
    `;
    expect(compile(tsx)).toMatchSnapshot();
  });
});

// ============================================================================
// Full Agent with All Contract Components
// ============================================================================

describe('Full agent with contract components', () => {
  it('renders complete agent contract', () => {
    const tsx = `
        <Role>
          You are a GSD planner. You create executable phase plans
          with task breakdown and dependency analysis.
        </Role>

        <UpstreamInput>
          The orchestrator passes a planning_context block containing:

          - project_state: STATE.md content
          - roadmap: ROADMAP.md content
          - phase_context: Optional CONTEXT.md
        </UpstreamInput>

        <DownstreamConsumer>
          Your PLAN.md files are consumed by execute-phase which expects:

          - Frontmatter with wave, depends_on
          - Tasks with files, action, verify, done
          - Verification criteria
        </DownstreamConsumer>

        <Methodology>
          1. Read project state and roadmap
          2. Break phase into 2-3 task plans
          3. Build dependency graph
          4. Assign execution waves
          5. Write PLAN.md files
        </Methodology>

        <StructuredReturns>
          <StatusReturn status="PLANNING_COMPLETE">Plans created, ready for execution</StatusReturn>
          <StatusReturn status="CHECKPOINT_REACHED">Need user input to continue</StatusReturn>
          <StatusReturn status="PLANNING_BLOCKED">Cannot proceed without more context</StatusReturn>
        </StructuredReturns>
    `;
    expect(compile(tsx)).toMatchSnapshot();
  });

  it('allows interleaving with regular content', () => {
    const tsx = `
        <Role>You are a test agent.</Role>

        <XmlBlock name="objective">
          Create and execute tests.
        </XmlBlock>

        <Methodology>Follow TDD practices.</Methodology>

        Some additional notes about this agent.
    `;
    expect(compile(tsx)).toMatchSnapshot();
  });

  it('works with minimal contract (just Role)', () => {
    const tsx = `
        <Role>You handle simple tasks.</Role>
    `;
    expect(compile(tsx)).toMatchSnapshot();
  });

  it('works with no contract components (fully optional)', () => {
    const tsx = `
        <Markdown>Just regular content, no contract components.</Markdown>

        <XmlBlock name="process">
          Do the work.
        </XmlBlock>
    `;
    expect(compile(tsx)).toMatchSnapshot();
  });
});

// ============================================================================
// Validation Error Tests
// ============================================================================

describe('Contract validation errors', () => {
  it('errors on duplicate Role', () => {
    const tsx = `
        <Role>First role</Role>
        <Role>Second role</Role>
    `;
    expectCompileError(tsx, 'can only have one <Role>');
  });

  it('errors on duplicate StructuredReturns', () => {
    const tsx = `
        <StructuredReturns>
          <StatusReturn status="SUCCESS">OK</StatusReturn>
        </StructuredReturns>
        <StructuredReturns>
          <StatusReturn status="FAILED">Not OK</StatusReturn>
        </StructuredReturns>
    `;
    expectCompileError(tsx, 'can only have one <StructuredReturns>');
  });

  it('errors on wrong order (Methodology before Role)', () => {
    const tsx = `
        <Methodology>Do stuff</Methodology>
        <Role>I am a role</Role>
    `;
    expectCompileError(tsx, 'must appear in order');
  });

  it('errors on wrong order (StructuredReturns before UpstreamInput)', () => {
    const tsx = `
        <StructuredReturns>
          <StatusReturn status="SUCCESS">OK</StatusReturn>
        </StructuredReturns>
        <UpstreamInput>Input spec</UpstreamInput>
    `;
    expectCompileError(tsx, 'must appear in order');
  });

  it('errors on empty StructuredReturns', () => {
    const tsx = `
        <StructuredReturns></StructuredReturns>
    `;
    expectCompileError(tsx, 'must have at least one');
  });

  it('errors on StatusReturn without status', () => {
    const tsx = `
        <StructuredReturns>
          <StatusReturn>Missing status prop</StatusReturn>
        </StructuredReturns>
    `;
    expectCompileError(tsx, 'requires status prop');
  });

  it('errors on non-StatusReturn children in StructuredReturns', () => {
    const tsx = `
        <StructuredReturns>
          <StatusReturn status="SUCCESS">OK</StatusReturn>
          <Markdown>This should not be here</Markdown>
        </StructuredReturns>
    `;
    expectCompileError(tsx, 'can only contain');
  });

  it('errors on StatusReturn outside StructuredReturns', () => {
    const tsx = `
        <StatusReturn status="SUCCESS">Orphan return</StatusReturn>
    `;
    expectCompileError(tsx, 'can only be used inside StructuredReturns');
  });

  // TODO: Status type exhaustiveness validation not yet implemented
  // See: 34-03-SUMMARY.md - deferred to future enhancement
  // These tests are placeholders for when that feature is added:
  //
  // it('errors when Agent has status type but missing StructuredReturns', () => { ... });
  // it('errors on non-exhaustive StructuredReturns', () => { ... });
  // it('errors on undeclared statuses in StructuredReturns', () => { ... });
});
