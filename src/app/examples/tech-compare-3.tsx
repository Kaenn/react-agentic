/**
 * Technology Comparison Swarm Example (v3 - Imported Agent Workers)
 *
 * Demonstrates defineWorker() with an imported Agent component:
 * - Both explorers use the same dev-researcher agent definition
 * - The agent's name ("dev-researcher") becomes the subagent_type
 * - Each worker gets a unique name but shares the same agent behavior
 *
 * This pattern enables reusable agent definitions across workflows.
 */
import {
  Command,
  defineTask,
  defineWorker,
  defineTeam,
  AgentType,
  Model,
  TaskDef,
  TaskPipeline,
  Team,
  Teammate,
  Prompt,
  ShutdownSequence,
  Workflow,
  XmlBlock,
} from '../../index.js';

// Import the reusable dev-researcher agent
import DevResearcher from '../agents/dev-researcher.js';

// Define tasks: two parallel research tasks → one synthesis task
const ResearchRSC = defineTask('Research React Server Components', 'rsc-research');
const ResearchAstro = defineTask('Research Astro Islands', 'astro-research');
const SynthesizeReport = defineTask('Synthesize Technology Comparison', 'synthesize');

// Both explorers use the same imported Agent as their type.
// defineWorker resolves DevResearcher → Agent name="dev-researcher" → subagent_type: "dev-researcher"
const RSCExplorer = defineWorker('rsc-explorer', DevResearcher, Model.Sonnet);
const AstroExplorer = defineWorker('astro-explorer', DevResearcher, Model.Sonnet);

// Synthesizer uses a built-in agent type
const Synthesizer = defineWorker('synthesizer', AgentType.GeneralPurpose, Model.Sonnet);

// Define the team
const CompareTeam = defineTeam('tech-compare', [RSCExplorer, AstroExplorer, Synthesizer]);

export default () => (
  <Command name="tech-compare-3" description="Spawn a swarm using imported dev-researcher agents for technology comparison">
    <h1>Technology Comparison Swarm (Imported Agent Workers)</h1>

    <p>
      This workflow uses a shared dev-researcher agent definition for both explorers.
      Each explorer gets the same agent behavior but a unique worker name and task assignment.
    </p>

    <XmlBlock name="technologies">
      <ul>
        <li><strong>Explorer 1 (rsc-explorer)</strong>: React Server Components - Next.js App Router</li>
        <li><strong>Explorer 2 (astro-explorer)</strong>: Astro Islands Architecture - partial hydration</li>
      </ul>
    </XmlBlock>

    <Workflow name="Technology Comparison" team={CompareTeam} description="Comparing RSC vs Astro using reusable dev-researcher agents">
      <TaskPipeline title="Research Pipeline">
        <TaskDef
          task={ResearchRSC}
          prompt="Deep dive into React Server Components (RSC) in Next.js App Router. Research: 1) How RSC works (server vs client components), 2) Performance benefits (bundle size, streaming), 3) DX trade-offs (learning curve, debugging), 4) Real-world adoption. Use web search for latest 2025-2026 best practices."
          activeForm="Researching React Server Components..."
        />
        <TaskDef
          task={ResearchAstro}
          prompt="Deep dive into Astro Islands architecture. Research: 1) How Islands work (partial hydration), 2) Performance benefits (zero JS by default, selective hydration), 3) DX trade-offs (component compatibility, ecosystem), 4) Real-world adoption. Use web search for latest 2025-2026 best practices."
          activeForm="Researching Astro Islands..."
        />
        <TaskDef
          task={SynthesizeReport}
          prompt="Combine findings from both explorers into a comparison report. Include: 1) Feature matrix, 2) Performance comparison, 3) Use-case recommendations, 4) Final recommendation."
          activeForm="Synthesizing comparison report..."
          blockedBy={[ResearchRSC, ResearchAstro]}
        />
      </TaskPipeline>

      <Team team={CompareTeam} description="Technology research team using shared dev-researcher agent">
        <Teammate worker={RSCExplorer} description="Researches React Server Components">
          <Prompt>
            <p>You are assigned to research React Server Components for a technology comparison.</p>

            <XmlBlock name="mission">
              <ol>
                <li>Claim task #1: TaskUpdate(&#123; taskId: "1", owner: "rsc-explorer", status: "in_progress" &#125;)</li>
                <li>Follow your dev-researcher methodology to research RSC:
                  <ul>
                    <li>How RSC works (server vs client components)</li>
                    <li>Performance benefits (bundle size, streaming SSR)</li>
                    <li>DX trade-offs (learning curve, debugging)</li>
                    <li>Real-world adoption and ecosystem maturity</li>
                  </ul>
                </li>
                <li>Mark complete: TaskUpdate(&#123; taskId: "1", status: "completed" &#125;)</li>
                <li>Send findings: Teammate(&#123; operation: "write", target_agent_id: "team-lead", value: "RSC FINDINGS:\n[findings]" &#125;)</li>
              </ol>
            </XmlBlock>
          </Prompt>
        </Teammate>

        <Teammate worker={AstroExplorer} description="Researches Astro Islands architecture">
          <Prompt>
            <p>You are assigned to research Astro Islands architecture for a technology comparison.</p>

            <XmlBlock name="mission">
              <ol>
                <li>Claim task #2: TaskUpdate(&#123; taskId: "2", owner: "astro-explorer", status: "in_progress" &#125;)</li>
                <li>Follow your dev-researcher methodology to research Astro Islands:
                  <ul>
                    <li>How Islands work (partial hydration model)</li>
                    <li>Performance benefits (zero JS by default)</li>
                    <li>DX trade-offs (component compatibility, ecosystem)</li>
                    <li>Real-world adoption and content-site patterns</li>
                  </ul>
                </li>
                <li>Mark complete: TaskUpdate(&#123; taskId: "2", status: "completed" &#125;)</li>
                <li>Send findings: Teammate(&#123; operation: "write", target_agent_id: "team-lead", value: "ASTRO FINDINGS:\n[findings]" &#125;)</li>
              </ol>
            </XmlBlock>
          </Prompt>
        </Teammate>

        <Teammate worker={Synthesizer} description="Synthesizes findings into comparison report">
          <Prompt>
            <p>You synthesize findings from both research explorers into a decision-ready report.</p>

            <XmlBlock name="mission">
              <ol>
                <li>Monitor TaskList() — wait until tasks #1 and #2 are completed</li>
                <li>Read team-lead inbox: cat ~/.claude/teams/tech-compare/inboxes/team-lead.json</li>
                <li>Claim task #3: TaskUpdate(&#123; taskId: "3", owner: "synthesizer", status: "in_progress" &#125;)</li>
                <li>Create comparison report:
                  <ul>
                    <li>Executive Summary</li>
                    <li>Side-by-side Feature Matrix</li>
                    <li>Performance Comparison</li>
                    <li>Use-Case Recommendations</li>
                    <li>Final Recommendation</li>
                  </ul>
                </li>
                <li>Mark complete: TaskUpdate(&#123; taskId: "3", status: "completed" &#125;)</li>
                <li>Send report: Teammate(&#123; operation: "write", target_agent_id: "team-lead", value: "FINAL REPORT:\n[report]" &#125;)</li>
              </ol>
            </XmlBlock>
          </Prompt>
        </Teammate>
      </Team>

      <ShutdownSequence
        workers={[RSCExplorer, AstroExplorer, Synthesizer]}
        reason="Technology comparison complete"
      />
    </Workflow>
  </Command>
);
