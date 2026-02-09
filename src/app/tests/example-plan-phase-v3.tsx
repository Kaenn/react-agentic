/**
 * example-plan-phase-v3.tsx - V3 Showcase Example
 *
 * Demonstrates react-agentic v3.0 primitive/composite architecture by
 * recreating the GSD plan-phase command with modern patterns.
 *
 * Key v3.0 features demonstrated:
 * - Typed RuntimeVar with shell variable syntax ($VAR.path)
 * - runtimeFn for TypeScript-to-runtime function extraction
 * - SpawnAgent with typed input/output AND RuntimeVar props (model, description)
 * - Control flow primitives (If/Else, Loop/Break, Return, AskUser)
 * - Composites with control flow (IfElseBlock with condition prop)
 * - Semantic components (ExecutionContext, XmlBlock)
 * - Structured primitives (Table, List)
 *
 * Original: /Users/glenninizan/workspace/get-shit-done/tsx/commands/gsd/plan-phase.tsx
 */

import {
  // Core primitives
  Command,
  useRuntimeVar,
  runtimeFn,
  SpawnAgent,
  XmlBlock,
  ExecutionContext,
  // Control flow primitives
  If,
  Else,
  Loop,
  Break,
  Return,
  AskUser,
  // Structured primitives
  Table,
  List,
} from '../../jsx.js';

// ============================================================================
// Type Definitions
// ============================================================================

/** Phase flags parsed from $ARGUMENTS */
interface PlanPhaseFlags {
  research: boolean;
  skipResearch: boolean;
  gaps: boolean;
  skipVerify: boolean;
}

/** Agent file paths resolved by init */
interface AgentPaths {
  researcher: string;
  planner: string;
  checker: string;
}

/** Model assignments per agent based on profile */
interface ModelAssignment {
  researcher: 'opus' | 'sonnet' | 'haiku';
  planner: 'opus' | 'sonnet' | 'haiku';
  checker: 'opus' | 'sonnet' | 'haiku';
}

/** Workflow configuration from project settings */
interface WorkflowConfig {
  planCheck: boolean;
}

/** Main context returned by init runtime function */
interface PlanPhaseContext {
  error?: string;
  phaseId: string;
  phaseName: string;
  phaseDir: string;
  phaseDescription: string;
  modelProfile: 'quality' | 'balanced' | 'budget';
  flags: PlanPhaseFlags;
  agentPaths: AgentPaths;
  models: ModelAssignment;
  config: WorkflowConfig;
  needsResearch: boolean;
  hasResearch: boolean;
  hasPlans: boolean;
}

/** Agent status parsed from output */
interface AgentStatus {
  status: 'COMPLETE' | 'BLOCKED' | 'INCONCLUSIVE' | 'CHECKPOINT' | 'PASSED' | 'ISSUES_FOUND';
  message: string;
  issues: string[];
}

/** Existing plans check result */
interface ExistingPlansResult {
  hasPlans: boolean;
  planCount: number;
  planFiles: string[];
  planSummary: string;
}

/** Prompt building result */
interface PromptResult {
  prompt: string;
  contextFiles: string[];
}

/** Final summary data */
interface PlanSummary {
  phaseId: string;
  phaseName: string;
  planCount: number;
  waveCount: number;
  researchStatus: 'completed' | 'existing' | 'skipped';
  verificationStatus: 'passed' | 'override' | 'skipped';
}

// ============================================================================
// Runtime Functions (extracted to .runtime.js at build time)
// ============================================================================

/**
 * Initialize phase planning context
 */
