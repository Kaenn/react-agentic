/**
 * plan-phase.tsx - Prototype TSX for GSD plan-phase command
 *
 * This file demonstrates the hybrid runtime approach where:
 * - Deterministic logic lives in <Script> blocks (compiled to runtime.js)
 * - AI reasoning stays in markdown (SpawnAgent, user interaction)
 *
 * NOTE: This is a prototype for format validation, not a working implementation.
 */

import {
  registerCommand,
  useScriptVar,
  Script,
  If,
  Else,
  Loop,
  Break,
  Return,
  Markdown,
  SpawnAgent,
  AskUser,
  XmlBlock,
} from 'react-agentic';

// ============================================================================
// Type Definitions (compile-time only, not emitted)
// ============================================================================

interface PlanPhaseContext {
  phaseId: string;
  phaseDir: string;
  phaseName: string;
  phaseDescription: string;
  hasResearch: boolean;
  hasPlans: boolean;
  planCount: number;
  modelProfile: 'quality' | 'balanced' | 'budget';
  models: {
    researcher: 'opus' | 'sonnet' | 'haiku';
    planner: 'opus' | 'sonnet' | 'haiku';
    checker: 'opus' | 'sonnet' | 'haiku';
  };
  flags: {
    research: boolean;
    skipResearch: boolean;
    gaps: boolean;
    skipVerify: boolean;
  };
  config: {
    workflowResearch: boolean;
    workflowPlanCheck: boolean;
  };
  error?: string;
}

interface ResearchContext {
  phaseDescription: string;
  requirements: string | null;
  decisions: string | null;
  phaseContext: string | null;
}

interface PlanningContext {
  state: string;
  roadmap: string;
  requirements: string | null;
  research: string | null;
  context: string | null;
  verification: string | null;
  uat: string | null;
}

interface AgentResult {
  status: 'COMPLETE' | 'CHECKPOINT' | 'BLOCKED' | 'INCONCLUSIVE';
  message?: string;
  issues?: string[];
}

interface CheckerResult {
  passed: boolean;
  issues: Array<{
    severity: 'error' | 'warning';
    message: string;
    location?: string;
  }>;
}

interface PlanSummary {
  planCount: number;
  waveCount: number;
  waves: Array<{
    wave: number;
    plans: string[];
    objective: string;
  }>;
  researchStatus: 'completed' | 'existing' | 'skipped';
  verificationStatus: 'passed' | 'override' | 'skipped';
}

// ============================================================================
// Command Registration
// ============================================================================

