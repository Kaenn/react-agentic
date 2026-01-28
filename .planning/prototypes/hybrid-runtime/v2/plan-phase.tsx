/**
 * plan-phase.tsx - V2 Prototype
 *
 * Improvements:
 * 1. No <Markdown> wrapper - raw text is implicitly markdown
 * 2. Type-safe scripts via fromRuntime()
 */

import {
  Command,
  useScriptVar,
  runtimeFn,
  If,
  Else,
  Loop,
  Break,
  Return,
  SpawnAgent,
  AskUser,
  XmlBlock,
} from 'react-agentic';

// Import typed functions from runtime
import {
  init,
  getResearchContext,
  getPlanningContext,
  getVerificationContext,
  prepareRevisionContext,
  readAndDisplayPlans,
  archiveExistingPlans,
  generateSummary,
  formatSummaryMarkdown,
  type PlanPhaseContext,
  type ResearchContext,
  type PlanningContext,
  type AgentResult,
  type CheckerResult,
  type PlanSummary,
} from './plan-phase.runtime';

// ============================================================================
// Create typed script components from runtime functions
// ============================================================================

const Init = runtimeFn(init);
const GetResearchContext = runtimeFn(getResearchContext);
const GetPlanningContext = runtimeFn(getPlanningContext);
const GetVerificationContext = runtimeFn(getVerificationContext);
const PrepareRevisionContext = runtimeFn(prepareRevisionContext);
const ReadAndDisplayPlans = runtimeFn(readAndDisplayPlans);
const ArchiveExistingPlans = runtimeFn(archiveExistingPlans);
const GenerateSummary = runtimeFn(generateSummary);
const FormatSummaryMarkdown = runtimeFn(formatSummaryMarkdown);

// ============================================================================
// Command Definition
// ============================================================================