async function init(args: { arguments: string }): Promise<PlanPhaseContext> {
  const fs = await import('fs/promises');

  const argParts = args.arguments.split(/\s+/);
  const flags: PlanPhaseFlags = {
    research: argParts.includes('--research'),
    skipResearch: argParts.includes('--skip-research'),
    gaps: argParts.includes('--gaps'),
    skipVerify: argParts.includes('--skip-verify'),
  };

  const phaseArg = argParts.find(a => !a.startsWith('--') && /^\d+$/.test(a));

  try {
    await fs.stat('.planning');
  } catch {
    return { error: '.planning/ directory not found' } as PlanPhaseContext;
  }

  const roadmap = await fs.readFile('.planning/ROADMAP.md', 'utf-8');
  const phaseMatch = roadmap.match(new RegExp(`### Phase (${phaseArg || '\\d+'}): (.+)`, 'm'));

  if (!phaseMatch) {
    return { error: `Phase ${phaseArg || 'not specified'} not found in roadmap` } as PlanPhaseContext;
  }

  const phaseId = phaseMatch[1];
  const phaseName = phaseMatch[2].trim();
  const phaseDir = `.planning/phases/${phaseId.padStart(2, '0')}-${phaseName.toLowerCase().replace(/\s+/g, '-')}`;

  await fs.mkdir(phaseDir, { recursive: true });

  let hasResearch = false;
  let hasPlans = false;
  try {
    const files = await fs.readdir(phaseDir);
    hasResearch = files.some(f => f.includes('RESEARCH.md'));
    hasPlans = files.some(f => f.includes('PLAN.md'));
  } catch { /* empty */ }

  const needsResearch = !hasResearch && !flags.skipResearch && !flags.gaps || flags.research;
  const modelProfile: 'quality' | 'balanced' | 'budget' = 'balanced';

  // Model assignments based on profile (using lookup for type safety)
  const modelLookup = {
    quality: { researcher: 'opus' as const, planner: 'opus' as const, checker: 'sonnet' as const },
    balanced: { researcher: 'sonnet' as const, planner: 'opus' as const, checker: 'sonnet' as const },
    budget: { researcher: 'haiku' as const, planner: 'sonnet' as const, checker: 'haiku' as const },
  };

  return {
    phaseId,
    phaseName,
    phaseDir,
    phaseDescription: `Phase ${phaseId}: ${phaseName}`,
    modelProfile,
    flags,
    agentPaths: {
      researcher: '~/.claude/agents/gsd-phase-researcher.md',
      planner: '~/.claude/agents/gsd-planner.md',
      checker: '~/.claude/agents/gsd-plan-checker.md',
    },
    models: modelLookup[modelProfile],
    config: { planCheck: true },
    needsResearch,
    hasResearch,
    hasPlans,
  };
}

/**
 * Check for existing plans in phase directory
 */
