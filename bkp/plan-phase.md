---
name: gsd:plan-phase-ra
description: RA: Create detailed execution plan for a phase (PLAN.md) with verification loop
argument-hint: [phase] [--research] [--skip-research] [--gaps] [--skip-verify]
agent: gsd-planner
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - WebFetch
  - mcp__context7__*
---

<execution_context>
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<objective>
Create executable phase prompts (PLAN.md files) for a roadmap phase with integrated research and verification.

**Default flow:** Research (if needed) → Plan → Verify → Done

**Orchestrator role:** Parse arguments, validate phase, research domain (unless skipped or exists), spawn gsd-planner agent, verify plans with gsd-plan-checker, iterate until plans pass or max iterations reached, present results.

**Why subagents:** Research and planning burn context fast. Verification uses fresh context. User sees the flow between agents in main context.
</objective>

<critical_instructions>
**IMPORTANT:** This command uses a Node.js runtime for complex operations.

**You MUST execute the bash commands shown in code blocks.** Do NOT improvise or read files manually.

The runtime.js file at .claude/runtime/runtime.js handles: argument parsing, file reading, prompt building, and summary generation.

Follow each step sequentially. Run bash commands FIRST, then use the output variables in subsequent steps.
</critical_instructions>

<context>
Phase number: $ARGUMENTS (optional - auto-detects next unplanned phase if not provided)

- `--research` — Force re-research even if RESEARCH.md exists
- `--skip-research` — Skip research entirely, go straight to planning
- `--gaps` — Gap closure mode (reads .planning/VERIFICATION.md, skips research)
- `--skip-verify` — Skip planner → checker verification loop

Normalize phase input in step 2 before any directory lookups.
</context>

<process>
## Step 1: Validate Environment

Initialize context, parse arguments, validate environment:

**Runtime Call**: `planPhase_init`

| Argument | Source |
|----------|--------|
| arguments | "$ARGUMENTS" |

```bash
CTX=$(node .claude/runtime/runtime.js planPhase_init '{"arguments": "$ARGUMENTS"}')
```

**If $CTX.error:**

**Error:** $CTX.error

Run `/gsd:new-project` first if .planning/ directory is missing.

**End command (ERROR)**: Initialization failed

Phase $CTX.phaseId: $CTX.phaseName

Directory: $CTX.phaseDir

Model profile: $CTX.modelProfile

### Model Profile Lookup

| Agent | quality | balanced | budget |
| :--- | :--- | :--- | :--- |
| gsd-phase-researcher | opus | sonnet | haiku |
| gsd-planner | opus | opus | sonnet |
| gsd-plan-checker | sonnet | sonnet | haiku |

Use `$CTX.researcherModel`, `$CTX.plannerModel`, `$CTX.checkerModel` in Task calls below.

## Step 2: Handle Research

**If $CTX.flags.gaps:**

Gap closure mode — skipping research (using .planning/VERIFICATION.md instead)

**Otherwise:**

**If $CTX.flags.skipResearch:**

Research skipped (--skip-research flag). Go to step 3.

**Otherwise:**

**If $CTX.needsResearch:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► RESEARCHING PHASE $CTX.phaseId
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

◆ Gathering research context...

```bash
ROADMAP_CONTENT=$(cat .planning/ROADMAP.md)
```

```bash
REQUIREMENTS_CONTENT=$(cat .planning/REQUIREMENTS.md 2>/dev/null)
```

```bash
STATE_CONTENT=$(cat .planning/STATE.md)
```

```bash
PHASE_CONTEXT=$(cat "$CTX.phaseDir/$CTX.phaseId-CONTEXT.md" 2>/dev/null)
```

<research_context>
> Research how to implement this phase. Answer: "What do I need to know to PLAN this phase well?"

**Phase:** $CTX.phaseId- $CTX.phaseName
**Phase description:** $CTX.phaseDescription
**Requirements:** $REQUIREMENTS_CONTENT
**Prior decisions:** $STATE_CONTENT
**Phase context:** $PHASE_CONTEXT
**Output:** Write to: $CTX.phaseDir/$CTX.phaseId-RESEARCH.md
</research_context>

◆ Spawning researcher agent...

```
Task(
  prompt="First, read .claude/agents/gsd-phase-researcher.md for your role and instructions.\n\n<prompt>
$RESEARCH_CONTEXT
</prompt>",
  subagent_type="gsd-phase-researcher",
  model=$CTX.researcherModel,
  description="Research Phase $CTX.phaseId"
)
```

Store the agent's result in `$AGENT_OUTPUT`.

**Runtime Call**: `planPhase_parseAgentStatus`

