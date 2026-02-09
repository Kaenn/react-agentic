/**
 * Technology Comparison Swarm Example
 *
 * Demonstrates full swarm orchestration with:
 * - Team with 3 workers (2 Explorers + 1 Synthesizer)
 * - DAG task structure: 2 parallel research tasks → 1 synthesis task
 * - Workers that claim specific tasks and communicate findings
 * - Graceful shutdown sequence
 *
 * Follows Claude Code swarm lifecycle:
 * 1. Create Team → 2. Create Tasks → 3. Spawn Teammates → 4. Work → 5. Shutdown
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

// Define tasks for the comparison pipeline
// Two parallel research tasks, one synthesis task that depends on both
const ResearchRSC = defineTask('Research React Server Components', 'rsc-research');
const ResearchAstro = defineTask('Research Astro Islands', 'astro-research');
const SynthesizeReport = defineTask('Synthesize Technology Comparison', 'synthesize');

// Define workers with their specializations
const RSCExplorer = defineWorker('rsc-explorer', AgentType.Explore, Model.Sonnet);
const AstroExplorer = defineWorker('astro-explorer', AgentType.Explore, Model.Sonnet);
const Synthesizer = defineWorker('synthesizer', AgentType.GeneralPurpose, Model.Sonnet);

// Define the team
const CompareTeam = defineTeam('tech-compare', [RSCExplorer, AstroExplorer, Synthesizer]);

export default () => (
  <Command name="tech-compare" description="Spawn a swarm of two explorers to research different technologies, then synthesize findings">
    <h1>Technology Comparison Swarm</h1>

    <p>
      This workflow spawns two explorer agents to research React Server Components
      and Astro Islands in parallel. Once both complete, a synthesizer combines
      the findings into actionable recommendations.
    </p>

    <XmlBlock name="technologies">
      <ul>
        <li><strong>Explorer 1</strong>: React Server Components (RSC) - Next.js App Router implementation</li>
        <li><strong>Explorer 2</strong>: Astro Islands Architecture - partial hydration patterns</li>
      </ul>
    </XmlBlock>

    <Workflow name="Technology Comparison" team={CompareTeam} description="Comparing React Server Components vs Astro Islands for modern web architecture decisions">
      {/* STEP 1: Create tasks BEFORE spawning teammates */}
      {/* DAG structure: rsc-research and astro-research run in parallel, synthesize waits for both */}
      <TaskPipeline title="Research Pipeline">
        <TaskDef
          task={ResearchRSC}
          prompt="Deep dive into React Server Components (RSC) in Next.js App Router. Research: 1) How RSC works (server vs client components), 2) Performance benefits (bundle size, streaming), 3) DX trade-offs (learning curve, debugging), 4) Real-world adoption patterns. Use web search for latest 2025-2026 best practices."
          activeForm="Researching React Server Components..."
        />
        <TaskDef
          task={ResearchAstro}
          prompt="Deep dive into Astro Islands architecture. Research: 1) How Islands work (partial hydration), 2) Performance benefits (zero JS by default, selective hydration), 3) DX trade-offs (component compatibility, ecosystem), 4) Real-world adoption patterns. Use web search for latest 2025-2026 best practices."
          activeForm="Researching Astro Islands..."
        />
        <TaskDef
          task={SynthesizeReport}
          prompt="Combine findings from both explorers into a comprehensive comparison report. Include: 1) Side-by-side feature matrix, 2) Performance comparison, 3) Use-case recommendations (when to use each), 4) Final recommendation with reasoning."
          activeForm="Synthesizing comparison report..."
          blockedBy={[ResearchRSC, ResearchAstro]}
        />
      </TaskPipeline>

      {/* STEP 2: Spawn teammates AFTER tasks exist */}
      <Team team={CompareTeam} description="Technology research and comparison specialists">
        <Teammate worker={RSCExplorer} description="Researches React Server Components">
          <Prompt>
            <p>You are researching React Server Components (RSC) for a technology comparison.</p>

            <XmlBlock name="mission">
              <ol>
                <li>Claim task #1 using TaskUpdate(&#123; taskId: "1", owner: "rsc-explorer", status: "in_progress" &#125;)</li>
                <li>Research React Server Components thoroughly:
                  <ul>
                    <li>Use WebSearch to find latest RSC documentation and best practices (2025-2026)</li>
                    <li>Focus on: how RSC works, performance benefits, DX trade-offs, real-world adoption</li>
                  </ul>
                </li>
                <li>When done, mark task complete: TaskUpdate(&#123; taskId: "1", status: "completed" &#125;)</li>
                <li>Send your findings to team-lead:
                  Teammate(&#123; operation: "write", target_agent_id: "team-lead", value: "RSC FINDINGS:\n[Your comprehensive findings here with key insights and data points]" &#125;)
                </li>
              </ol>
            </XmlBlock>

            <p>Be thorough but focused. Include concrete examples and metrics where possible.</p>
          </Prompt>
        </Teammate>

        <Teammate worker={AstroExplorer} description="Researches Astro Islands architecture">
          <Prompt>
            <p>You are researching Astro Islands architecture for a technology comparison.</p>

            <XmlBlock name="mission">
              <ol>
                <li>Claim task #2 using TaskUpdate(&#123; taskId: "2", owner: "astro-explorer", status: "in_progress" &#125;)</li>
                <li>Research Astro Islands thoroughly:
                  <ul>
                    <li>Use WebSearch to find latest Astro documentation and best practices (2025-2026)</li>
                    <li>Focus on: how Islands work, performance benefits, DX trade-offs, real-world adoption</li>
                  </ul>
                </li>
                <li>When done, mark task complete: TaskUpdate(&#123; taskId: "2", status: "completed" &#125;)</li>
                <li>Send your findings to team-lead:
                  Teammate(&#123; operation: "write", target_agent_id: "team-lead", value: "ASTRO FINDINGS:\n[Your comprehensive findings here with key insights and data points]" &#125;)
                </li>
              </ol>
            </XmlBlock>

            <p>Be thorough but focused. Include concrete examples and metrics where possible.</p>
          </Prompt>
        </Teammate>

        <Teammate worker={Synthesizer} description="Synthesizes findings into comparison report">
          <Prompt>
            <p>You are the synthesizer for a technology comparison between React Server Components and Astro Islands.</p>

            <XmlBlock name="mission">
              <ol>
                <li>Call TaskList() to monitor task status - wait until tasks #1 and #2 are completed</li>
                <li>Read the team-lead inbox to get findings from both explorers:
                  Use Bash to read: cat ~/.claude/teams/tech-compare/inboxes/team-lead.json
                </li>
                <li>Claim task #3: TaskUpdate(&#123; taskId: "3", owner: "synthesizer", status: "in_progress" &#125;)</li>
                <li>Create a comprehensive comparison report including:
                  <ul>
                    <li>Executive Summary (2-3 sentences)</li>
                    <li>Side-by-side Feature Matrix (table format)</li>
                    <li>Performance Comparison (with metrics if available)</li>
                    <li>Use-Case Recommendations: When to choose RSC vs When to choose Astro</li>
                    <li>Final Recommendation with reasoning</li>
                  </ul>
                </li>
                <li>Mark task complete: TaskUpdate(&#123; taskId: "3", status: "completed" &#125;)</li>
                <li>Send the final report to team-lead:
                  Teammate(&#123; operation: "write", target_agent_id: "team-lead", value: "FINAL COMPARISON REPORT:\n[Your comprehensive comparison report]" &#125;)
                </li>
              </ol>
            </XmlBlock>

            <p>Make the report actionable and decision-ready.</p>
          </Prompt>
        </Teammate>
      </Team>

      <ShutdownSequence
        workers={[RSCExplorer, AstroExplorer, Synthesizer]}
        reason="Technology comparison complete"
      />
    </Workflow>

    <h2>Execution Instructions</h2>

    <p>Execute this workflow step by step:</p>
    <ol>
      <li>Create the team (spawnTeam)</li>
      <li>Create all tasks (TaskCreate calls)</li>
      <li>Spawn both explorers in parallel (single message with multiple Task calls)</li>
      <li>Monitor progress: TaskList() and check inbox</li>
      <li>Spawn synthesizer after tasks #1 and #2 complete</li>
      <li>Monitor until task #3 completes</li>
      <li>Read final report from inbox</li>
      <li>Shutdown all workers and cleanup</li>
    </ol>

    <p>Present the final comparison report to the user when complete.</p>
  </Command>
);