async function checkExistingPlans(args: { phaseDir: string }): Promise<ExistingPlansResult> {
  const fs = await import('fs/promises');
  const path = await import('path');

  try {
    const files = await fs.readdir(args.phaseDir);
    const planFiles = files.filter(f => f.endsWith('-PLAN.md'));

    if (planFiles.length === 0) {
      return { hasPlans: false, planCount: 0, planFiles: [], planSummary: '' };
    }

    const summaries: string[] = [];
    for (const file of planFiles) {
      const content = await fs.readFile(path.join(args.phaseDir, file), 'utf-8');
      const titleMatch = content.match(/^#\s+(.+)$/m);
      summaries.push(`- ${file}: ${titleMatch?.[1] || 'No title'}`);
    }

    return {
      hasPlans: true,
      planCount: planFiles.length,
      planFiles,
      planSummary: summaries.join('\n'),
    };
  } catch {
    return { hasPlans: false, planCount: 0, planFiles: [], planSummary: '' };
  }
}

/**
 * Build prompt for researcher agent
 */
async function buildResearcherPrompt(args: {
  phaseId: string;
  phaseName: string;
  phaseDir: string;
  phaseDescription: string;
}): Promise<PromptResult> {
  const fs = await import('fs/promises');

  const stateContent = await fs.readFile('.planning/STATE.md', 'utf-8').catch(() => '');
  const roadmapContent = await fs.readFile('.planning/ROADMAP.md', 'utf-8').catch(() => '');

  const prompt = `<objective>
Research how to implement Phase ${args.phaseId}: ${args.phaseName}
Answer: "What do I need to know to PLAN this phase well?"
</objective>

<context>
**Phase description:**
${args.phaseDescription}

**Project State:**
${stateContent}

**Roadmap:**
${roadmapContent}
</context>

<output>
Write research findings to: ${args.phaseDir}/${args.phaseId}-RESEARCH.md
</output>`;

  return { prompt, contextFiles: ['.planning/STATE.md', '.planning/ROADMAP.md'] };
}

/**
 * Build prompt for planner agent
 */
async function buildPlannerPrompt(args: {
  phaseId: string;
  phaseName: string;
  phaseDir: string;
  mode: 'standard' | 'gap_closure' | 'revision';
  issues?: string[];
}): Promise<PromptResult> {
  const fs = await import('fs/promises');

  const stateContent = await fs.readFile('.planning/STATE.md', 'utf-8').catch(() => '');
  const roadmapContent = await fs.readFile('.planning/ROADMAP.md', 'utf-8').catch(() => '');
  const researchContent = await fs.readFile(`${args.phaseDir}/${args.phaseId}-RESEARCH.md`, 'utf-8').catch(() => '');

  let prompt = `<planning_context>
**Phase:** ${args.phaseId}
**Mode:** ${args.mode}

**Project State:**
${stateContent}

**Roadmap:**
${roadmapContent}

**Research (if exists):**
${researchContent}`;

  if (args.mode === 'revision' && args.issues) {
    prompt += `\n**Checker Issues:**\n${args.issues.join('\n')}`;
  }

  prompt += `
</planning_context>

<quality_gate>
- [ ] PLAN.md files created in phase directory
- [ ] Each plan has valid frontmatter
- [ ] Tasks are specific and actionable
</quality_gate>`;

  return { prompt, contextFiles: ['.planning/STATE.md', '.planning/ROADMAP.md'] };
}

/**
 * Build prompt for checker agent
 */
async function buildCheckerPrompt(args: {
  phaseId: string;
  phaseDir: string;
}): Promise<{ prompt: string; phaseGoal: string }> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const files = await fs.readdir(args.phaseDir);
  const planFiles = files.filter(f => f.endsWith('-PLAN.md'));
  const plansContent: string[] = [];

  for (const file of planFiles) {
    const content = await fs.readFile(path.join(args.phaseDir, file), 'utf-8');
    plansContent.push(`--- ${file} ---\n${content}`);
  }

  const roadmap = await fs.readFile('.planning/ROADMAP.md', 'utf-8');
  const goalMatch = roadmap.match(new RegExp(`### Phase ${args.phaseId}[\\s\\S]*?\\*\\*Goal\\*\\*:\\s*(.+)`, 'm'));
  const phaseGoal = goalMatch?.[1] || 'Not specified';

  const prompt = `<verification_context>
**Phase:** ${args.phaseId}
**Phase Goal:** ${phaseGoal}

**Plans to verify:**
${plansContent.join('\n\n')}
</verification_context>

<expected_output>
- ## VERIFICATION PASSED — all checks pass
- ## ISSUES FOUND — structured issue list
</expected_output>`;

  return { prompt, phaseGoal };
}

/**
 * Parse agent output to determine status
 */
async function parseAgentStatus(args: { output: string }): Promise<AgentStatus> {
  const output = args.output;

  if (output.includes('VERIFICATION PASSED')) {
    return { status: 'PASSED', message: 'All checks passed', issues: [] };
  }
  if (output.includes('ISSUES FOUND')) {
    const issueMatches = output.match(/- \[ \].+/g) || [];
    return { status: 'ISSUES_FOUND', message: 'Checker found issues', issues: issueMatches };
  }
  if (output.includes('BLOCKED')) {
    return { status: 'BLOCKED', message: 'Agent blocked', issues: [] };
  }
  if (output.includes('CHECKPOINT')) {
    return { status: 'CHECKPOINT', message: 'Checkpoint reached', issues: [] };
  }
  return { status: 'COMPLETE', message: 'Agent completed', issues: [] };
}

/**
 * Generate final summary
 */