registerCommand({
  name: 'gsd:plan-phase',
  description: 'Create detailed execution plan for a phase (PLAN.md) with verification loop',
  argumentHint: '[phase] [--research] [--skip-research] [--gaps] [--skip-verify]',
  agent: 'gsd-planner',
  allowedTools: ['Read', 'Write', 'Bash', 'Glob', 'Grep', 'Task', 'WebFetch', 'mcp__context7__*'],
}, (frontmatter) => {

  // ===========================================================================
  // Variable Declarations
  // ===========================================================================

  const ctx = useScriptVar<PlanPhaseContext>('ctx');
  const researchCtx = useScriptVar<ResearchContext>('researchCtx');
  const planningCtx = useScriptVar<PlanningContext>('planningCtx');
  const researcherResult = useScriptVar<AgentResult>('researcherResult');
  const plannerResult = useScriptVar<AgentResult>('plannerResult');
  const checkerResult = useScriptVar<CheckerResult>('checkerResult');
  const revisionCtx = useScriptVar<string>('revisionCtx');
  const summary = useScriptVar<PlanSummary>('summary');
  const summaryMarkdown = useScriptVar<string>('summaryMarkdown');
  const iteration = useScriptVar<number>('iteration');
  const planChoice = useScriptVar<string>('planChoice');
  const blockerChoice = useScriptVar<string>('blockerChoice');
  const maxIterChoice = useScriptVar<string>('maxIterChoice');

  return (
    <>
      {/* =====================================================================
          EXECUTION CONTEXT
          ===================================================================== */}

      <XmlBlock name="execution_context">
        @/Users/glenninizan/.claude/get-shit-done/references/ui-brand.md
      </XmlBlock>

      {/* =====================================================================
          STEP 1: Initialize - All deterministic work in TypeScript

          TS handles:
          - Environment validation (.planning/ exists)
          - Argument parsing ($ARGUMENTS)
          - Phase normalization (8 -> 08, 2.1 -> 02.1)
          - Config reading (model profile, workflow settings)
          - File existence checks (research, plans)
          - Model resolution based on profile
          ===================================================================== */}

      <Script
        fn="init"
        args={{ arguments: "$ARGUMENTS" }}
        output={ctx}
      />

      <If condition={ctx.error}>
        <Markdown>
          ## Error

          {ctx.error}

          If `.planning/` not found, run `/gsd:new-project` first.
        </Markdown>
        <Return />
      </If>

      {/* =====================================================================
          STEP 2: Handle Research Phase

          Skip if:
          - --skip-research flag
          - --gaps flag (gap closure mode)
          - Research already exists AND --research not forced
          - config.workflow.research is false
          ===================================================================== */}

      <If condition={!ctx.flags.skipResearch && !ctx.flags.gaps && ctx.config.workflowResearch}>

        <If condition={ctx.hasResearch && !ctx.flags.research}>
          <Markdown>
            Using existing research: `{ctx.phaseDir}/{ctx.phaseId}-RESEARCH.md`
          </Markdown>
        </If>

        <If condition={!ctx.hasResearch || ctx.flags.research}>
          <Markdown>
            ```
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
             GSD ► RESEARCHING PHASE {ctx.phaseId}
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

            ◆ Spawning researcher...
            ```
          </Markdown>

          {/* TS prepares research context from files */}
          <Script
            fn="getResearchContext"
            args={{
              phaseId: ctx.phaseId,
              phaseDir: ctx.phaseDir
            }}
            output={researchCtx}
          />

          <SpawnAgent
            type="gsd-phase-researcher"
            model={ctx.models.researcher}
            description={`Research Phase ${ctx.phaseId}`}
            input={{
              objective: `Research how to implement Phase ${ctx.phaseId}: ${ctx.phaseName}`,
              phaseDescription: researchCtx.phaseDescription,
              requirements: researchCtx.requirements,
              decisions: researchCtx.decisions,
              phaseContext: researchCtx.phaseContext,
              outputPath: `${ctx.phaseDir}/${ctx.phaseId}-RESEARCH.md`,
            }}
            output={researcherResult}
          />

          {/* Handle researcher return */}
          <If condition={researcherResult.status === 'BLOCKED'}>
            <Markdown>
              ## Research Blocked

              {researcherResult.message}
            </Markdown>

            <AskUser
              question="How would you like to proceed?"
              options={[
                { value: 'context', label: 'Provide more context' },
                { value: 'skip', label: 'Skip research and plan anyway' },
                { value: 'abort', label: 'Abort' },
              ]}
              output={blockerChoice}
            />

            <If condition={blockerChoice === 'abort'}>
              <Return />
            </If>
          </If>

          <If condition={researcherResult.status === 'COMPLETE'}>
            <Markdown>
              Research complete. Proceeding to planning...
            </Markdown>
          </If>
        </If>
      </If>

      {/* =====================================================================
          STEP 3: Check Existing Plans
          ===================================================================== */}

      <If condition={ctx.hasPlans}>
        <AskUser
          question={`Found ${ctx.planCount} existing plan(s). What would you like to do?`}
          options={[
            { value: 'continue', label: 'Continue planning (add more plans)' },
            { value: 'view', label: 'View existing plans' },
            { value: 'replan', label: 'Replan from scratch' },
          ]}
          output={planChoice}
        />

        <If condition={planChoice === 'view'}>
          <Script fn="readAndDisplayPlans" args={{ phaseDir: ctx.phaseDir }} />
          <Return />
        </If>

        <If condition={planChoice === 'replan'}>
          <Script fn="archiveExistingPlans" args={{ phaseDir: ctx.phaseDir }} />
        </If>
      </If>

      {/* =====================================================================
          STEP 4: Planning Phase - AI Work with TS-prepared context
          ===================================================================== */}

      <Markdown>
        ```
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         GSD ► PLANNING PHASE {ctx.phaseId}
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        ◆ Spawning planner...
        ```
      </Markdown>

      {/* TS aggregates all context files into single JSON blob */}
      <Script
        fn="getPlanningContext"
        args={{
          phaseDir: ctx.phaseDir,
          phaseId: ctx.phaseId,
          gaps: ctx.flags.gaps,
        }}
        output={planningCtx}
      />

      <SpawnAgent
        type="gsd-planner"
        model={ctx.models.planner}
        description={`Plan Phase ${ctx.phaseId}`}
        input={{
          phase: ctx.phaseId,
          mode: ctx.flags.gaps ? 'gap_closure' : 'standard',
          state: planningCtx.state,
          roadmap: planningCtx.roadmap,
          requirements: planningCtx.requirements,
          research: planningCtx.research,
          context: planningCtx.context,
          verification: planningCtx.verification,
          uat: planningCtx.uat,
          outputDir: ctx.phaseDir,
        }}
        output={plannerResult}
      />

      {/* Handle planner checkpoint */}
      <If condition={plannerResult.status === 'CHECKPOINT'}>
        <Markdown>
          ## Checkpoint Reached

          {plannerResult.message}

          Please provide guidance to continue planning.
        </Markdown>
        {/* User responds, then we'd spawn continuation - simplified here */}
      </If>

      <If condition={plannerResult.status === 'INCONCLUSIVE'}>
        <Markdown>
          ## Planning Inconclusive

          {plannerResult.message}
        </Markdown>

        <AskUser
          question="How would you like to proceed?"
          options={[
            { value: 'context', label: 'Add more context' },
            { value: 'retry', label: 'Retry planning' },
            { value: 'manual', label: 'Plan manually' },
          ]}
          output={blockerChoice}
        />
        <Return />
      </If>

      {/* =====================================================================
          STEP 5: Verification Loop - Mixed TS/AI

          Only runs if:
          - Planner completed successfully
          - --skip-verify not set
          - config.workflow.plan_check is true
          ===================================================================== */}

      <If condition={plannerResult.status === 'COMPLETE' && !ctx.flags.skipVerify && ctx.config.workflowPlanCheck}>

        <Script fn="initIteration" output={iteration} />

        <Loop max={3} var={iteration}>
          <Markdown>
            ```
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
             GSD ► VERIFYING PLANS (iteration {iteration}/3)
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

            ◆ Spawning plan checker...
            ```
          </Markdown>

          {/* TS reads plans and prepares verification context */}
          <Script
            fn="getVerificationContext"
            args={{
              phaseDir: ctx.phaseDir,
              phaseId: ctx.phaseId,
            }}
            output={planningCtx}
          />

          <SpawnAgent
            type="gsd-plan-checker"
            model={ctx.models.checker}
            description={`Verify Phase ${ctx.phaseId} plans`}
            input={{
              phase: ctx.phaseId,
              phaseGoal: ctx.phaseDescription,
              plans: planningCtx.state, // Reusing field for plans content
              requirements: planningCtx.requirements,
            }}
            output={checkerResult}
          />

          <If condition={checkerResult.passed}>
            <Markdown>
              Plans verified. Ready for execution.
            </Markdown>
            <Break />
          </If>

          <If condition={!checkerResult.passed}>
            <Markdown>
              ## Issues Found

              The plan checker identified the following issues:
            </Markdown>

            {/* TS formats issues for display and prepares revision context */}
            <Script
              fn="prepareRevisionContext"
              args={{
                issues: checkerResult.issues,
                phaseDir: ctx.phaseDir,
              }}
              output={revisionCtx}
            />

            <Markdown>
              Sending back to planner for revision...
            </Markdown>

            <SpawnAgent
              type="gsd-planner"
              model={ctx.models.planner}
              description={`Revise Phase ${ctx.phaseId} plans`}
              input={{
                phase: ctx.phaseId,
                mode: 'revision',
                existingPlans: revisionCtx,
                issues: checkerResult.issues,
              }}
              output={plannerResult}
            />
          </If>
        </Loop>

        {/* Handle max iterations reached */}
        <If condition={iteration >= 3 && !checkerResult.passed}>
          <Markdown>
            ## Max Iterations Reached

            After 3 revision cycles, the following issues remain:
          </Markdown>

          <Script fn="formatRemainingIssues" args={{ issues: checkerResult.issues }} />

          <AskUser
            question="How would you like to proceed?"
            options={[
              { value: 'force', label: 'Force proceed (execute despite issues)' },
              { value: 'guidance', label: 'Provide guidance and retry' },
              { value: 'abandon', label: 'Abandon planning' },
            ]}
            output={maxIterChoice}
          />

          <If condition={maxIterChoice === 'abandon'}>
            <Return />
          </If>
        </If>
      </If>

      {/* =====================================================================
          STEP 6: Present Final Status

          TS generates the summary markdown from plan files
          ===================================================================== */}

      <Script
        fn="generateSummary"
        args={{
          ctx: ctx,
          checkerPassed: checkerResult.passed,
          skipVerify: ctx.flags.skipVerify,
          hasResearch: ctx.hasResearch,
          forcedResearch: ctx.flags.research,
          skippedResearch: ctx.flags.skipResearch,
        }}
        output={summary}
      />

      <Script
        fn="formatSummaryMarkdown"
        args={{ summary: summary, ctx: ctx }}
        output={summaryMarkdown}
      />

      {/* Output the TS-generated summary markdown */}
      <Markdown>
        {summaryMarkdown}
      </Markdown>

      {/* =====================================================================
          OFFER NEXT STEPS
          ===================================================================== */}

      <XmlBlock name="offer_next">
        <Markdown>
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           GSD ► PHASE {ctx.phaseId} PLANNED ✓
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

          **Phase {ctx.phaseId}: {ctx.phaseName}** — {summary.planCount} plan(s) in {summary.waveCount} wave(s)

          | Wave | Plans | What it builds |
          |------|-------|----------------|
          {/* TS would generate these rows */}

          Research: {summary.researchStatus}
          Verification: {summary.verificationStatus}

          ───────────────────────────────────────────────────────────────

          ## ▶ Next Up

          **Execute Phase {ctx.phaseId}** — run all {summary.planCount} plans

          `/gsd:execute-phase {ctx.phaseId}`

          _/clear first → fresh context window_

          ───────────────────────────────────────────────────────────────

          **Also available:**
          - `cat {ctx.phaseDir}/*-PLAN.md` — review plans
          - `/gsd:plan-phase {ctx.phaseId} --research` — re-research first

          ───────────────────────────────────────────────────────────────
        </Markdown>
      </XmlBlock>
    </>
  );
});
