---
name: 'gsd:plan-phase'
description: >-
  Create detailed execution plans for project roadmap phases with integrated
  research and verification loops
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Task
  - TodoWrite
---

<objective>
Create a detailed execution plan (PLAN.md) for a specific phase from the project roadmap. Orchestrates research → planning → verification to produce actionable, verified plans.
</objective>

<arguments>
```
gsd:plan-phase [phase] [--research] [--skip-research] [--gaps] [--skip-verify]

Arguments:
  phase           Phase number to plan (e.g., "8", "2.1", "12")
                  Auto-normalizes: "8" → "08", preserves decimals

Flags:
  --research      Force fresh research even if RESEARCH.md exists
  --skip-research Skip research phase entirely
  --gaps          Plan only uncompleted tasks from existing plan
  --skip-verify   Skip plan verification loop
```
</arguments>

<context>
```
@.planning/STATE.md
@.planning/ROADMAP.md
```
</context>

<process>
### Step 1: Environment Validation

Confirm `.planning/` directory exists with required files:

```bash
if [ ! -d .planning ] || [ ! -f .planning/ROADMAP.md ]; then
  echo "ERROR: No active GSD project found."
  echo "Run /gsd:new-project first."
  exit 1
fi
```

### Step 2: Argument Parsing

Parse and normalize the phase number:

- Single digit → zero-padded: `8` → `08`
- Decimal phases preserved: `2.1` → `02.1`
- Extract flags: `--research`, `--skip-research`, `--gaps`, `--skip-verify`

```bash
# Parse phase number from arguments
phase_raw="$1"
shift

# Normalize phase number (zero-pad single digits, preserve decimals)
if [[ "$phase_raw" =~ ^[0-9]$ ]]; then
  phase="0${phase_raw}"
elif [[ "$phase_raw" =~ ^[0-9]\.[0-9]+$ ]]; then
  phase="0${phase_raw}"
else
  phase="$phase_raw"
fi

# Parse flags
force_research=false
skip_research=false
gaps_only=false
skip_verify=false

for arg in "$@"; do
  case "$arg" in
    --research) force_research=true ;;
    --skip-research) skip_research=true ;;
    --gaps) gaps_only=true ;;
    --skip-verify) skip_verify=true ;;
  esac
done
```

### Step 3: Phase Validation

Verify the phase exists in ROADMAP.md:

```bash
# Check phase exists in roadmap
if ! grep -q "^## Phase ${phase}:" .planning/ROADMAP.md; then
  echo "ERROR: Phase ${phase} not found in ROADMAP.md"
  exit 1
fi

# Create phase directory if needed
PHASE_DIR=".planning/phases/${phase}"
mkdir -p "$PHASE_DIR"
```

### Step 4: Research Phase

Spawn researcher unless skipped or existing research found:

```
RESEARCH_FILE="${PHASE_DIR}/RESEARCH.md"

# Determine if research needed
need_research=true
if [ "$skip_research" = true ]; then
  need_research=false
  echo "Skipping research (--skip-research)"
elif [ -f "$RESEARCH_FILE" ] && [ "$force_research" = false ]; then
  need_research=false
  echo "Using existing research: $RESEARCH_FILE"
fi

if [ "$need_research" = true ]; then
  # Spawn gsd-phase-researcher agent
fi
```

Task(
  prompt="
<research_context>
Phase: {phase}
Phase description: {phase_description}
Output: {PHASE_DIR}/RESEARCH.md

Project context:
{STATE_MD_CONTENT}

Roadmap context:
{ROADMAP_PHASE_SECTION}
</research_context>

<constraints>
- Investigate technical domains needed to PLAN this phase well
- Document findings with confidence ratings (HIGH/MEDIUM/LOW)
- Verify Claude's training data against current sources
- Target 5 key areas: stack, patterns, don't-hand-roll, pitfalls, examples
</constraints>

<output>
Write RESEARCH.md to: {PHASE_DIR}/RESEARCH.md
Return: ## RESEARCH COMPLETE with confidence summary
</output>
",
  subagent_type="gsd-phase-researcher",
  model="{researcher_model}",
  description="Research phase {phase} implementation"
)