| Argument | Source |
|----------|--------|
| output | AGENT_OUTPUT |

```bash
AGENT_STATUS=$(node .claude/runtime/runtime.js planPhase_parseAgentStatus '{"output": $AGENT_OUTPUT}')
```

**If $AGENT_STATUS.status === "BLOCKED":**

**Research blocked:** $AGENT_STATUS.message

Use the AskUserQuestion tool:

- Question: "Research encountered a blocker. How would you like to proceed?"
- Header: "Blocker"
- Options:
  - "Provide more context" (value: "context") - Add information and retry research
  - "Skip research" (value: "skip") - Proceed to planning without research
  - "Abort" (value: "abort") - Exit planning entirely

Store the user's response in `$USER_CHOICE`.

**If $USER_CHOICE === "abort":**

**End command (BLOCKED)**: User aborted due to research blocker

**If $USER_CHOICE === "skip":**

Skipping research, proceeding to planning...

**If $USER_CHOICE === "context":**

Please provide additional context, then run /gsd:plan-phase $CTX.phaseId again.

**End command (CHECKPOINT)**: Waiting for user context

**Otherwise:**

Research complete. Proceeding to planning...

**Otherwise:**

Using existing research: $CTX.phaseDir/$CTX.phaseId-RESEARCH.md

## Step 3: Check Existing Plans

**Runtime Call**: `planPhase_checkExistingPlans`

| Argument | Source |
|----------|--------|
| phaseDir | CTX.phaseDir |

```bash
EXISTING_PLANS=$(node .claude/runtime/runtime.js planPhase_checkExistingPlans '{"phaseDir": $CTX.phaseDir}')
```

**If $EXISTING_PLANS.hasPlans:**

Found $EXISTING_PLANS.planCount existing plan(s):

```
$EXISTING_PLANS.planSummary
```

Use the AskUserQuestion tool:

- Question: "Plans already exist for this phase. What would you like to do?"
- Header: "Existing Plans"
- Options:
  - "Continue planning" (value: "continue") - Add more plans to existing ones
  - "View existing plans" (value: "view") - Display current plans before deciding
  - "Replan from scratch" (value: "replan") - Archive existing and create new plans

Store the user's response in `$USER_CHOICE`.

**If $USER_CHOICE === "view":**

**Runtime Call**: `planPhase_readAndDisplayPlans`

| Argument | Source |
|----------|--------|
| phaseDir | CTX.phaseDir |

```bash
PLANS_DISPLAY=$(node .claude/runtime/runtime.js planPhase_readAndDisplayPlans '{"phaseDir": $CTX.phaseDir}')
```

```
$PLANS_DISPLAY
```

Use the AskUserQuestion tool:

- Question: "After reviewing the plans, how would you like to proceed?"
- Header: "Decision"
- Options:
  - "Continue planning" (value: "continue") - Add more plans
  - "Replan from scratch" (value: "replan") - Archive and recreate
  - "Done" (value: "done") - Plans look good, exit

Store the user's response in `$USER_CHOICE`.

**If $USER_CHOICE === "done":**

Keeping existing plans. Run /gsd:execute-phase $CTX.phaseId when ready.

**End command (SUCCESS)**: Using existing plans

**If $USER_CHOICE === "replan":**

Archiving existing plans...

**Runtime Call**: `planPhase_archiveExistingPlans`

| Argument | Source |
|----------|--------|
| phaseDir | CTX.phaseDir |

```bash
_VOID=$(node .claude/runtime/runtime.js planPhase_archiveExistingPlans '{"phaseDir": $CTX.phaseDir}')
```

Existing plans archived. Starting fresh...

## Step 4: Spawn Planner

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PLANNING PHASE $CTX.phaseId
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

◆ Gathering planning context...

```bash
STATE_CONTENT=$(cat .planning/STATE.md)
```

```bash
ROADMAP_CONTENT=$(cat .planning/ROADMAP.md)
```

```bash
REQUIREMENTS_CONTENT=$(cat .planning/REQUIREMENTS.md 2>/dev/null)
```

```bash
PHASE_CONTEXT=$(cat "$CTX.phaseDir/$CTX.phaseId-CONTEXT.md" 2>/dev/null)
```

```bash
RESEARCH_CONTENT=$(cat "$CTX.phaseDir/$CTX.phaseId-RESEARCH.md" 2>/dev/null)
```

**If $CTX.flags.gaps:**

```bash
VERIFICATION_CONTENT=$(cat "$CTX.phaseDir/$CTX.phaseId-VERIFICATION.md" 2>/dev/null)
```

