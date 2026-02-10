/**
 * Grammar Tests: Workflow Component
 *
 * Tests the Workflow component that orchestrates Team, TaskPipeline,
 * and ShutdownSequence with team context propagation.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent, expectAgentTransformError, transformCommandContent } from '../_helpers/test-utils.js';
import {
  createProject,
  parseSource,
  findRootJsxElement,
} from '../../../src/index.js';
import { transformDocument } from '../../../src/parser/transformers/document.js';
import { emitAgent } from '../../../src/emitter/index.js';

let externalTestCounter = 0;

/**
 * Build an Agent document with external files in the same project.
 * Enables cross-file import resolution testing (e.g., defineWorker with imported Agent).
 */
function buildAgentWithExternals(
  mainTsx: string,
  externalFiles: Record<string, string>
): string {
  const project = createProject();

  // Add external files first so imports resolve
  for (const [filename, content] of Object.entries(externalFiles)) {
    project.createSourceFile(filename, content);
  }

  // Add main file
  const mainFilename = `test-agent-ext-${externalTestCounter++}.tsx`;
  const source = project.createSourceFile(mainFilename, mainTsx);

  const root = findRootJsxElement(source);
  if (!root) throw new Error('No JSX found');

  const doc = transformDocument(root, source);
  return emitAgent(doc as any);
}