### Step 5: Planning Phase

Spawn planner with inlined context (@ references don't work across Task boundaries):

Task(
  prompt="
<planning_context>
Phase: {phase}
Phase description: {phase_description}
Gaps only: {gaps_only}

Research findings:
{RESEARCH_MD_CONTENT}

Project state:
{STATE_MD_CONTENT}

Roadmap phase:
{ROADMAP_PHASE_SECTION}
</planning_context>

<constraints>
- Create actionable PLAN.md with YAML frontmatter
- Include wave assignments and dependencies
- Each task must have clear success criteria
- Include \"must_haves\" for backward validation
</constraints>

<output>
Write plan to: {PHASE_DIR}/PLAN.md
Return: ## PLANNING COMPLETE with task count
</output>
",
  subagent_type="gsd-planner",
  model="{planner_model}",
  description="Create execution plan for phase {phase}"
)

### Step 6: Verification Loop

Run plan-checker for up to 3 revision cycles (unless --skip-verify):

```
if [ "$skip_verify" = false ]; then
  iteration=1
  max_iterations=3
  plan_valid=false

  while [ $iteration -le $max_iterations ] && [ "$plan_valid" = false ]; do
    echo "Verification iteration $iteration/$max_iterations"

    # Spawn gsd-plan-checker
    # If checker returns PASS → plan_valid=true
    # If checker returns ISSUES → spawn planner with revisions

    iteration=$((iteration + 1))
  done

  if [ "$plan_valid" = false ]; then
    echo "WARNING: Plan issues remain after $max_iterations iterations"
    echo "Review manually: ${PHASE_DIR}/PLAN.md"
  fi
fi
```

Task(
  prompt="
<validation_context>
Phase: {phase}
Plan: {PLAN_MD_CONTENT}
Research: {RESEARCH_MD_CONTENT}
Iteration: {iteration}/{max_iterations}
</validation_context>

<checklist>
- [ ] Valid YAML frontmatter (wave, dependencies, affected files)
- [ ] All tasks have clear success criteria
- [ ] Tasks are ordered by dependency
- [ ] \"must_haves\" present for backward validation
- [ ] Tasks align with research findings
- [ ] No missing implementation steps
</checklist>

<output>
If all checks pass: Return \"## VERIFICATION PASSED\"
If issues found: Return \"## ISSUES FOUND\" with specific fixes needed
</output>
",
  subagent_type="gsd-plan-checker",
  model="{checker_model}",
  description="Validate plan quality for phase {phase}"
)

### Step 7: Status Presentation

Display results and next steps:

```
echo "---"
echo ""
echo "GSD > PLAN PHASE COMPLETE"
echo ""
echo "Phase ${phase}: ${phase_description}"
echo ""
echo "Research: ${PHASE_DIR}/RESEARCH.md"
echo "Plan: ${PHASE_DIR}/PLAN.md"
echo "Verification: ${verification_status}"
echo ""
echo "---"
echo ""
echo "Next: /gsd:execute-phase ${phase}"
```
</process>

<model_profiles>
| Profile | researcher_model | planner_model | checker_model |
|---------|------------------|---------------|---------------|
| quality | opus | opus | sonnet |
| balanced | sonnet | sonnet | haiku |
| budget | haiku | haiku | haiku |
</model_profiles>

<success_criteria>
- Environment validation passes
- Phase number parsed and normalized
- Phase exists in ROADMAP.md
- RESEARCH.md created (unless skipped)
- PLAN.md created with valid YAML frontmatter
- Plan passes verification (unless skipped)
- STATE.md updated with plan status
</success_criteria>

<error_handling>
| Error | Recovery |
|-------|----------|
| No .planning/ directory | Prompt: Run /gsd:new-project first |
| Phase not in ROADMAP.md | Prompt: Check phase number or add phase |
| Research timeout | Allow retry or --skip-research |
| Verification loop exhausted | Manual review prompt |
</error_handling>