```bash
UAT_CONTENT=$(cat "$CTX.phaseDir/$CTX.phaseId-UAT.md" 2>/dev/null)
```

<planning_context>
> Create executable PLAN.md files. Output consumed by /gsd:execute-phase.

**Phase:** $CTX.phaseId- $CTX.phaseName


**If $CTX.flags.gaps:**

**Mode:** gap_closure

**Otherwise:**

**Mode:** standard

**Project State:** $STATE_CONTENT
**Roadmap:** $ROADMAP_CONTENT
**Requirements:** $REQUIREMENTS_CONTENT
**Phase Context:** $PHASE_CONTEXT
**Research:** $RESEARCH_CONTENT


**If $CTX.flags.gaps:**

**Gap Closure - VERIFICATION.md:** $VERIFICATION_CONTENT

**Gap Closure - UAT.md:** $UAT_CONTENT
</planning_context>

<downstream_consumer>
Output consumed by /gsd:execute-phase

Plans must be executable prompts with:

- Frontmatter (wave, depends_on, files_modified, autonomous)
- Tasks in XML format
- Verification criteria
- must_haves for goal-backward verification
</downstream_consumer>

<quality_gate>
Before returning PLANNING COMPLETE:

- [ ] PLAN.md files created in phase directory
- [ ] Each plan has valid frontmatter
- [ ] Tasks are specific and actionable
- [ ] Dependencies correctly identified
- [ ] Waves assigned for parallel execution
- [ ] must_haves derived from phase goal
</quality_gate>

◆ Spawning planner agent...

```
Task(
  prompt="First, read .claude/agents/gsd-planner.md for your role and instructions.\n\n<prompt>
$PLANNING_CONTEXT
</prompt>",
  subagent_type="gsd-planner",
  model=$CTX.plannerModel,
  description="Plan Phase $CTX.phaseId"
)
```

Store the agent's result in `$AGENT_OUTPUT`.

**Runtime Call**: `planPhase_parseAgentStatus`

| Argument | Source |
|----------|--------|
| output | AGENT_OUTPUT |

```bash
AGENT_STATUS=$(node .claude/runtime/runtime.js planPhase_parseAgentStatus '{"output": $AGENT_OUTPUT}')
```

**If $AGENT_STATUS.status === "CHECKPOINT":**

**Checkpoint reached:** $AGENT_STATUS.message

Planner needs user input to continue.

Use the AskUserQuestion tool:

- Question: "Planner reached a checkpoint. How would you like to proceed?"
- Header: "Checkpoint"
- Options:
  - "Continue" (value: "continue") - Provide guidance and continue
  - "Pause" (value: "pause") - Save progress and exit

Store the user's response in `$USER_CHOICE`.

**If $USER_CHOICE === "pause":**

**End command (CHECKPOINT)**: Planning paused at checkpoint

**If $AGENT_STATUS.status === "INCONCLUSIVE":**

**Planning inconclusive:** $AGENT_STATUS.message

Use the AskUserQuestion tool:

- Question: "Planning was inconclusive. How would you like to proceed?"
- Header: "Inconclusive"
- Options:
  - "Add context" (value: "context") - Provide more details and retry
  - "Retry" (value: "retry") - Try planning again
  - "Manual" (value: "manual") - Create plans manually

Store the user's response in `$USER_CHOICE`.

**If $USER_CHOICE === "manual":**

Create plans manually in $CTX.phaseDir/, then run /gsd:execute-phase $CTX.phaseId

**End command (CHECKPOINT)**: Manual planning requested

**If $USER_CHOICE === "context":**

Please provide additional context, then run /gsd:plan-phase $CTX.phaseId again.

**End command (CHECKPOINT)**: Waiting for user context

**Otherwise:**

Planner completed. Plans created in $CTX.phaseDir/

## Step 5: Verification Loop

**If $CTX.flags.skipVerify:**

Verification skipped (--skip-verify flag)

**Otherwise:**

**If !$CTX.config.workflowPlanCheck:**

Verification disabled in config (workflow.plan_check: false)

**Otherwise:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► VERIFYING PLANS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Loop up to 3 times (counter: $ITERATION):**

◆ Iteration $ITERATION/3: Gathering verification context...

```bash
PLANS_CONTENT=$(cat "$CTX.phaseDir"/*-PLAN.md)
```

```bash
REQUIREMENTS_CONTENT=$(cat .planning/REQUIREMENTS.md 2>/dev/null)
```

```bash
ROADMAP_CONTENT=$(cat .planning/ROADMAP.md)
```

<verification_context>
> Verify plans fully cover the phase goal and requirements.