describe('<Workflow>', () => {
  describe('type safety', () => {
    it('compiles with name and team props', () => {
      const content = `
        import { defineTeam, defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const ReviewTeam = defineTeam('review');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Feature X" team={ReviewTeam}>
                <Team team={ReviewTeam}>
                  <Teammate worker={Security} description="Review" prompt="Review code..." />
                </Team>
              </Workflow>
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(content, true)).not.toThrow();
    });

    it('compiles with optional description prop', () => {
      const content = `
        import { defineTeam, defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const ReviewTeam = defineTeam('review');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Feature X" team={ReviewTeam} description="Build feature with review">
                <Team team={ReviewTeam}>
                  <Teammate worker={Security} description="Review" prompt="Review code..." />
                </Team>
              </Workflow>
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(content, true)).not.toThrow();
    });

    it('compiles with Team, TaskPipeline, and ShutdownSequence children', () => {
      const content = `
        import { defineTeam, defineWorker, defineTask, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const ReviewTeam = defineTeam('review');
        const Research = defineTask('Research');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Feature X" team={ReviewTeam} description="Build feature">
                <Team team={ReviewTeam}>
                  <Teammate worker={Security} description="Review" prompt="Review code..." />
                </Team>
                <TaskPipeline title="Tasks">
                  <TaskDef task={Research} prompt="Research phase" />
                </TaskPipeline>
                <ShutdownSequence workers={[Security]} />
              </Workflow>
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(content, true)).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('throws error when name prop missing', () => {
      const content = `
        import { defineTeam, defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const ReviewTeam = defineTeam('review');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow team={ReviewTeam}>
                <Team team={ReviewTeam}>
                  <Teammate worker={Security} description="Review" prompt="Review..." />
                </Team>
              </Workflow>
            </Agent>
          );
        }
      `;
      expectAgentTransformError(content, /Workflow requires a name prop/);
    });

    it('throws error when team prop missing', () => {
      const content = `
        import { defineTeam, defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const ReviewTeam = defineTeam('review');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Feature X">
                <Team team={ReviewTeam}>
                  <Teammate worker={Security} description="Review" prompt="Review..." />
                </Team>
              </Workflow>
            </Agent>
          );
        }
      `;
      expectAgentTransformError(content, /Workflow requires a team prop/);
    });

    it('throws error when multiple Team children present', () => {
      const content = `
        import { defineTeam, defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const Perf = defineWorker('perf', PluginAgentType.PerformanceOracle);
        const ReviewTeam = defineTeam('review');
        const OtherTeam = defineTeam('other');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Feature X" team={ReviewTeam}>
                <Team team={ReviewTeam}>
                  <Teammate worker={Security} description="Review" prompt="Review..." />
                </Team>
                <Team team={OtherTeam}>
                  <Teammate worker={Perf} description="Perf" prompt="Perf..." />
                </Team>
              </Workflow>
            </Agent>
          );
        }
      `;
      expectAgentTransformError(content, /Workflow can only contain one Team child/);
    });

    it('throws error when team prop does not match Team child', () => {
      const content = `
        import { defineTeam, defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const ReviewTeam = defineTeam('review');
        const OtherTeam = defineTeam('other');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Feature X" team={ReviewTeam}>
                <Team team={OtherTeam}>
                  <Teammate worker={Security} description="Review" prompt="Review..." />
                </Team>
              </Workflow>
            </Agent>
          );
        }
      `;
      expectAgentTransformError(content, /Workflow team prop.*must match Team child/);
    });

    it('throws error when teams have same name but different refs (id-based validation)', () => {
      // Two separate defineTeam calls with same name create different refs (different __id)
      // This tests that validation uses teamId, not teamName
      const content = `
        import { defineTeam, defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const ReviewTeamA = defineTeam('review');
        const ReviewTeamB = defineTeam('review');  // Same name, different ref!

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Feature X" team={ReviewTeamA}>
                <Team team={ReviewTeamB}>
                  <Teammate worker={Security} description="Review" prompt="Review..." />
                </Team>
              </Workflow>
            </Agent>
          );
        }
      `;
      // Should fail because ReviewTeamA and ReviewTeamB have different __id values
      expectAgentTransformError(content, /Workflow team prop.*must match Team child/);
    });
  });

  describe('output correctness', () => {
    it('emits workflow heading (h2)', () => {
      const output = transformAgentContent(`
        import { defineTeam, defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const ReviewTeam = defineTeam('review');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Feature X" team={ReviewTeam}>
                <Team team={ReviewTeam}>
                  <Teammate worker={Security} description="Review" prompt="Review..." />
                </Team>
              </Workflow>
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('## Workflow: Feature X');
    });

    it('emits description as blockquote', () => {
      const output = transformAgentContent(`
        import { defineTeam, defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const ReviewTeam = defineTeam('review');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Feature X" team={ReviewTeam} description="Build feature with review">
                <Team team={ReviewTeam}>
                  <Teammate worker={Security} description="Review" prompt="Review..." />
                </Team>
              </Workflow>
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('> Build feature with review');
    });

    it('emits separator between children', () => {
      const output = transformAgentContent(`
        import { defineTeam, defineWorker, defineTask, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const ReviewTeam = defineTeam('review');
        const Research = defineTask('Research');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Feature X" team={ReviewTeam}>
                <Team team={ReviewTeam}>
                  <Teammate worker={Security} description="Review" prompt="Review..." />
                </Team>
                <TaskPipeline>
                  <TaskDef task={Research} prompt="Research phase" />
                </TaskPipeline>
              </Workflow>
            </Agent>
          );
        }
      `, true);
      // Should have separators between workflow heading and children, and between children
      expect(output.match(/---/g)?.length).toBeGreaterThanOrEqual(2);
    });

    it('adjusts heading levels for children (## -> ###)', () => {
      const output = transformAgentContent(`
        import { defineTeam, defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const ReviewTeam = defineTeam('review');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Feature X" team={ReviewTeam}>
                <Team team={ReviewTeam}>
                  <Teammate worker={Security} description="Review" prompt="Review..." />
                </Team>
              </Workflow>
            </Agent>
          );
        }
      `, true);
      // Team normally outputs "## Team:" but inside workflow should become "### Team:"
      expect(output).toContain('### Team: review');
      // Members section should also be adjusted
      expect(output).toContain('#### Members');
    });

    it('adjusts TaskPipeline heading levels', () => {
      const output = transformAgentContent(`
        import { defineTeam, defineWorker, defineTask, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const ReviewTeam = defineTeam('review');
        const Research = defineTask('Research');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Feature X" team={ReviewTeam}>
                <Team team={ReviewTeam}>
                  <Teammate worker={Security} description="Review" prompt="Review..." />
                </Team>
                <TaskPipeline title="Implementation">
                  <TaskDef task={Research} prompt="Research phase" />
                </TaskPipeline>
              </Workflow>
            </Agent>
          );
        }
      `, true);
      // TaskPipeline title should become h3
      expect(output).toContain('### Implementation');
    });

    it('adjusts ShutdownSequence heading level', () => {
      const output = transformAgentContent(`
        import { defineTeam, defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const ReviewTeam = defineTeam('review');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Feature X" team={ReviewTeam}>
                <Team team={ReviewTeam}>
                  <Teammate worker={Security} description="Review" prompt="Review..." />
                </Team>
                <ShutdownSequence workers={[Security]} />
              </Workflow>
            </Agent>
          );
        }
      `, true);
      // ShutdownSequence's "## Shutdown" should become "### Shutdown"
      expect(output).toContain('### Shutdown');
    });
  });

  describe('team context propagation', () => {
    it('ShutdownSequence inherits team name from Workflow when team prop not provided', () => {
      const output = transformAgentContent(`
        import { defineTeam, defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const ReviewTeam = defineTeam('context-test');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Feature X" team={ReviewTeam}>
                <Team team={ReviewTeam}>
                  <Teammate worker={Security} description="Review" prompt="Review..." />
                </Team>
                <ShutdownSequence workers={[Security]} />
              </Workflow>
            </Agent>
          );
        }
      `, true);
      // Should use the workflow's team name instead of {team} placeholder
      expect(output).toContain('~/.claude/teams/context-test/inboxes/team-lead.json');
      expect(output).not.toContain('{team}');
    });

    it('ShutdownSequence can override inherited team with explicit prop', () => {
      const output = transformAgentContent(`
        import { defineTeam, defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const ReviewTeam = defineTeam('review-team');
        const OverrideTeam = defineTeam('override-team');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Feature X" team={ReviewTeam}>
                <Team team={ReviewTeam}>
                  <Teammate worker={Security} description="Review" prompt="Review..." />
                </Team>
                <ShutdownSequence workers={[Security]} team={OverrideTeam} />
              </Workflow>
            </Agent>
          );
        }
      `, true);
      // Should use the explicit team prop, not the workflow's team
      expect(output).toContain('~/.claude/teams/override-team/inboxes/team-lead.json');
    });
  });

  describe('Command integration', () => {
    it('works inside Command document', () => {
      const output = transformCommandContent(`
        import { defineTeam, defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const ReviewTeam = defineTeam('review');

        export default function Doc() {
          return (
            <Command name="test" description="test">
              <Workflow name="Feature X" team={ReviewTeam} description="Build feature">
                <Team team={ReviewTeam}>
                  <Teammate worker={Security} description="Review" prompt="Review..." />
                </Team>
              </Workflow>
            </Command>
          );
        }
      `, true);
      expect(output).toContain('## Workflow: Feature X');
      expect(output).toContain('> Build feature');
      expect(output).toContain('### Team: review');
    });
  });

  describe('complex workflows', () => {
    it('handles complete workflow with all components', () => {
      const output = transformAgentContent(`
        import { defineTeam, defineWorker, defineTask, PluginAgentType, Model } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel, Model.Haiku);
        const Perf = defineWorker('perf', PluginAgentType.PerformanceOracle, Model.Haiku);
        const ReviewTeam = defineTeam('feature-review', [Security, Perf]);

        const Research = defineTask('Research best practices', 'research');
        const Plan = defineTask('Create plan', 'plan');
        const Build = defineTask('Build feature', 'build');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Feature X" team={ReviewTeam} description="Build feature with review">
                <Team team={ReviewTeam} description="Feature X review team">
                  <Teammate
                    worker={Security}
                    description="Review code for security issues"
                    prompt="Review all code changes for security vulnerabilities..."
                  />
                  <Teammate
                    worker={Perf}
                    description="Review code for performance issues"
                    prompt="Review all code changes for performance problems..."
                  />
                </Team>

                <TaskPipeline title="Implementation" autoChain>
                  <TaskDef task={Research} prompt="Research best practices" />
                  <TaskDef task={Plan} prompt="Create detailed plan" />
                  <TaskDef task={Build} prompt="Build the feature" />
                </TaskPipeline>

                <ShutdownSequence workers={[Security, Perf]} reason="Feature complete" />
              </Workflow>
            </Agent>
          );
        }
      `, true);

      // Workflow structure
      expect(output).toContain('## Workflow: Feature X');
      expect(output).toContain('> Build feature with review');

      // Team with adjusted headings
      expect(output).toContain('### Team: feature-review');
      expect(output).toContain('> Feature X review team');
      expect(output).toContain('#### Members');
      expect(output).toContain('##### security');
      expect(output).toContain('##### perf');

      // TaskPipeline with adjusted heading
      expect(output).toContain('### Implementation');
      expect(output).toContain('```mermaid');
      expect(output).toContain('flowchart LR');
      expect(output).toContain('T1 --> T2');
      expect(output).toContain('T2 --> T3');

      // ShutdownSequence with context propagation
      expect(output).toContain('### Shutdown');
      expect(output).toContain('target_agent_id: "security"');
      expect(output).toContain('target_agent_id: "perf"');
      expect(output).toContain('~/.claude/teams/feature-review/inboxes/team-lead.json');
    });
  });
});

