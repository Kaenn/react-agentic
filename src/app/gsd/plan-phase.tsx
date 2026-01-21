import { Command, Markdown, XmlBlock, SpawnAgent } from '../../jsx.js';

export default function PlanPhaseCommand() {
  return (
    <Command
      name="gsd:plan-phase"
      description="Create detailed execution plans for project roadmap phases with integrated research and verification loops"
      allowedTools={['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Task', 'TodoWrite']}
    >
      <XmlBlock name="objective">
        <p>
          Create a detailed execution plan (PLAN.md) for a specific phase from the project roadmap.
          Orchestrates research → planning → verification to produce actionable, verified plans.
        </p>
      </XmlBlock>

      <XmlBlock name="arguments">
        <Markdown>
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
        </Markdown>
      </XmlBlock>

      <XmlBlock name="context">
        <Markdown>
```
@.planning/STATE.md
@.planning/ROADMAP.md
```
        </Markdown>
      </XmlBlock>

      <XmlBlock name="process">
        <h3>Step 1: Environment Validation</h3>
        <p>Confirm <code>.planning/</code> directory exists with required files:</p>
        <Markdown>
```bash
if [ ! -d .planning ] || [ ! -f .planning/ROADMAP.md ]; then
  echo "ERROR: No active GSD project found."
  echo "Run /gsd:new-project first."
  exit 1
fi
```
        </Markdown>

        <h3>Step 2: Argument Parsing</h3>
        <p>Parse and normalize the phase number:</p>
        <ul>
          <li>Single digit → zero-padded: <code>8</code> → <code>08</code></li>
          <li>Decimal phases preserved: <code>2.1</code> → <code>02.1</code></li>
          <li>Extract flags: <code>--research</code>, <code>--skip-research</code>, <code>--gaps</code>, <code>--skip-verify</code></li>
        </ul>
        <Markdown>
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
        </Markdown>

        <h3>Step 3: Phase Validation</h3>
        <p>Verify the phase exists in ROADMAP.md:</p>
        <Markdown>
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
        </Markdown>

        <h3>Step 4: Research Phase</h3>
        <p>Spawn researcher unless skipped or existing research found:</p>
        <Markdown>
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
        </Markdown>

        <SpawnAgent
          agent="gsd-phase-researcher"
          model="{researcher_model}"
          description="Research phase {phase} implementation"
          prompt={`
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
`}
        />

        <h3>Step 5: Planning Phase</h3>
        <p>Spawn planner with inlined context (@ references don't work across Task boundaries):</p>

        <SpawnAgent
          agent="gsd-planner"
          model="{planner_model}"
          description="Create execution plan for phase {phase}"
          prompt={`
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
- Include "must_haves" for backward validation
</constraints>

<output>
Write plan to: {PHASE_DIR}/PLAN.md
Return: ## PLANNING COMPLETE with task count
</output>
`}
        />

        <h3>Step 6: Verification Loop</h3>
        <p>Run plan-checker for up to 3 revision cycles (unless --skip-verify):</p>
        <Markdown>
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
        </Markdown>

        <SpawnAgent
          agent="gsd-plan-checker"
          model="{checker_model}"
          description="Validate plan quality for phase {phase}"
          prompt={`
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
- [ ] "must_haves" present for backward validation
- [ ] Tasks align with research findings
- [ ] No missing implementation steps
</checklist>

<output>
If all checks pass: Return "## VERIFICATION PASSED"
If issues found: Return "## ISSUES FOUND" with specific fixes needed
</output>
`}
        />

        <h3>Step 7: Status Presentation</h3>
        <p>Display results and next steps:</p>
        <Markdown>
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
        </Markdown>
      </XmlBlock>

      <XmlBlock name="model_profiles">
        <Markdown>
| Profile | researcher_model | planner_model | checker_model |
|---------|------------------|---------------|---------------|
| quality | opus | opus | sonnet |
| balanced | sonnet | sonnet | haiku |
| budget | haiku | haiku | haiku |
        </Markdown>
      </XmlBlock>

      <XmlBlock name="success_criteria">
        <ul>
          <li>Environment validation passes</li>
          <li>Phase number parsed and normalized</li>
          <li>Phase exists in ROADMAP.md</li>
          <li>RESEARCH.md created (unless skipped)</li>
          <li>PLAN.md created with valid YAML frontmatter</li>
          <li>Plan passes verification (unless skipped)</li>
          <li>STATE.md updated with plan status</li>
        </ul>
      </XmlBlock>

      <XmlBlock name="error_handling">
        <Markdown>
| Error | Recovery |
|-------|----------|
| No .planning/ directory | Prompt: Run /gsd:new-project first |
| Phase not in ROADMAP.md | Prompt: Check phase number or add phase |
| Research timeout | Allow retry or --skip-research |
| Verification loop exhausted | Manual review prompt |
        </Markdown>
      </XmlBlock>
    </Command>
  );
}