async function generateSummary(args: {
  phaseId: string;
  phaseName: string;
  phaseDir: string;
  researchStatus: 'completed' | 'existing' | 'skipped';
  verificationStatus: 'passed' | 'override' | 'skipped';
}): Promise<PlanSummary> {
  const fs = await import('fs/promises');

  const files = await fs.readdir(args.phaseDir);
  const planFiles = files.filter(f => f.endsWith('-PLAN.md'));
  const waveSet = new Set<number>();

  for (const file of planFiles) {
    const content = await fs.readFile(`${args.phaseDir}/${file}`, 'utf-8');
    const waveMatch = content.match(/^wave:\s*(\d+)/m);
    waveSet.add(waveMatch ? parseInt(waveMatch[1]) : 1);
  }

  return {
    phaseId: args.phaseId,
    phaseName: args.phaseName,
    planCount: planFiles.length,
    waveCount: waveSet.size,
    researchStatus: args.researchStatus,
    verificationStatus: args.verificationStatus,
  };
}

/**
 * Archive existing plans
 */
async function archiveExistingPlans(args: { phaseDir: string }): Promise<string> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const archiveDir = path.join(args.phaseDir, '.archive', new Date().toISOString().split('T')[0]);
  await fs.mkdir(archiveDir, { recursive: true });

  const files = await fs.readdir(args.phaseDir);
  for (const file of files.filter(f => f.endsWith('-PLAN.md'))) {
    await fs.rename(path.join(args.phaseDir, file), path.join(archiveDir, file));
  }

  return `Archived to ${archiveDir}`;
}

// ============================================================================
// Runtime Function Components
// ============================================================================

const Init = runtimeFn(init);
const CheckExistingPlans = runtimeFn(checkExistingPlans);
const BuildResearcherPrompt = runtimeFn(buildResearcherPrompt);
const BuildPlannerPrompt = runtimeFn(buildPlannerPrompt);
const BuildCheckerPrompt = runtimeFn(buildCheckerPrompt);
const ParseAgentStatus = runtimeFn(parseAgentStatus);
const GenerateSummary = runtimeFn(generateSummary);
const ArchiveExistingPlans = runtimeFn(archiveExistingPlans);

// ============================================================================
// Composite Components (demonstrate composites with control flow)
// ============================================================================

/**
 * Composite: ErrorDisplay - demonstrates control flow inside composites
 *
 * This composite passes the condition prop through to If primitive.
 * The transformer must resolve the `condition` prop identifier to the
 * original expression (e.g., ctx.error) for proper jq generation.
 *
 * NOTE: JSX content props (ifContent, elseContent) don't work because
 * JSX can't be extracted as JSON values. Use children instead.
 */
interface ErrorDisplayProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  condition: any; // Accepts RuntimeVar or boolean for control flow
  children: React.ReactNode;
}

const ErrorDisplay = ({ condition, children }: ErrorDisplayProps) => (
  <If condition={condition}>
    <p><b>Error condition detected</b></p>
    {children}
  </If>
);

// ============================================================================
// Command Definition
// ============================================================================