describe('defineWorker with imported Agent', () => {
  it('resolves default-imported Agent name as workerType', () => {
    const output = buildAgentWithExternals(
      `
        import CodeReviewer from './agents/code-reviewer';

        const Reviewer = defineWorker('reviewer', CodeReviewer);
        const ReviewTeam = defineTeam('review');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Review" team={ReviewTeam}>
                <Team team={ReviewTeam}>
                  <Teammate worker={Reviewer} description="Code review" prompt="Review code..." />
                </Team>
              </Workflow>
            </Agent>
          );
        }
      `,
      {
        './agents/code-reviewer.tsx': `
          export default () => (
            <Agent name="code-reviewer" description="Reviews code for quality">
              <p>Review code for quality issues.</p>
            </Agent>
          );
        `,
      }
    );

    // workerType should resolve to the Agent's name attribute "code-reviewer"
    expect(output).toContain('subagent_type: "code-reviewer"');
  });

  it('resolves named-imported Agent name as workerType', () => {
    const output = buildAgentWithExternals(
      `
        import { SecurityAgent } from './agents/security';

        const Security = defineWorker('security', SecurityAgent);
        const Team1 = defineTeam('sec-team');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Security Review" team={Team1}>
                <Team team={Team1}>
                  <Teammate worker={Security} description="Security audit" prompt="Audit..." />
                </Team>
              </Workflow>
            </Agent>
          );
        }
      `,
      {
        './agents/security.tsx': `
          export const SecurityAgent = () => (
            <Agent name="security-sentinel" description="Security analysis">
              <p>Analyze for vulnerabilities.</p>
            </Agent>
          );
        `,
      }
    );

    expect(output).toContain('subagent_type: "security-sentinel"');
  });

  it('throws when imported Agent cannot be resolved', () => {
    expect(() =>
      buildAgentWithExternals(
        `
          import UnknownAgent from './agents/unknown';

          const Worker = defineWorker('worker', UnknownAgent);
          const Team1 = defineTeam('team');

          export default function Doc() {
            return (
              <Agent name="test" description="test">
                <Workflow name="Test" team={Team1}>
                  <Team team={Team1}>
                    <Teammate worker={Worker} description="Test" prompt="Test..." />
                  </Team>
                </Workflow>
              </Agent>
            );
          }
        `,
        {
          // File exists but has no <Agent> component
          './agents/unknown.tsx': `
            export default function NotAnAgent() {
              return <p>Just a component</p>;
            }
          `,
        }
      )
    ).toThrow(/Could not resolve import 'UnknownAgent'/);
  });

  it('resolves self-closing Agent syntax', () => {
    const output = buildAgentWithExternals(
      `
        import PerfAgent from './agents/perf';

        const Perf = defineWorker('perf', PerfAgent);
        const Team1 = defineTeam('perf-team');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <Workflow name="Perf" team={Team1}>
                <Team team={Team1}>
                  <Teammate worker={Perf} description="Perf review" prompt="Review..." />
                </Team>
              </Workflow>
            </Agent>
          );
        }
      `,
      {
        './agents/perf.tsx': `
          export default () => <Agent name="performance-oracle" description="Performance analysis" />;
        `,
      }
    );

    expect(output).toContain('subagent_type: "performance-oracle"');
  });
});
