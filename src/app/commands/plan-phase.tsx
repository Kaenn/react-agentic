/**
 * plan-phase.tsx - V3 Command (Full Implementation)
 *
 * Creates detailed execution plan for a phase (PLAN.md) with verification loop.
 * Demonstrates V3 hybrid runtime for complex orchestration.
 *
 * Flow: Research (if needed) → Plan → Verify → Done
 *
 * Uses TypeScript runtime functions for:
 * - File I/O and parsing
 * - Context assembly and prompt building
 * - Model profile resolution
 * - Summary generation
 */

import {
  Command,
  useRuntimeVar,
  runtimeFn,
  If,
  Else,
  Loop,
  Break,
  Return,
  AskUser,
  SpawnAgent,
  XmlBlock,
  ExecutionContext,
  Table,
  Markdown,
  ReadFile,
} from '../../jsx.js';

import {
  GatherContext,
  ComposeContext,
  Preamble,
} from '../../composites/meta-prompting/index.js';

// Import runtime functions
import {
  init,
  checkExistingPlans,
  parseAgentStatus,
  archiveExistingPlans,
  readAndDisplayPlans,
} from './plan-phase.runtime.js';

// Import types
import type {
  PlanPhaseContext,
} from './plan-phase.runtime.js';

// ============================================================================
// Create typed runtime function components
// ============================================================================

const Init = runtimeFn(init);
const CheckExistingPlans = runtimeFn(checkExistingPlans);
const ParseAgentStatus = runtimeFn(parseAgentStatus);
const ArchiveExistingPlans = runtimeFn(archiveExistingPlans);
const ReadAndDisplayPlans = runtimeFn(readAndDisplayPlans);

// ============================================================================
// Command Definition
// ============================================================================