export default (
  <Command
    name="example:plan-phase-v3"
    description="V3 Example: Plan phase with research/verification loop"
    argumentHint="[phase] [--research] [--skip-research] [--gaps] [--skip-verify]"
    agent="gsd-planner"
    allowedTools={["Read", "Write", "Bash", "Glob", "Grep", "Task", "WebFetch", "mcp__context7__*"]}
  >
    {() => {
      // V3 Pattern: Typed RuntimeVar declarations
      // Variables render as $VAR.path.to.prop in markdown
      const ctx = useRuntimeVar<PlanPhaseContext>('CTX');
      const existingPlans = useRuntimeVar<ExistingPlansResult>('EXISTING_PLANS');
      const researcherPrompt = useRuntimeVar<PromptResult>('RESEARCHER_PROMPT');
      const plannerPrompt = useRuntimeVar<PromptResult>('PLANNER_PROMPT');
      const checkerPrompt = useRuntimeVar<{ prompt: string; phaseGoal: string }>('CHECKER_PROMPT');
      const agentOutput = useRuntimeVar<string>('AGENT_OUTPUT');
      const agentStatus = useRuntimeVar<AgentStatus>('AGENT_STATUS');
      const userChoice = useRuntimeVar<string>('USER_CHOICE');
      const iteration = useRuntimeVar<number>('ITERATION');
      const summary = useRuntimeVar<PlanSummary>('SUMMARY');
      const archiveResult = useRuntimeVar<string>('ARCHIVE_RESULT');

      return (
        <>
          {/* V3 Pattern: ExecutionContext for @ file references */}
          <ExecutionContext paths={["~/.claude/get-shit-done/references/ui-brand.md"]} />

          {/* V3 Pattern: XmlBlock for structured sections */}
          <XmlBlock name="objective">
            <p>Create executable phase plans (PLAN.md files) for a roadmap phase with integrated research and verification.</p>
            <p><b>Default flow:</b> Research (if needed) -&gt; Plan -&gt; Verify -&gt; Done</p>
            <p><b>Why subagents:</b> Research and planning burn context fast. Verification uses fresh context.</p>
          </XmlBlock>

          <XmlBlock name="context">
            <p>Phase number: $ARGUMENTS (optional - auto-detects next unplanned phase if not provided)</p>
            <List items={[
              '`--research` - Force re-research even if RESEARCH.md exists',
              '`--skip-research` - Skip research entirely',
              '`--gaps` - Gap closure mode (uses VERIFICATION.md, skips research)',
              '`--skip-verify` - Skip verification loop',
            ]} />
          </XmlBlock>

          <XmlBlock name="process">

            {/* STEP 1: Initialize - V3 Pattern: runtimeFn.Call with typed args/output */}
            <h2>Step 1: Validate Environment</h2>
            <p><i>Parse arguments, validate .planning/ exists, resolve phase</i></p>

            <Init.Call
              args={{ arguments: "$ARGUMENTS" }}
              output={ctx}
            />

            {/* V3 Pattern: ErrorDisplay COMPOSITE - tests composites with control flow (Bug 2 fix) */}
            {/* The condition={ctx.error} is resolved through componentPropExpressions */}
            <ErrorDisplay condition={ctx.error}>
              <p>Run <code>/gsd:new-project</code> first if .planning/ directory is missing.</p>
              <Return status="ERROR" message="Initialization failed" />
            </ErrorDisplay>

            {/* Direct If/Else for success case */}
            <If condition={!ctx.error}>
              <p>Phase {ctx.phaseId}: {ctx.phaseName}</p>
              <p>Directory: {ctx.phaseDir}</p>
              <p>Model profile: {ctx.modelProfile}</p>
            </If>

            {/* V3 Pattern: Table primitive for structured data */}
            <h3>Model Profile Lookup</h3>
            <Table
              headers={["Agent", "quality", "balanced", "budget"]}
              rows={[
                ["gsd-phase-researcher", "opus", "sonnet", "haiku"],
                ["gsd-planner", "opus", "opus", "sonnet"],
                ["gsd-plan-checker", "sonnet", "sonnet", "haiku"],
              ]}
            />

            {/* STEP 2: Research - V3 Pattern: Nested conditionals */}
            <h2>Step 2: Handle Research</h2>
            <p><i>Spawn researcher agent if needed</i></p>

            <If condition={ctx.flags.gaps}>
              <p>Gap closure mode - skipping research (using VERIFICATION.md instead)</p>
            </If>
            <Else>
              <If condition={ctx.flags.skipResearch}>
                <p>Research skipped (--skip-research flag)</p>
              </If>
              <Else>
                <If condition={ctx.needsResearch}>
                  <pre>{`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD > RESEARCHING PHASE ${ctx.phaseId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`}</pre>

                  <BuildResearcherPrompt.Call
                    args={{
                      phaseId: ctx.phaseId,
                      phaseName: ctx.phaseName,
                      phaseDir: ctx.phaseDir,
                      phaseDescription: ctx.phaseDescription,
                    }}
                    output={researcherPrompt}
                  />

                  {/* V3 Pattern: SpawnAgent with RuntimeVar model (Bug 1 fix) */}
                  <SpawnAgent
                    agent="gsd-phase-researcher"
                    loadFromFile={ctx.agentPaths.researcher}
                    model={ctx.models.researcher}
                    description={`Research Phase ${ctx.phaseId}`}
                    input={{ prompt: researcherPrompt.prompt }}
                    output={agentOutput}
                  />

                  <ParseAgentStatus.Call
                    args={{ output: agentOutput }}
                    output={agentStatus}
                  />

                  <If condition={agentStatus.status === 'BLOCKED'}>
                    <p><b>Research blocked:</b> {agentStatus.message}</p>

                    {/* V3 Pattern: AskUser primitive for interactive choices */}
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
                    <If condition={userChoice === 'context'}>
                      <p>Please provide additional context, then run /example:plan-phase-v3 {ctx.phaseId} again.</p>
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

            {/* STEP 3: Check Existing Plans */}
            <h2>Step 3: Check Existing Plans</h2>
            <p><i>Handle existing plans in phase directory</i></p>

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

              <If condition={userChoice === 'done'}>
                <p>Keeping existing plans. Run /gsd:execute-phase {ctx.phaseId} when ready.</p>
                <Return status="SUCCESS" message="Using existing plans" />
              </If>

              <If condition={userChoice === 'replan'}>
                <p>Archiving existing plans...</p>
                <ArchiveExistingPlans.Call args={{ phaseDir: ctx.phaseDir }} output={archiveResult} />
                <p>{archiveResult}</p>
              </If>
            </If>

            {/* STEP 4: Spawn Planner */}
            <h2>Step 4: Spawn Planner</h2>
            <p><i>Create phase plans with gsd-planner agent</i></p>

            <pre>{`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD > PLANNING PHASE ${ctx.phaseId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`}</pre>

            <BuildPlannerPrompt.Call
              args={{
                phaseId: ctx.phaseId,
                phaseName: ctx.phaseName,
                phaseDir: ctx.phaseDir,
                mode: ctx.flags.gaps ? 'gap_closure' : 'standard',
              }}
              output={plannerPrompt}
            />

            <SpawnAgent
              agent="gsd-planner"
              loadFromFile={ctx.agentPaths.planner}
              model={ctx.models.planner}
              description={`Plan Phase ${ctx.phaseId}`}
              input={{ prompt: plannerPrompt.prompt }}
              output={agentOutput}
            />

            <ParseAgentStatus.Call
              args={{ output: agentOutput }}
              output={agentStatus}
            />

            <If condition={agentStatus.status === 'CHECKPOINT'}>
              <p><b>Checkpoint reached:</b> {agentStatus.message}</p>
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
            <Else>
              <p>Planner completed. Plans created in {ctx.phaseDir}/</p>
            </Else>

            {/* STEP 5: Verification Loop - V3 Pattern: Loop/Break with iteration counter */}
            <h2>Step 5: Verification Loop</h2>
            <p><i>Verify plans with gsd-plan-checker</i></p>

            <If condition={ctx.flags.skipVerify}>
              <p>Verification skipped (--skip-verify flag)</p>
            </If>
            <Else>
              <If condition={!ctx.config.planCheck}>
                <p>Verification disabled in config (workflow.plan_check: false)</p>
              </If>
              <Else>
                <pre>{`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD > VERIFYING PLANS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`}</pre>

                {/* V3 Pattern: Loop with counter variable */}
                <Loop max={4} counter={iteration}>
                  <p>Iteration {iteration}/3: Spawning plan checker...</p>

                  <BuildCheckerPrompt.Call
                    args={{ phaseId: ctx.phaseId, phaseDir: ctx.phaseDir }}
                    output={checkerPrompt}
                  />

                  <SpawnAgent
                    agent="gsd-plan-checker"
                    model={ctx.models.checker}
                    description={`Verify Phase ${ctx.phaseId} plans`}
                    input={{ prompt: checkerPrompt.prompt }}
                    output={agentOutput}
                  />

                  <ParseAgentStatus.Call
                    args={{ output: agentOutput }}
                    output={agentStatus}
                  />

                  {/* V3 Pattern: Break on success */}
                  <If condition={agentStatus.status === 'PASSED'}>
                    <p>Plans verified. Ready for execution.</p>
                    <Break message="Verification passed" />
                  </If>

                  <If condition={agentStatus.status === 'ISSUES_FOUND'}>
                    <p>Checker found issues:</p>
                    <pre>{agentStatus.issues}</pre>

                    <If condition={iteration >= 3}>
                      <p><b>Max iterations reached.</b> Issues remain.</p>
                      <AskUser
                        question="Max verification iterations reached. How would you like to proceed?"
                        header="Max Iterations"
                        options={[
                          { value: 'force', label: 'Force proceed', description: 'Execute despite issues' },
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

                      <BuildPlannerPrompt.Call
                        args={{
                          phaseId: ctx.phaseId,
                          phaseName: ctx.phaseName,
                          phaseDir: ctx.phaseDir,
                          mode: 'revision',
                          issues: agentStatus.issues,
                        }}
                        output={plannerPrompt}
                      />

                      <SpawnAgent
                        agent="gsd-planner"
                        loadFromFile={ctx.agentPaths.planner}
                        model={ctx.models.planner}
                        description={`Revise Phase ${ctx.phaseId} plans`}
                        input={{ prompt: plannerPrompt.prompt }}
                        output={agentOutput}
                      />

                      <p>Plans revised. Re-checking...</p>
                    </Else>
                  </If>
                </Loop>
              </Else>
            </Else>

            {/* STEP 6: Final Summary */}
            <h2>Step 6: Final Summary</h2>
            <p><i>Generate and display completion summary</i></p>

            <GenerateSummary.Call
              args={{
                phaseId: ctx.phaseId,
                phaseName: ctx.phaseName,
                phaseDir: ctx.phaseDir,
                researchStatus: ctx.needsResearch ? 'completed' : (ctx.hasResearch ? 'existing' : 'skipped'),
                verificationStatus: agentStatus.status === 'PASSED' ? 'passed' : (ctx.flags.skipVerify ? 'skipped' : 'override'),
              }}
              output={summary}
            />

          </XmlBlock>

          {/* V3 Pattern: offer_next section with dynamic values */}
          <XmlBlock name="offer_next">
            <pre>{`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD > PHASE ${summary.phaseId} PLANNED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`}</pre>

            <p><b>Phase {summary.phaseId}: {summary.phaseName}</b> - {summary.planCount} plan(s) in {summary.waveCount} wave(s)</p>
            <p>Research: {summary.researchStatus}</p>
            <p>Verification: {summary.verificationStatus}</p>

            <hr />

            <h2>Next Up</h2>
            <p><b>Execute Phase {summary.phaseId}</b> - run all {summary.planCount} plans</p>
            <p><code>/gsd:execute-phase {summary.phaseId}</code></p>
            <p><i>/clear first - fresh context window</i></p>

            <hr />

            <p><b>Also available:</b></p>
            <List items={[
              `cat ${ctx.phaseDir}/*-PLAN.md - review plans`,
              `/example:plan-phase-v3 ${ctx.phaseId} --research - re-research first`,
            ]} />
          </XmlBlock>

          <XmlBlock name="success_criteria">
            <List items={[
              '[ ] .planning/ directory validated',
              '[ ] Phase validated against roadmap',
              '[ ] Research completed (unless --skip-research, --gaps, or exists)',
              '[ ] gsd-planner spawned with context',
              '[ ] Plans created (PLANNING COMPLETE or CHECKPOINT handled)',
              '[ ] gsd-plan-checker spawned (unless --skip-verify)',
              '[ ] Verification passed OR user override',
              '[ ] User knows next steps',
            ]} />
          </XmlBlock>
        </>
      );
    }}
  </Command>
);
