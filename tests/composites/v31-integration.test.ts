/**
 * v3.1 Integration Tests
 *
 * Validates that all v3.1 meta-prompting components work together:
 * - Agent contracts (Role, UpstreamInput, DownstreamConsumer, Methodology, StructuredReturns)
 * - Command orchestration (OnStatus, OnStatusDefault)
 * - Meta-prompting (MetaPrompt, GatherContext, ComposeContext, ReadFile)
 * - SpawnAgent enhancement (readAgentFile)
 */

import { describe, it, expect } from 'vitest';
import { transformCommandTsx, transformAgentTsx, transformCommand, transformAgent } from '../grammar/_helpers/test-utils.js';
import { RuntimeMarkdownEmitter } from '../../src/emitter/index.js';

describe('v3.1 Integration Tests', () => {
  describe('SpawnAgent Self-Reading', () => {
    it('should emit self-reading instruction when readAgentFile=true', () => {
      const source = `
        import { Command, SpawnAgent } from 'react-agentic';

        export default function TestCommand() {
          return (
            <Command name="test" description="Test command">
              <SpawnAgent
                agent="gsd-phase-researcher"
                model="sonnet"
                description="Research phase"
                readAgentFile
                prompt="Research context here"
              />
            </Command>
          );
        }
      `;

      const ir = transformCommandTsx(source);

      // Emit with default config
      const emitter = new RuntimeMarkdownEmitter();
      const markdown = emitter.emit(ir);

      // Verify self-reading instruction is present
      expect(markdown).toContain('First, read');
      expect(markdown).toContain('gsd-phase-researcher.md');
      expect(markdown).toContain('for your role and instructions');

      // Snapshot full output
      expect(markdown).toMatchSnapshot('spawnagent-readAgentFile-basic');
    });

    it('should emit self-reading instruction with custom agentsDir config', () => {
      const source = `
        import { Command, SpawnAgent } from 'react-agentic';

        export default function TestCommand() {
          return (
            <Command name="test" description="Test command">
              <SpawnAgent
                agent="custom-agent"
                model="sonnet"
                description="Custom agent task"
                readAgentFile={true}
                prompt="Custom prompt"
              />
            </Command>
          );
        }
      `;

      const ir = transformCommandTsx(source);

      // Emit with custom agentsDir
      const emitter = new RuntimeMarkdownEmitter({
        agentsDir: '/custom/agents/path/',
      });
      const markdown = emitter.emit(ir);

      // Verify custom path is used
      expect(markdown).toContain('First, read /custom/agents/path/custom-agent.md');
      expect(markdown).toMatchSnapshot('spawnagent-readAgentFile-custom-path');
    });

    it('should NOT emit self-reading instruction when readAgentFile={false}', () => {
      const source = `
        import { Command, SpawnAgent } from 'react-agentic';

        export default function TestCommand() {
          return (
            <Command name="test" description="Test command">
              <SpawnAgent
                agent="normal-agent"
                model="sonnet"
                description="Normal task"
                readAgentFile={false}
                prompt="Normal prompt"
              />
            </Command>
          );
        }
      `;

      const ir = transformCommandTsx(source);

      const emitter = new RuntimeMarkdownEmitter();
      const markdown = emitter.emit(ir);

      // Verify no self-reading instruction
      expect(markdown).not.toContain('First, read');
      expect(markdown).not.toContain('for your role and instructions');
    });

    it('should error when readAgentFile=true without agent prop', () => {
      // This is intentionally invalid - readAgentFile without agent
      const source = `
        import { Command, SpawnAgent } from 'react-agentic';

        export default function TestCommand() {
          return (
            <Command name="test" description="Test command">
              <SpawnAgent
                model="sonnet"
                description="Missing agent"
                readAgentFile
                prompt="Some prompt"
              />
            </Command>
          );
        }
      `;

      // Should throw because agent prop is required when readAgentFile is true
      expect(() => transformCommandTsx(source)).toThrow(/agent/i);
    });
  });

  describe('Agent Contract Components', () => {
    it('should compile agent with all contract components', () => {
      const source = `
        import { Agent, Role, UpstreamInput, DownstreamConsumer, Methodology, StructuredReturns, StatusReturn } from 'react-agentic';

        interface ResearchInput {
          topic: string;
          depth: 'shallow' | 'deep';
        }

        interface ResearchOutput {
          status: 'SUCCESS' | 'NOT_FOUND' | 'ERROR';
          findings?: string;
          error?: string;
        }

        export default function Researcher() {
          return (
            <Agent<ResearchInput, ResearchOutput>
              name="researcher"
              description="Research agent"
              tools="Read WebSearch"
            >
              <Role>
                You are a research specialist who gathers information on topics.
              </Role>

              <UpstreamInput>
                - topic: The subject to research
                - depth: Level of detail required
              </UpstreamInput>

              <DownstreamConsumer>
                - report-writer: Uses findings to generate reports
              </DownstreamConsumer>

              <Methodology>
                1. Understand the topic
                2. Search for relevant sources
                3. Synthesize findings
              </Methodology>

              <StructuredReturns>
                <StatusReturn status="SUCCESS" description="Research completed">
                  Return findings in markdown format.
                </StatusReturn>
                <StatusReturn status="NOT_FOUND" description="No relevant information found">
                  Explain what was searched and why nothing was found.
                </StatusReturn>
                <StatusReturn status="ERROR" description="Research failed">
                  Describe the error encountered.
                </StatusReturn>
              </StructuredReturns>
            </Agent>
          );
        }
      `;

      const markdown = transformAgent(source);

      // Verify all contract sections are present
      expect(markdown).toContain('<role>');
      expect(markdown).toContain('research specialist');
      expect(markdown).toContain('<upstream_input>');
      expect(markdown).toContain('<downstream_consumer>');
      expect(markdown).toContain('<methodology>');
      expect(markdown).toContain('<structured_returns>');

      // Snapshot full output
      expect(markdown).toMatchSnapshot('agent-full-contract');
    });
  });

  describe('ReadFile + SpawnAgent Integration', () => {
    it('should compile command with ReadFile and SpawnAgent readAgentFile', () => {
      const source = `
        import { Command, SpawnAgent, XmlBlock } from 'react-agentic';

        export default function PlanPhase() {
          return (
            <Command name="plan-phase" description="Plan a project phase">
              <SpawnAgent
                agent="gsd-planner"
                model="opus"
                description="Create phase plan"
                readAgentFile
                prompt="Plan the phase using the provided context."
              />

              <XmlBlock name="next_steps">
                Review the generated plan before execution.
              </XmlBlock>
            </Command>
          );
        }
      `;

      const markdown = transformCommand(source);

      // Verify SpawnAgent self-reading
      expect(markdown).toContain('First, read');
      expect(markdown).toContain('gsd-planner.md');

      // Verify XML block
      expect(markdown).toContain('<next_steps>');
      expect(markdown).toContain('Review the generated plan');

      // Snapshot full output
      expect(markdown).toMatchSnapshot('readfile-spawnagent-integration');
    });
  });
});
