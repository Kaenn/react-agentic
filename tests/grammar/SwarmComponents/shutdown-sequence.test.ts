/**
 * Grammar Tests: ShutdownSequence Component
 *
 * Tests graceful shutdown sequence component that emits Claude Code's
 * Teammate({ operation: "requestShutdown" }) and cleanup syntax.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent, expectAgentTransformError } from '../_helpers/test-utils.js';

describe('<ShutdownSequence>', () => {
  describe('type safety', () => {
    it('compiles with workers prop', () => {
      const content = `
        import { defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ShutdownSequence workers={[Security]} />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(content, true)).not.toThrow();
    });

    it('compiles with all optional props', () => {
      const content = `
        import { defineWorker, defineTeam, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const ReviewTeam = defineTeam('pr-review', [Security]);

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ShutdownSequence
                workers={[Security]}
                reason="All reviews complete"
                cleanup={false}
                team={ReviewTeam}
                title="Graceful Termination"
              />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(content, true)).not.toThrow();
    });

    it('compiles with multiple workers', () => {
      const content = `
        import { defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const Perf = defineWorker('perf', PluginAgentType.PerformanceOracle);

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ShutdownSequence workers={[Security, Perf]} />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(content, true)).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('throws error for empty workers array', () => {
      const content = `
        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ShutdownSequence workers={[]} />
            </Agent>
          );
        }
      `;
      expectAgentTransformError(content, /ShutdownSequence requires at least one worker/);
    });
  });

  describe('output correctness', () => {
    it('emits section title heading', () => {
      const output = transformAgentContent(`
        import { defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ShutdownSequence workers={[Security]} />
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('## Shutdown');
    });

    it('emits custom title', () => {
      const output = transformAgentContent(`
        import { defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ShutdownSequence workers={[Security]} title="Graceful Termination" />
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('## Graceful Termination');
    });

    it('emits requestShutdown for each worker', () => {
      const output = transformAgentContent(`
        import { defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const Perf = defineWorker('perf', PluginAgentType.PerformanceOracle);

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ShutdownSequence workers={[Security, Perf]} reason="All reviews complete" />
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('Teammate({ operation: "requestShutdown", target_agent_id: "security", reason: "All reviews complete" })');
      expect(output).toContain('Teammate({ operation: "requestShutdown", target_agent_id: "perf", reason: "All reviews complete" })');
    });

    it('emits default reason when not provided', () => {
      const output = transformAgentContent(`
        import { defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ShutdownSequence workers={[Security]} />
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('reason: "Shutdown requested"');
    });

    it('emits wait instructions with team name', () => {
      const output = transformAgentContent(`
        import { defineWorker, defineTeam, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const ReviewTeam = defineTeam('pr-review', [Security]);

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ShutdownSequence workers={[Security]} team={ReviewTeam} />
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('// Check ~/.claude/teams/pr-review/inboxes/team-lead.json for:');
      expect(output).toContain('// {"type": "shutdown_approved", "from": "security", ...}');
    });

    it('uses {team} placeholder when team not provided', () => {
      const output = transformAgentContent(`
        import { defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ShutdownSequence workers={[Security]} />
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('// Check ~/.claude/teams/{team}/inboxes/team-lead.json for:');
    });

    it('emits cleanup step by default', () => {
      const output = transformAgentContent(`
        import { defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ShutdownSequence workers={[Security]} />
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('// 3. Cleanup team resources');
      expect(output).toContain('Teammate({ operation: "cleanup" })');
    });

    it('omits cleanup step when cleanup={false}', () => {
      const output = transformAgentContent(`
        import { defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ShutdownSequence workers={[Security]} cleanup={false} />
            </Agent>
          );
        }
      `, true);
      expect(output).not.toContain('// 3. Cleanup team resources');
      expect(output).not.toContain('Teammate({ operation: "cleanup" })');
    });

    it('emits javascript code block', () => {
      const output = transformAgentContent(`
        import { defineWorker, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ShutdownSequence workers={[Security]} />
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('```javascript');
      expect(output).toContain('// 1. Request shutdown for all workers');
      expect(output).toContain('// 2. Wait for shutdown_approved messages');
    });
  });

  describe('multiple workers', () => {
    it('handles multiple workers with different worker refs', () => {
      const output = transformAgentContent(`
        import { defineWorker, defineTeam, PluginAgentType } from 'react-agentic';

        const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
        const Perf = defineWorker('perf', PluginAgentType.PerformanceOracle);
        const ReviewTeam = defineTeam('pr-review', [Security, Perf]);

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <h2>Shutdown Team</h2>
              <ShutdownSequence
                workers={[Security, Perf]}
                team={ReviewTeam}
                reason="Reviews complete"
              />
            </Agent>
          );
        }
      `, true);

      // Shutdown section should have both workers
      expect(output).toContain('Teammate({ operation: "requestShutdown"');
      expect(output).toContain('target_agent_id: "security"');
      expect(output).toContain('target_agent_id: "perf"');
      expect(output).toContain('// Check ~/.claude/teams/pr-review/inboxes/team-lead.json for:');
      expect(output).toContain('// {"type": "shutdown_approved", "from": "security", ...}');
      expect(output).toContain('// {"type": "shutdown_approved", "from": "perf", ...}');
    });
  });
});