**Phase:** $CTX.phaseId
**Plans to verify:** $PLANS_CONTENT
**Requirements:** $REQUIREMENTS_CONTENT
</verification_context>

<expected_output>
Return one of:

- ## VERIFICATION PASSED — all checks pass
- ## ISSUES FOUND — structured issue list
</expected_output>

◆ Spawning plan checker...

```
Task(
  prompt="First, read .claude/agents/gsd-plan-checker.md for your role and instructions.\n\n<prompt>
$VERIFICATION_CONTEXT
</prompt>",
  subagent_type="gsd-plan-checker",
  model=$CTX.checkerModel,
  description="Verify Phase $CTX.phaseId plans"
)
```

Store the agent's result in `$AGENT_OUTPUT`.

**Runtime Call**: `planPhase_parseAgentStatus`

| Argument | Source |
|----------|--------|
| output | AGENT_OUTPUT |

```bash
AGENT_STATUS=$(node .claude/runtime/runtime.js planPhase_parseAgentStatus '{"output": $AGENT_OUTPUT}')
```

**If $AGENT_STATUS.status === "PASSED":**

✓ Plans verified. Ready for execution.

**Break loop:** Verification passed

**If $AGENT_STATUS.status === "ISSUES_FOUND":**

Checker found issues:

```
$AGENT_STATUS.issues
```

**If $ITERATION >= 3:**

**Max iterations reached.** $AGENT_STATUS.issues.length issue(s) remain.

Use the AskUserQuestion tool:

- Question: "Max verification iterations reached. How would you like to proceed?"
- Header: "Max Iterations"
- Options:
  - "Force proceed" (value: "force") - Execute despite issues
  - "Provide guidance" (value: "guidance") - Add context and retry
  - "Abandon" (value: "abandon") - Exit planning

Store the user's response in `$USER_CHOICE`.

**If $USER_CHOICE === "abandon":**

**End command (ERROR)**: Verification failed after max iterations

**If $USER_CHOICE === "force":**

Proceeding with issues. Consider fixing manually.

**Break loop:** User forced proceed

**Otherwise:**

Sending back to planner for revision... (iteration $ITERATION/3)

```bash
CURRENT_PLANS=$(cat "$CTX.phaseDir"/*-PLAN.md)
```

<revision_context>
> Make targeted updates to address checker issues. Do NOT replan from scratch.

**Phase:** $CTX.phaseId
**Mode:** revision
**Existing plans:** $CURRENT_PLANS
**Checker issues:** $AGENT_STATUS.issues
</revision_context>

```
Task(
  prompt="First, read .claude/agents/gsd-planner.md for your role and instructions.\n\n<prompt>
$REVISION_CONTEXT
</prompt>",
  subagent_type="gsd-planner",
  model=$CTX.plannerModel,
  description="Revise Phase $CTX.phaseId plans"
)
```

Store the agent's result in `$AGENT_OUTPUT`.

Plans revised. Re-checking...

## Step 6: Present Final Status

Route to `&lt;offer_next&gt;`.
</process>

<offer_next>
Output this markdown directly (not as a code block):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE $CTX.phaseId PLANNED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Phase $CTX.phaseId: $CTX.phaseName** — {N}plan(s) in {M}wave(s)


| Wave | Plans | What it builds |
| :--- | :--- | :--- |
| 1 | 01, 02 | [objectives] |
| 2 | 03 | [objective] |

Research: {Completed | Used existing | Skipped}
Verification: {Passed | Passed with override | Skipped}


```
───────────────────────────────────────────────────────────────
```

## ▶ Next Up

**Execute Phase $CTX.phaseId** — run all {N}plans
/gsd:execute-phase $CTX.phaseId


<sub>/clear first → fresh context window</sub>

```
───────────────────────────────────────────────────────────────
```

**Also available:**

- cat /*-PLAN.md — review plans
- /gsd:plan-phase  --research — re-research first

```
───────────────────────────────────────────────────────────────
```
</offer_next>

<success_criteria>
- Init runtime: environment validated, arguments parsed, phase resolved, directory created

- Research: gsd-phase-researcher spawned if needed (unless --skip-research, --gaps, or exists)

- Existing plans: user consulted if plans exist (continue/view/replan)

- Planner: gsd-planner spawned with runtime-built prompt (handles COMPLETE/CHECKPOINT/INCONCLUSIVE)

- Verification: gsd-plan-checker in loop (unless --skip-verify or config disabled)

- Revision: planner re-spawned with issues if checker finds problems (max 3 iterations)

- Summary: user sees status and next steps
</success_criteria>