export default (
  <Command
    name="gsd:plan-phase"
    description="Create detailed execution plan for a phase (PLAN.md) with verification loop"
    argumentHint="[phase] [--research] [--skip-research] [--gaps] [--skip-verify]"
    allowedTools={['Read', 'Write', 'Bash', 'Glob', 'Grep', 'Task', 'WebFetch', 'mcp__context7__*']}
  >
    {() => {
      // Variable declarations
      const ctx = useScriptVar<PlanPhaseContext>('ctx');
      const researchCtx = useScriptVar<ResearchContext>('researchCtx');
      const planningCtx = useScriptVar<PlanningContext>('planningCtx');
      const researcherResult = useScriptVar<AgentResult>('researcherResult');
      const plannerResult = useScriptVar<AgentResult>('plannerResult');
      const checkerResult = useScriptVar<CheckerResult>('checkerResult');
      const revisionCtx = useScriptVar<string>('revisionCtx');
      const summary = useScriptVar<PlanSummary>('summary');
      const summaryMd = useScriptVar<string>('summaryMd');
      const iteration = useScriptVar<number>('iteration');
      const planChoice = useScriptVar<string>('planChoice');
      const blockerChoice = useScriptVar<string>('blockerChoice');

      return (
        <>
          <XmlBlock name="execution_context">
            @/Users/glenninizan/.claude/get-shit-done/references/ui-brand.md
          </XmlBlock>

          {/* ═══════════════════════════════════════════════════════════════
              STEP 1: Initialize
              ═══════════════════════════════════════════════════════════════ */}

          <Init.Call args={{ arguments: "$ARGUMENTS" }} output={ctx} />

          <If condition={ctx.error}>
            ## Error

            {ctx.error}

            If `.planning/` not found, run `/gsd:new-project` first.

            <Return />
          </If>

          {/* ═══════════════════════════════════════════════════════════════
              STEP 2: Research Phase
              ═══════════════════════════════════════════════════════════════ */}

          <If condition={!ctx.flags.skipResearch && !ctx.flags.gaps && ctx.config.workflowResearch}>

            <If condition={ctx.hasResearch && !ctx.flags.research}>
              Using existing research: `{ctx.phaseDir}/{ctx.phaseId}-RESEARCH.md`
            </If>

            <If condition={!ctx.hasResearch || ctx.flags.research}>
              ```
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
               GSD ► RESEARCHING PHASE {ctx.phaseId}
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

              ◆ Spawning researcher...
              ```

              <GetResearchContext.Call
                args={{ phaseId: ctx.phaseId, phaseDir: ctx.phaseDir }}
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
                  outputPath: `${ctx.phaseDir}/${ctx.phaseId}-RESEARCH.md`,
                }}
                output={researcherResult}
              />

              <If condition={researcherResult.status === 'BLOCKED'}>
                ## Research Blocked

                {researcherResult.message}

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
                Research complete. Proceeding to planning...
              </If>
            </If>
          </If>

          {/* ═══════════════════════════════════════════════════════════════
              STEP 3: Check Existing Plans
              ═══════════════════════════════════════════════════════════════ */}

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
              <ReadAndDisplayPlans.Call args={{ phaseDir: ctx.phaseDir }} />
              <Return />
            </If>

            <If condition={planChoice === 'replan'}>
              <ArchiveExistingPlans.Call args={{ phaseDir: ctx.phaseDir }} />
            </If>
          </If>

          {/* ═══════════════════════════════════════════════════════════════
              STEP 4: Planning Phase
              ═══════════════════════════════════════════════════════════════ */}

          ```
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           GSD ► PLANNING PHASE {ctx.phaseId}
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

          ◆ Spawning planner...
          ```

          <GetPlanningContext.Call
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
              outputDir: ctx.phaseDir,
            }}
            output={plannerResult}
          />

          <If condition={plannerResult.status === 'CHECKPOINT'}>
            ## Checkpoint Reached

            {plannerResult.message}

            Please provide guidance to continue planning.
          </If>

          <If condition={plannerResult.status === 'INCONCLUSIVE'}>
            ## Planning Inconclusive

            {plannerResult.message}

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

          {/* ═══════════════════════════════════════════════════════════════
              STEP 5: Verification Loop
              ═══════════════════════════════════════════════════════════════ */}

          <If condition={plannerResult.status === 'COMPLETE' && !ctx.flags.skipVerify && ctx.config.workflowPlanCheck}>

            <Loop max={3} counter={iteration}>
              ```
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
               GSD ► VERIFYING PLANS (iteration {iteration}/3)
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

              ◆ Spawning plan checker...
              ```

              <GetVerificationContext.Call
                args={{ phaseDir: ctx.phaseDir, phaseId: ctx.phaseId }}
                output={planningCtx}
              />

              <SpawnAgent
                type="gsd-plan-checker"
                model={ctx.models.checker}
                description={`Verify Phase ${ctx.phaseId} plans`}
                input={{
                  phase: ctx.phaseId,
                  phaseGoal: ctx.phaseDescription,
                  plans: planningCtx.state,
                  requirements: planningCtx.requirements,
                }}
                output={checkerResult}
              />

              <If condition={checkerResult.passed}>
                Plans verified. Ready for execution.
                <Break />
              <Else>
                ## Issues Found

                <PrepareRevisionContext.Call
                  args={{ issues: checkerResult.issues, phaseDir: ctx.phaseDir }}
                  output={revisionCtx}
                />

                Sending back to planner for revision...

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
              </Else>
              </If>
            </Loop>

            <If condition={iteration >= 3 && !checkerResult.passed}>
              ## Max Iterations Reached

              After 3 revision cycles, issues remain. Review the plans manually or force proceed.

              <AskUser
                question="How would you like to proceed?"
                options={[
                  { value: 'force', label: 'Force proceed (execute despite issues)' },
                  { value: 'guidance', label: 'Provide guidance and retry' },
                  { value: 'abandon', label: 'Abandon planning' },
                ]}
                output={blockerChoice}
              />

              <If condition={blockerChoice === 'abandon'}>
                <Return />
              </If>
            </If>
          </If>

          {/* ═══════════════════════════════════════════════════════════════
              STEP 6: Final Status
              ═══════════════════════════════════════════════════════════════ */}

          <GenerateSummary.Call
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

          <FormatSummaryMarkdown.Call
            args={{ summary, ctx }}
            output={summaryMd}
          />

          {/* Output the generated markdown directly */}
          {summaryMd}
        </>
      );
    }}
  </Command>
);
