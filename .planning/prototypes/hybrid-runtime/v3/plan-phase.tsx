/**
 * plan-phase.tsx - V3 with FULL type safety
 *
 * Key difference: TypeScript will now catch:
 * - Wrong args keys/types
 * - Mismatched output ScriptVar types
 * - Missing required props
 */

import {
  Command,
  If,
  Else,
  Loop,
  Break,
  Return,
  SpawnAgent,
  AskUser,
  XmlBlock,
} from 'react-agentic';

import {
  useScriptVar,
  runtimeFn,
  type ScriptVar,
  type ScriptVarProxy,
} from './runtime-fn';

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
} from './plan-phase.runtime';

// Import types for ScriptVar declarations
import type {
  PlanPhaseContext,
  ResearchContext,
  PlanningContext,
  AgentResult,
  CheckerResult,
  PlanSummary,
} from './plan-phase.runtime';

// ============================================================================
// Create typed script components
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
    allowedTools={['Read', 'Write', 'Bash', 'Glob', 'Grep', 'Task', 'WebFetch']}
  >
    {() => {
      // =====================================================================
      // Variable declarations - types MUST match function return types
      // =====================================================================

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
          {/* ===============================================================
              STEP 1: Initialize

              TYPE SAFETY EXAMPLES:

              ✅ Correct - args match init's parameter type
              <Init.Call args={{ arguments: "$ARGUMENTS" }} output={ctx} />

              ❌ Error: Property 'wrong' does not exist in type '{ arguments: string }'
              <Init.Call args={{ wrong: "value" }} output={ctx} />

              ❌ Error: Type 'number' is not assignable to type 'string'
              <Init.Call args={{ arguments: 123 }} output={ctx} />

              ❌ Error: Type 'ScriptVar<string>' is not assignable to 'ScriptVar<PlanPhaseContext>'
              const wrongVar = useScriptVar<string>('wrong');
              <Init.Call args={{ arguments: "$ARGUMENTS" }} output={wrongVar} />
              =============================================================== */}

          <Init.Call
            args={{ arguments: "$ARGUMENTS" }}
            output={ctx}
          />

          <If condition={ctx.error}>
            ## Error

            {ctx.error}

            If `.planning/` not found, run `/gsd:new-project` first.

            <Return />
          </If>

          {/* ===============================================================
              STEP 2: Research Phase
              =============================================================== */}

          <If condition={!ctx.flags.skipResearch && !ctx.flags.gaps && ctx.config.workflowResearch}>
            <If condition={ctx.hasResearch && !ctx.flags.research}>
              Using existing research: `{ctx.phaseDir}/{ctx.phaseId}-RESEARCH.md`
            </If>

            <If condition={!ctx.hasResearch || ctx.flags.research}>
              ```
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
               GSD ► RESEARCHING PHASE {ctx.phaseId}
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              ```

              {/* ✅ Types match: getResearchContext returns ResearchContext */}
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
                    { value: 'skip', label: 'Skip research' },
                    { value: 'abort', label: 'Abort' },
                  ]}
                  output={blockerChoice}
                />

                <If condition={blockerChoice === 'abort'}>
                  <Return />
                </If>
              </If>
            </If>
          </If>

          {/* ===============================================================
              STEP 3: Check Existing Plans
              =============================================================== */}

          <If condition={ctx.hasPlans}>
            <AskUser
              question={`Found ${ctx.planCount} existing plan(s). What would you like to do?`}
              options={[
                { value: 'continue', label: 'Continue planning' },
                { value: 'view', label: 'View existing plans' },
                { value: 'replan', label: 'Replan from scratch' },
              ]}
              output={planChoice}
            />

            <If condition={planChoice === 'view'}>
              {/* ✅ readAndDisplayPlans returns void, no output needed */}
              <ReadAndDisplayPlans.Call args={{ phaseDir: ctx.phaseDir }} />
              <Return />
            </If>

            <If condition={planChoice === 'replan'}>
              {/* ✅ archiveExistingPlans returns void, no output needed */}
              <ArchiveExistingPlans.Call args={{ phaseDir: ctx.phaseDir }} />
            </If>
          </If>

          {/* ===============================================================
              STEP 4: Planning Phase
              =============================================================== */}

          ```
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           GSD ► PLANNING PHASE {ctx.phaseId}
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ```

          {/* ✅ Types match: getPlanningContext returns PlanningContext */}
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

          <If condition={plannerResult.status === 'INCONCLUSIVE'}>
            ## Planning Inconclusive

            {plannerResult.message}
            <Return />
          </If>

          {/* ===============================================================
              STEP 5: Verification Loop
              =============================================================== */}

          <If condition={plannerResult.status === 'COMPLETE' && !ctx.flags.skipVerify}>
            <Loop max={3} counter={iteration}>
              ```
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
               GSD ► VERIFYING PLANS (iteration {iteration}/3)
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
                }}
                output={checkerResult}
              />

              <If condition={checkerResult.passed}>
                Plans verified. Ready for execution.
                <Break />
              <Else>
                {/* ✅ prepareRevisionContext returns string */}
                <PrepareRevisionContext.Call
                  args={{ issues: checkerResult.issues, phaseDir: ctx.phaseDir }}
                  output={revisionCtx}
                />

                Sending back to planner for revision...

                <SpawnAgent
                  type="gsd-planner"
                  model={ctx.models.planner}
                  description={`Revise Phase ${ctx.phaseId} plans`}
                  input={{ mode: 'revision', context: revisionCtx }}
                  output={plannerResult}
                />
              </Else>
              </If>
            </Loop>
          </If>

          {/* ===============================================================
              STEP 6: Final Status
              =============================================================== */}

          {/* ✅ generateSummary returns PlanSummary */}
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

          {/* ✅ formatSummaryMarkdown returns string */}
          <FormatSummaryMarkdown.Call
            args={{ summary, ctx }}
            output={summaryMd}
          />

          {summaryMd}
        </>
      );
    }}
  </Command>
);