export default (
  <Command
    name="gsd:plan-phase"
    description="Create detailed execution plan for a phase (PLAN.md) with verification loop"
    argumentHint="[phase] [--research] [--skip-research] [--gaps] [--skip-verify]"
    agent="gsd-planner"
    allowedTools={["Read", "Write", "Bash", "Glob", "Grep", "Task", "WebFetch", "mcp__context7__*"]}
  >
    {() => {
      // Variable declarations with typed RuntimeVars
      const ctx = useRuntimeVar<PlanPhaseContext>('CTX');
      const existingPlans = useRuntimeVar<{ hasPlans: boolean; planCount: number; planFiles: string[]; planSummary: string }>('EXISTING_PLANS');
      const agentOutput = useRuntimeVar<string>('AGENT_OUTPUT');
      const agentStatus = useRuntimeVar<{ status: 'COMPLETE' | 'BLOCKED' | 'INCONCLUSIVE' | 'CHECKPOINT' | 'PASSED' | 'ISSUES_FOUND'; message: string; issues: string[] }>('AGENT_STATUS');
      const userChoice = useRuntimeVar<string>('USER_CHOICE');
      const iteration = useRuntimeVar<number>('ITERATION');
      const plansDisplay = useRuntimeVar<string>('PLANS_DISPLAY');
      const _void = useRuntimeVar<void>('_VOID'); // Placeholder for void returns

      return (
        <>
          <ExecutionContext paths={["@~/.claude/get-shit-done/references/ui-brand.md"]} />

          <XmlBlock name="objective">
            <p>Create executable phase prompts (PLAN.md files) for a roadmap phase with integrated research and verification.</p>
            <p><b>Default flow:</b> Research (if needed) → Plan → Verify → Done</p>
            <p><b>Orchestrator role:</b> Parse arguments, validate phase, research domain (unless skipped or exists), spawn gsd-planner agent, verify plans with gsd-plan-checker, iterate until plans pass or max iterations reached, present results.</p>
            <p><b>Why subagents:</b> Research and planning burn context fast. Verification uses fresh context. User sees the flow between agents in main context.</p>
          </XmlBlock>

          <XmlBlock name="critical_instructions">
            <p><b>IMPORTANT:</b> This command uses a Node.js runtime for complex operations.</p>
            <p><b>You MUST execute the bash commands shown in code blocks.</b> Do NOT improvise or read files manually.</p>
            <p>The runtime.js file at .claude/runtime/runtime.js handles: argument parsing, file reading, prompt building, and summary generation.</p>
            <p>Follow each step sequentially. Run bash commands FIRST, then use the output variables in subsequent steps.</p>
          </XmlBlock>

          <XmlBlock name="context">
            <p>Phase number: $ARGUMENTS (optional - auto-detects next unplanned phase if not provided)</p>
            <div>
              <b>Flags:</b>
              <ul>
                <li><code>--research</code> — Force re-research even if RESEARCH.md exists</li>
                <li><code>--skip-research</code> — Skip research entirely, go straight to planning</li>
                <li><code>--gaps</code> — Gap closure mode (reads .planning/VERIFICATION.md, skips research)</li>
                <li><code>--skip-verify</code> — Skip planner → checker verification loop</li>
              </ul>
            </div>
            <p>Normalize phase input in step 2 before any directory lookups.</p>
          </XmlBlock>

          <XmlBlock name="process">

            {/* ============================================================ */}
            {/* STEP 1: Validate Environment and Initialize */}
            {/* ============================================================ */}

            <h2>Step 1: Validate Environment</h2>

            <p>Initialize context, parse arguments, validate environment:</p>

            <Init.Call
              args={{ arguments: "$ARGUMENTS"}}
              output={ctx}
            />

            <If condition={ctx.error}>
              <p><b>Error:</b> {ctx.error}</p>
              <p>Run <code>/gsd:new-project</code> first if .planning/ directory is missing.</p>
              <Return status="ERROR" message="Initialization failed" />
            </If>

            <p>Phase {ctx.phaseId}: {ctx.phaseName}</p>
            <p>Directory: {ctx.phaseDir}</p>
            <p>Model profile: {ctx.modelProfile}</p>

            <h3>Model Profile Lookup</h3>
            <Table
              headers={["Agent", "quality", "balanced", "budget"]}
              rows={[
                ["gsd-phase-researcher", "opus", "sonnet", "haiku"],
                ["gsd-planner", "opus", "opus", "sonnet"],
                ["gsd-plan-checker", "sonnet", "sonnet", "haiku"],
              ]}
            />
            <p>Use <code>{ctx.researcherModel}</code>, <code>{ctx.plannerModel}</code>, <code>{ctx.checkerModel}</code> in Task calls below.</p>

            {/* ============================================================ */}
            {/* STEP 2: Handle Research */}
            {/* ============================================================ */}

            <h2>Step 2: Handle Research</h2>

            <If condition={ctx.flags.gaps}>
              <p>Gap closure mode — skipping research (using .planning/VERIFICATION.md instead)</p>
            </If>
            <Else>
              <If condition={ctx.flags.skipResearch}>
                <p>Research skipped (--skip-research flag). Go to step 3.</p>
              </If>
              <Else>
                <If condition={ctx.needsResearch}>
                  <pre>{`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► RESEARCHING PHASE ${ctx.phaseId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`}</pre>

                  <p>◆ Gathering research context...</p>

                  <GatherContext>
                    <ReadFile path=".planning/ROADMAP.md" as="ROADMAP_CONTENT" />
                    <ReadFile path=".planning/REQUIREMENTS.md" as="REQUIREMENTS_CONTENT" optional />
                    <ReadFile path=".planning/STATE.md" as="STATE_CONTENT" />
                    <ReadFile path={`${ctx.phaseDir}/${ctx.phaseId}-CONTEXT.md`} as="PHASE_CONTEXT" optional />
                  </GatherContext>

                  <ComposeContext name="research_context">
                    <Preamble>Research how to implement this phase. Answer: "What do I need to know to PLAN this phase well?"</Preamble>
                    <Markdown>**Phase:** {ctx.phaseId} - {ctx.phaseName}</Markdown>
                    <Markdown>**Phase description:** {ctx.phaseDescription}</Markdown>
                    <Markdown>**Requirements:** $REQUIREMENTS_CONTENT</Markdown>
                    <Markdown>**Prior decisions:** $STATE_CONTENT</Markdown>
                    <Markdown>**Phase context:** $PHASE_CONTEXT</Markdown>
                    <Markdown>**Output:** Write to: {ctx.phaseDir}/{ctx.phaseId}-RESEARCH.md</Markdown>
                  </ComposeContext>

                  <p>◆ Spawning researcher agent...</p>

                  <SpawnAgent
                    agent="gsd-phase-researcher"
                    readAgentFile={true}
                    model={ctx.researcherModel}
                    description={`Research Phase ${ctx.phaseId}`}
                    input={{ prompt: "$RESEARCH_CONTEXT" }}
                    output={agentOutput}
                  />

                  <ParseAgentStatus.Call
                    args={{ output: agentOutput }}
                    output={agentStatus}
                  />

                  <If condition={agentStatus.status === 'BLOCKED'}>
                    <p><b>Research blocked:</b> {agentStatus.message}</p>

                    <AskUser
                      question="Research encountered a blocker. How would you like to proceed?"
                      header="Blocker"
                      options={[
                        { value: 'context', label: 'Provide more context', description: 'Add information and retry research' },
                        { value: 'skip', label: 'Skip research', description: 'Proceed to planning without research' },
                        { value: 'abort', label: 'Abort', description: 'Exit planning entirely' },
                      ]}
                      output={userChoice}
                    />

                    <If condition={userChoice === 'abort'}>
                      <Return status="BLOCKED" message="User aborted due to research blocker" />
                    </If>
                    <If condition={userChoice === 'skip'}>
                      <p>Skipping research, proceeding to planning...</p>
                    </If>
                    <If condition={userChoice === 'context'}>
                      <p>Please provide additional context, then run /gsd:plan-phase {ctx.phaseId} again.</p>
                      <Return status="CHECKPOINT" message="Waiting for user context" />
                    </If>
                  </If>
                  <Else>
                    <p>Research complete. Proceeding to planning...</p>
                  </Else>
                </If>
                <Else>
                  <p>Using existing research: {ctx.phaseDir}/{ctx.phaseId}-RESEARCH.md</p>
                </Else>
              </Else>
            </Else>

            {/* ============================================================ */}
            {/* STEP 3: Check Existing Plans */}
            {/* ============================================================ */}

            <h2>Step 3: Check Existing Plans</h2>

            <CheckExistingPlans.Call
              args={{ phaseDir: ctx.phaseDir }}
              output={existingPlans}
            />

            <If condition={existingPlans.hasPlans}>
              <p>Found {existingPlans.planCount} existing plan(s):</p>
              <pre>{existingPlans.planSummary}</pre>

              <AskUser
                question="Plans already exist for this phase. What would you like to do?"
                header="Existing Plans"
                options={[
                  { value: 'continue', label: 'Continue planning', description: 'Add more plans to existing ones' },
                  { value: 'view', label: 'View existing plans', description: 'Display current plans before deciding' },
                  { value: 'replan', label: 'Replan from scratch', description: 'Archive existing and create new plans' },
                ]}
                output={userChoice}
              />

              <If condition={userChoice === 'view'}>
                <ReadAndDisplayPlans.Call
                  args={{ phaseDir: ctx.phaseDir }}
                  output={plansDisplay}
                />
                <pre>{plansDisplay}</pre>

                <AskUser
                  question="After reviewing the plans, how would you like to proceed?"
                  header="Decision"
                  options={[
                    { value: 'continue', label: 'Continue planning', description: 'Add more plans' },
                    { value: 'replan', label: 'Replan from scratch', description: 'Archive and recreate' },
                    { value: 'done', label: 'Done', description: 'Plans look good, exit' },
                  ]}
                  output={userChoice}
                />

                <If condition={userChoice === 'done'}>
                  <p>Keeping existing plans. Run /gsd:execute-phase {ctx.phaseId} when ready.</p>
                  <Return status="SUCCESS" message="Using existing plans" />
                </If>
              </If>

              <If condition={userChoice === 'replan'}>
                <p>Archiving existing plans...</p>
                <ArchiveExistingPlans.Call
                  args={{ phaseDir: ctx.phaseDir }}
                  output={_void}
                />
                <p>Existing plans archived. Starting fresh...</p>
              </If>
            </If>

            {/* ============================================================ */}
            {/* STEP 4: Spawn gsd-planner Agent */}
            {/* ============================================================ */}

            <h2>Step 4: Spawn Planner</h2>

            <pre>{`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PLANNING PHASE ${ctx.phaseId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`}</pre>

            <p>◆ Gathering planning context...</p>

            <GatherContext>
              <ReadFile path=".planning/STATE.md" as="STATE_CONTENT" />
              <ReadFile path=".planning/ROADMAP.md" as="ROADMAP_CONTENT" />
              <ReadFile path=".planning/REQUIREMENTS.md" as="REQUIREMENTS_CONTENT" optional />
              <ReadFile path={`${ctx.phaseDir}/${ctx.phaseId}-CONTEXT.md`} as="PHASE_CONTEXT" optional />
              <ReadFile path={`${ctx.phaseDir}/${ctx.phaseId}-RESEARCH.md`} as="RESEARCH_CONTENT" optional />
            </GatherContext>

            <If condition={ctx.flags.gaps}>
              <GatherContext>
                <ReadFile path={`${ctx.phaseDir}/${ctx.phaseId}-VERIFICATION.md`} as="VERIFICATION_CONTENT" optional />
                <ReadFile path={`${ctx.phaseDir}/${ctx.phaseId}-UAT.md`} as="UAT_CONTENT" optional />
              </GatherContext>
            </If>

            <ComposeContext name="planning_context">
              <Preamble>Create executable PLAN.md files. Output consumed by /gsd:execute-phase.</Preamble>
              <Markdown>**Phase:** {ctx.phaseId} - {ctx.phaseName}</Markdown>
              <If condition={ctx.flags.gaps}>
                <Markdown>**Mode:** gap_closure</Markdown>
              </If>
              <Else>
                <Markdown>**Mode:** standard</Markdown>
              </Else>
              <Markdown>**Project State:** $STATE_CONTENT</Markdown>
              <Markdown>**Roadmap:** $ROADMAP_CONTENT</Markdown>
              <Markdown>**Requirements:** $REQUIREMENTS_CONTENT</Markdown>
              <Markdown>**Phase Context:** $PHASE_CONTEXT</Markdown>
              <Markdown>**Research:** $RESEARCH_CONTENT</Markdown>
              <If condition={ctx.flags.gaps}>
                <Markdown>**Gap Closure - VERIFICATION.md:** $VERIFICATION_CONTENT</Markdown>
                <Markdown>**Gap Closure - UAT.md:** $UAT_CONTENT</Markdown>
              </If>
            </ComposeContext>

            <XmlBlock name="downstream_consumer">
              <p>Output consumed by /gsd:execute-phase</p>
              <p>Plans must be executable prompts with:</p>
              <ul>
                <li>Frontmatter (wave, depends_on, files_modified, autonomous)</li>
                <li>Tasks in XML format</li>
                <li>Verification criteria</li>
                <li>must_haves for goal-backward verification</li>
              </ul>
            </XmlBlock>

            <XmlBlock name="quality_gate">
              <p>Before returning PLANNING COMPLETE:</p>
              <ul>
                <li>[ ] PLAN.md files created in phase directory</li>
                <li>[ ] Each plan has valid frontmatter</li>
                <li>[ ] Tasks are specific and actionable</li>
                <li>[ ] Dependencies correctly identified</li>
                <li>[ ] Waves assigned for parallel execution</li>
                <li>[ ] must_haves derived from phase goal</li>
              </ul>
            </XmlBlock>

            <p>◆ Spawning planner agent...</p>

            <SpawnAgent
              agent="gsd-planner"
              readAgentFile={true}
              model={ctx.plannerModel}
              description={`Plan Phase ${ctx.phaseId}`}
              input={{ prompt: "$PLANNING_CONTEXT" }}
              output={agentOutput}
            />

            <ParseAgentStatus.Call
              args={{ output: agentOutput }}
              output={agentStatus}
            />

            <If condition={agentStatus.status === 'CHECKPOINT'}>
              <p><b>Checkpoint reached:</b> {agentStatus.message}</p>
              <p>Planner needs user input to continue.</p>

              <AskUser
                question="Planner reached a checkpoint. How would you like to proceed?"
                header="Checkpoint"
                options={[
                  { value: 'continue', label: 'Continue', description: 'Provide guidance and continue' },
                  { value: 'pause', label: 'Pause', description: 'Save progress and exit' },
                ]}
                output={userChoice}
              />

              <If condition={userChoice === 'pause'}>
                <Return status="CHECKPOINT" message="Planning paused at checkpoint" />
              </If>
            </If>

            <If condition={agentStatus.status === 'INCONCLUSIVE'}>
              <p><b>Planning inconclusive:</b> {agentStatus.message}</p>

              <AskUser
                question="Planning was inconclusive. How would you like to proceed?"
                header="Inconclusive"
                options={[
                  { value: 'context', label: 'Add context', description: 'Provide more details and retry' },
                  { value: 'retry', label: 'Retry', description: 'Try planning again' },
                  { value: 'manual', label: 'Manual', description: 'Create plans manually' },
                ]}
                output={userChoice}
              />

              <If condition={userChoice === 'manual'}>
                <p>Create plans manually in {ctx.phaseDir}/, then run /gsd:execute-phase {ctx.phaseId}</p>
                <Return status="CHECKPOINT" message="Manual planning requested" />
              </If>
              <If condition={userChoice === 'context'}>
                <p>Please provide additional context, then run /gsd:plan-phase {ctx.phaseId} again.</p>
                <Return status="CHECKPOINT" message="Waiting for user context" />
              </If>
            </If>

            <Else>
              <p>Planner completed. Plans created in {ctx.phaseDir}/</p>
            </Else>

            {/* ============================================================ */}
            {/* STEP 5: Verification Loop */}
            {/* ============================================================ */}

            <h2>Step 5: Verification Loop</h2>

            <If condition={ctx.flags.skipVerify}>
              <p>Verification skipped (--skip-verify flag)</p>
            </If>
            <Else>
              <If condition={!ctx.config.workflowPlanCheck}>
                <p>Verification disabled in config (workflow.plan_check: false)</p>
              </If>
              <Else>
                <pre>{`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► VERIFYING PLANS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`}</pre>

                <Loop max={3} counter={iteration}>
                  <p>◆ Iteration {iteration}/3: Gathering verification context...</p>

                  <GatherContext>
                    <ReadFile path={`${ctx.phaseDir}/*-PLAN.md`} as="PLANS_CONTENT" />
                    <ReadFile path=".planning/REQUIREMENTS.md" as="REQUIREMENTS_CONTENT" optional />
                    <ReadFile path=".planning/ROADMAP.md" as="ROADMAP_CONTENT" />
                  </GatherContext>

                  <ComposeContext name="verification_context">
                    <Preamble>Verify plans fully cover the phase goal and requirements.</Preamble>
                    <Markdown>**Phase:** {ctx.phaseId}</Markdown>
                    <Markdown>**Plans to verify:** $PLANS_CONTENT</Markdown>
                    <Markdown>**Requirements:** $REQUIREMENTS_CONTENT</Markdown>
                  </ComposeContext>

                  <XmlBlock name="expected_output">
                    <p>Return one of:</p>
                    <ul>
                      <li>## VERIFICATION PASSED — all checks pass</li>
                      <li>## ISSUES FOUND — structured issue list</li>
                    </ul>
                  </XmlBlock>

                  <p>◆ Spawning plan checker...</p>

                  <SpawnAgent
                    agent="gsd-plan-checker"
                    readAgentFile={true}
                    model={ctx.checkerModel}
                    description={`Verify Phase ${ctx.phaseId} plans`}
                    input={{ prompt: "$VERIFICATION_CONTEXT" }}
                    output={agentOutput}
                  />

                  <ParseAgentStatus.Call
                    args={{ output: agentOutput }}
                    output={agentStatus}
                  />

                  <If condition={agentStatus.status === 'PASSED'}>
                    <p>✓ Plans verified. Ready for execution.</p>
                    <Break message="Verification passed" />
                  </If>

                  <If condition={agentStatus.status === 'ISSUES_FOUND'}>
                    <p>Checker found issues:</p>
                    <pre>{agentStatus.issues}</pre>

                    <If condition={iteration >= 3}>
                      <p><b>Max iterations reached.</b> {agentStatus.issues.length} issue(s) remain.</p>

                      <AskUser
                        question="Max verification iterations reached. How would you like to proceed?"
                        header="Max Iterations"
                        options={[
                          { value: 'force', label: 'Force proceed', description: 'Execute despite issues' },
                          { value: 'guidance', label: 'Provide guidance', description: 'Add context and retry' },
                          { value: 'abandon', label: 'Abandon', description: 'Exit planning' },
                        ]}
                        output={userChoice}
                      />

                      <If condition={userChoice === 'abandon'}>
                        <Return status="ERROR" message="Verification failed after max iterations" />
                      </If>
                      <If condition={userChoice === 'force'}>
                        <p>Proceeding with issues. Consider fixing manually.</p>
                        <Break message="User forced proceed" />
                      </If>
                    </If>
                    <Else>
                      <p>Sending back to planner for revision... (iteration {iteration}/3)</p>

                      <GatherContext>
                        <ReadFile path={`${ctx.phaseDir}/*-PLAN.md`} as="CURRENT_PLANS" />
                      </GatherContext>

                      <ComposeContext name="revision_context">
                        <Preamble>Make targeted updates to address checker issues. Do NOT replan from scratch.</Preamble>
                        <Markdown>**Phase:** {ctx.phaseId}</Markdown>
                        <Markdown>**Mode:** revision</Markdown>
                        <Markdown>**Existing plans:** $CURRENT_PLANS</Markdown>
                        <Markdown>**Checker issues:** {agentStatus.issues}</Markdown>
                      </ComposeContext>

                      <SpawnAgent
                        agent="gsd-planner"
                        readAgentFile={true}
                        model={ctx.plannerModel}
                        description={`Revise Phase ${ctx.phaseId} plans`}
                        input={{ prompt: "$REVISION_CONTEXT" }}
                        output={agentOutput}
                      />

                      <p>Plans revised. Re-checking...</p>
                    </Else>
                  </If>
                </Loop>
              </Else>
            </Else>

            {/* ============================================================ */}
            {/* STEP 6: Present Final Status */}
            {/* ============================================================ */}

            <h2>Step 6: Present Final Status</h2>

            <p>Route to <code>&lt;offer_next&gt;</code>.</p>

          </XmlBlock>

          <XmlBlock name="offer_next">
            <p>Output this markdown directly (not as a code block):</p>
            <pre>{`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE ${ctx.phaseId} PLANNED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`}</pre>
            <Markdown>**Phase {ctx.phaseId}: {ctx.phaseName}** — {'{N}'} plan(s) in {'{M}'} wave(s)</Markdown>
            <Table
              headers={["Wave", "Plans", "What it builds"]}
              rows={[
                ["1", "01, 02", "[objectives]"],
                ["2", "03", "[objective]"],
              ]}
            />
            <Markdown>Research: {'{Completed | Used existing | Skipped}'}</Markdown>
            <Markdown>Verification: {'{Passed | Passed with override | Skipped}'}</Markdown>
            <pre>───────────────────────────────────────────────────────────────</pre>
            <h2>▶ Next Up</h2>
            <Markdown>**Execute Phase {ctx.phaseId}** — run all {'{N}'} plans</Markdown>
            <Markdown>/gsd:execute-phase {ctx.phaseId}</Markdown>
            <p>{`<sub>`}/clear first → fresh context window{`</sub>`}</p>
            <pre>───────────────────────────────────────────────────────────────</pre>
            <p><b>Also available:</b></p>
            <ul>
              <li>cat {ctx.phaseDir}/*-PLAN.md — review plans</li>
              <li>/gsd:plan-phase {ctx.phaseId} --research — re-research first</li>
            </ul>
            <pre>───────────────────────────────────────────────────────────────</pre>
          </XmlBlock>

          <XmlBlock name="success_criteria">
            <p>- Init runtime: environment validated, arguments parsed, phase resolved, directory created</p>
            <p>- Research: gsd-phase-researcher spawned if needed (unless --skip-research, --gaps, or exists)</p>
            <p>- Existing plans: user consulted if plans exist (continue/view/replan)</p>
            <p>- Planner: gsd-planner spawned with runtime-built prompt (handles COMPLETE/CHECKPOINT/INCONCLUSIVE)</p>
            <p>- Verification: gsd-plan-checker in loop (unless --skip-verify or config disabled)</p>
            <p>- Revision: planner re-spawned with issues if checker finds problems (max 3 iterations)</p>
            <p>- Summary: user sees status and next steps</p>
          </XmlBlock>
        </>
      );
    }}
  </Command>
);
