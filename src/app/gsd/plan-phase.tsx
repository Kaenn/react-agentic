import {
  Command,
  XmlBlock,
  Markdown,
  Assign,
  AssignGroup,
  useVariable,
  SpawnAgent,
} from '../../jsx.js';

// Agent file paths (GSD pattern - agents live in ~/.claude/agents/)
const AGENT_PATHS = {
  researcher: '/Users/glenninizan/.claude/agents/gsd-phase-researcher.md',
  planner: '/Users/glenninizan/.claude/agents/gsd-planner.md',
  checker: '/Users/glenninizan/.claude/agents/gsd-plan-checker.md',
} as const;

// Declare shell variables for the orchestrator
const modelProfile = useVariable<string>("MODEL_PROFILE");
const phaseDesc = useVariable<string>("PHASE_DESC");
const requirements = useVariable<string>("REQUIREMENTS");
const decisions = useVariable<string>("DECISIONS");
const phaseContext = useVariable<string>("PHASE_CONTEXT");
const workflowResearch = useVariable<string>("WORKFLOW_RESEARCH");
const workflowPlanCheck = useVariable<string>("WORKFLOW_PLAN_CHECK");
const stateContent = useVariable<string>("STATE_CONTENT");
const roadmapContent = useVariable<string>("ROADMAP_CONTENT");
const requirementsContent = useVariable<string>("REQUIREMENTS_CONTENT");
const contextContent = useVariable<string>("CONTEXT_CONTENT");
const researchContent = useVariable<string>("RESEARCH_CONTENT");
const verificationContent = useVariable<string>("VERIFICATION_CONTENT");
const uatContent = useVariable<string>("UAT_CONTENT");
const plansContent = useVariable<string>("PLANS_CONTENT");

export default function PlanPhaseCommand() {

  return (
    <Command
      name="gsd:plan-phase"
      description="Create detailed execution plan for a phase (PLAN.md) with verification loop"
      argumentHint="[phase] [--research] [--skip-research] [--gaps] [--skip-verify]"
      agent="gsd-planner"
      allowedTools={['Read', 'Write', 'Bash', 'Glob', 'Grep', 'Task', 'WebFetch', 'mcp__context7__*']}
    >
      <XmlBlock name="execution_context">
        <Markdown>
@/Users/glenninizan/.claude/get-shit-done/references/ui-brand.md 
        </Markdown>
      </XmlBlock>

      <XmlBlock name="objective">
        <p>Create executable phase prompts (PLAN.md files) for a roadmap phase with integrated research and verification.</p>
        <p><b>Default flow:</b> Research (if needed) → Plan → Verify → Done</p>
        <p><b>Orchestrator role:</b> Parse arguments, validate phase, research domain (unless skipped or exists), spawn gsd-planner agent, verify plans with gsd-plan-checker, iterate until plans pass or max iterations reached, present results.</p>
        <p><b>Why subagents:</b> Research and planning burn context fast. Verification uses fresh context. User sees the flow between agents in main context.</p>
      </XmlBlock>

      <XmlBlock name="context">
        <p>Phase number: $ARGUMENTS (optional - auto-detects next unplanned phase if not provided)</p>
        <p><b>Flags:</b></p>
        <ul>
          <li><code>--research</code> — Force re-research even if RESEARCH.md exists</li>
          <li><code>--skip-research</code> — Skip research entirely, go straight to planning</li>
          <li><code>--gaps</code> — Gap closure mode (reads VERIFICATION.md, skips research)</li>
          <li><code>--skip-verify</code> — Skip planner → checker verification loop</li>
        </ul>
        <p>Normalize phase input in step 2 before any directory lookups.</p>
      </XmlBlock>

      <XmlBlock name="process">
        <h2>1. Validate Environment and Resolve Model Profile</h2>
        <pre><code className="language-bash">{`ls .planning/ 2>/dev/null`}</code></pre>
        <p><b>If not found:</b> Error - user should run <code>/gsd:new-project</code> first.</p>
        <p><b>Resolve model profile for agent spawning:</b></p>
        <Assign var={modelProfile} bash={`cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced"`} />
        <p>Default to "balanced" if not set.</p>
        <p><b>Model lookup table:</b></p>
        <Markdown>{`
| Agent | quality | balanced | budget |
|-------|---------|----------|--------|
| gsd-phase-researcher | opus | sonnet | haiku |
| gsd-planner | opus | opus | sonnet |
| gsd-plan-checker | sonnet | sonnet | haiku |
`}</Markdown>
        <p>Store resolved models for use in Task calls below.</p>

        <h2>2. Parse and Normalize Arguments</h2>
        <p>Extract from $ARGUMENTS:</p>
        <ul>
          <li>Phase number (integer or decimal like <code>2.1</code>)</li>
          <li><code>--research</code> flag to force re-research</li>
          <li><code>--skip-research</code> flag to skip research</li>
          <li><code>--gaps</code> flag for gap closure mode</li>
          <li><code>--skip-verify</code> flag to bypass verification loop</li>
        </ul>
        <p><b>If no phase number:</b> Detect next unplanned phase from roadmap.</p>
        <p><b>Normalize phase to zero-padded format:</b></p>
        <pre><code className="language-bash">{`# Normalize phase number (8 → 08, but preserve decimals like 2.1 → 02.1)
if [[ "$PHASE" =~ ^[0-9]+$ ]]; then
  PHASE=$(printf "%02d" "$PHASE")
elif [[ "$PHASE" =~ ^([0-9]+)\\.([0-9]+)$ ]]; then
  PHASE=$(printf "%02d.%s" "\${BASH_REMATCH[1]}" "\${BASH_REMATCH[2]}")
fi`}</code></pre>
        <p><b>Check for existing research and plans:</b></p>
        <pre><code className="language-bash">{`ls .planning/phases/\${PHASE}-*/*-RESEARCH.md 2>/dev/null
ls .planning/phases/\${PHASE}-*/*-PLAN.md 2>/dev/null`}</code></pre>

        <h2>3. Validate Phase</h2>
        <pre><code className="language-bash">{`grep -A5 "Phase \${PHASE}:" .planning/ROADMAP.md 2>/dev/null`}</code></pre>
        <p><b>If not found:</b> Error with available phases. <b>If found:</b> Extract phase number, name, description.</p>

        <h2>4. Ensure Phase Directory Exists</h2>
        <pre><code className="language-bash">{`# PHASE is already normalized (08, 02.1, etc.) from step 2
PHASE_DIR=$(ls -d .planning/phases/\${PHASE}-* 2>/dev/null | head -1)
if [ -z "$PHASE_DIR" ]; then
  # Create phase directory from roadmap name
  PHASE_NAME=$(grep "Phase \${PHASE}:" .planning/ROADMAP.md | sed 's/.*Phase [0-9]*: //' | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
  mkdir -p ".planning/phases/\${PHASE}-\${PHASE_NAME}"
  PHASE_DIR=".planning/phases/\${PHASE}-\${PHASE_NAME}"
fi`}</code></pre>

        <h2>5. Handle Research</h2>
        <p><b>If <code>--gaps</code> flag:</b> Skip research (gap closure uses VERIFICATION.md instead).</p>
        <p><b>If <code>--skip-research</code> flag:</b> Skip to step 6.</p>
        <p><b>Check config for research setting:</b></p>
        <Assign var={workflowResearch} bash={`cat .planning/config.json 2>/dev/null | grep -o '"research"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\\|false' || echo "true"`} />
        <p><b>If <code>workflow.research</code> is <code>false</code> AND <code>--research</code> flag NOT set:</b> Skip to step 6.</p>
        <p><b>Otherwise:</b></p>
        <p>Check for existing research:</p>
        <pre><code className="language-bash">{`ls "\${PHASE_DIR}"/*-RESEARCH.md 2>/dev/null`}</code></pre>
        <div>
          <b>If RESEARCH.md exists AND <code>--research</code> flag NOT set:</b>
          <ul>
            <li>Display: <code>{'Using existing research: ${PHASE_DIR}/${PHASE}-RESEARCH.md'}</code></li>
            <li>Skip to step 6</li>
          </ul>
        </div>
        <p><b>If RESEARCH.md missing OR <code>--research</code> flag set:</b></p>
        <div>
          Display stage banner:
        <Markdown>{`
\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► RESEARCHING PHASE {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning researcher...
\`\`\`
`}</Markdown>
        </div>
        <p>Proceed to spawn researcher</p>

        <h3>Spawn gsd-phase-researcher</h3>
        <p>Gather context for research prompt:</p>
        <AssignGroup>
          <Assign var={phaseDesc} bash={`grep -A3 "Phase \${PHASE}:" .planning/ROADMAP.md`} comment="Get phase description from roadmap" />
          <Assign var={requirements} bash={`cat .planning/REQUIREMENTS.md 2>/dev/null | grep -A100 "## Requirements" | head -50`} comment="Get requirements if they exist" />
          <Assign var={decisions} bash={`grep -A20 "### Decisions Made" .planning/STATE.md 2>/dev/null`} comment="Get prior decisions from STATE.md" />
          <Assign var={phaseContext} bash={`cat "\${PHASE_DIR}/\${PHASE}-CONTEXT.md" 2>/dev/null`} comment="Get phase context if exists" />
        </AssignGroup>
        <p>Fill research prompt and spawn:</p>

        <Markdown>{`
\`\`\`markdown
<objective>
Research how to implement Phase {phase_number}: {phase_name}

Answer: "What do I need to know to PLAN this phase well?"
</objective>

<context>
**Phase description:**
{phase_description}

**Requirements (if any):**
{requirements}

**Prior decisions:**
{decisions}

**Phase context (if any):**
{phase_context}
</context>

<output>
Write research findings to: {phase_dir}/{phase}-RESEARCH.md
</output>
\`\`\`
`}</Markdown>

        <SpawnAgent
          agent="gsd-phase-researcher"
          loadFromFile={AGENT_PATHS.researcher}
          model="{researcher_model}"
          description="Research Phase {phase}"
          promptVariable="research_prompt"
        />

        <h3>Handle Researcher Return</h3>

        <div>
          <b><code>## RESEARCH COMPLETE</code>:</b>
          <ul>
            <li>Display: <code>Research complete. Proceeding to planning...</code></li>
            <li>Continue to step 6</li>
          </ul>
        </div>

        <div>
          <b><code>## RESEARCH BLOCKED</code>:</b>
          <ul>
            <li>Display blocker information</li>
            <li>Offer: 1) Provide more context, 2) Skip research and plan anyway, 3) Abort</li>
            <li>Wait for user response</li>
          </ul>
        </div>

        <h2>6. Check Existing Plans</h2>
        <pre><code className="language-bash">{`ls "\${PHASE_DIR}"/*-PLAN.md 2>/dev/null`}</code></pre>
        <p><b>If exists:</b> Offer: 1) Continue planning (add more plans), 2) View existing, 3) Replan from scratch. Wait for response.</p>

        <h2>7. Read Context Files</h2>
        <p>Read and store context file contents for the planner agent. The <code>@</code> syntax does not work across Task() boundaries - content must be inlined.</p>
        <AssignGroup>
          <Assign var={stateContent} bash={`cat .planning/STATE.md`} comment="Read project state" />
          <Assign var={roadmapContent} bash={`cat .planning/ROADMAP.md`} />
          <br/>
          <Assign var={requirementsContent} bash={`cat .planning/REQUIREMENTS.md 2>/dev/null`} comment="Read optional files (empty string if missing)" />
          <Assign var={contextContent} bash={`cat "\${PHASE_DIR}"/*-CONTEXT.md 2>/dev/null`}/>
          <Assign var={researchContent} bash={`cat "\${PHASE_DIR}"/*-RESEARCH.md 2>/dev/null`}/>
          <Assign var={verificationContent} bash={`cat "\${PHASE_DIR}"/*-VERIFICATION.md 2>/dev/null`} comment='Gap closure files (only if --gaps mode)'/>
          <Assign var={uatContent} bash={`cat "\${PHASE_DIR}"/*-UAT.md 2>/dev/null`}/>
        </AssignGroup>

        <h2>8. Spawn gsd-planner Agent</h2>
        <div>
          Display stage banner:
        <Markdown>{`
\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PLANNING PHASE {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning planner...
\`\`\`
`}</Markdown>
        </div>
        <p>Fill prompt with inlined content and spawn:</p>
        <Markdown>{`
\`\`\`markdown
<planning_context>

**Phase:** {phase_number}
**Mode:** {standard | gap_closure}

**Project State:**
{state_content}

**Roadmap:**
{roadmap_content}

**Requirements (if exists):**
{requirements_content}

**Phase Context (if exists):**
{context_content}

**Research (if exists):**
{research_content}

**Gap Closure (if --gaps mode):**
{verification_content}
{uat_content}

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
\`\`\`
`}</Markdown>
        <SpawnAgent
          agent="gsd-planner"
          loadFromFile={AGENT_PATHS.planner}
          model="{planner_model}"
          description="Plan Phase {phase}"
          promptVariable="filled_prompt"
        />

        <h2>9. Handle Planner Return</h2>
        <p>Parse planner output:</p>
        <div>
          <b><code>## PLANNING COMPLETE</code>:</b>
          <ul>
            <li>Display: <code>{'Planner created {N} plan(s). Files on disk.'}</code></li>
            <li>If <code>--skip-verify</code>: Skip to step 13</li>
            <li>Check config:</li>
          </ul>
        </div>
        <Assign var={workflowPlanCheck} bash={`cat .planning/config.json 2>/dev/null | grep -o '"plan_check"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\\|false' || echo "true"`} />
        <ul>
          <li>If <code>workflow.plan_check</code> is <code>false</code>: Skip to step 13</li>
          <li>Otherwise: Proceed to step 10</li>
        </ul>
        <p><b><code>## CHECKPOINT REACHED</code>:</b></p>
        <ul>
          <li>Present to user, get response, spawn continuation (see step 12)</li>
        </ul>
        <p><b><code>## PLANNING INCONCLUSIVE</code>:</b></p>
        <ul>
          <li>Show what was attempted</li>
          <li>Offer: Add context, Retry, Manual</li>
          <li>Wait for user response</li>
        </ul>

        <h2>10. Spawn gsd-plan-checker Agent</h2>
        <p>Display:</p>
        <Markdown>{`
\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► VERIFYING PLANS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning plan checker...
\`\`\`
`}</Markdown>
        <p>Read plans and requirements for the checker:</p>
        <Assign var={plansContent} bash={`cat "\${PHASE_DIR}"/*-PLAN.md 2>/dev/null`} />
        <Assign var={requirementsContent} bash={`cat .planning/REQUIREMENTS.md 2>/dev/null`} />
        <p>Fill checker prompt with inlined content and spawn:</p>
        <Markdown>{`
\`\`\`markdown
<verification_context>

**Phase:** {phase_number}
**Phase Goal:** {goal from ROADMAP}

**Plans to verify:**
{plans_content}

**Requirements (if exists):**
{requirements_content}

</verification_context>

<expected_output>
Return one of:
- ## VERIFICATION PASSED — all checks pass
- ## ISSUES FOUND — structured issue list
</expected_output>
\`\`\`
`}</Markdown>
        <SpawnAgent
          agent="gsd-plan-checker"
          loadFromFile={AGENT_PATHS.checker}
          model="{checker_model}"
          description="Verify Phase {phase} plans"
          promptVariable="checker_prompt"
        />

        <h2>11. Handle Checker Return</h2>
        <p><b>If <code>## VERIFICATION PASSED</code>:</b></p>
        <ul>
          <li>Display: <code>Plans verified. Ready for execution.</code></li>
          <li>Proceed to step 13</li>
        </ul>
        <p><b>If <code>## ISSUES FOUND</code>:</b></p>
        <ul>
          <li>Display: <code>Checker found issues:</code></li>
          <li>List issues from checker output</li>
          <li>Check iteration count</li>
          <li>Proceed to step 12</li>
        </ul>

        <h2>12. Revision Loop (Max 3 Iterations)</h2>
        <p>Track: <code>iteration_count</code> (starts at 1 after initial plan + check)</p>
        <p><b>If iteration_count {'< '}3:</b></p>
        <p>Display: <code>{'Sending back to planner for revision... (iteration {N}/3)'}</code></p>
        <p>Read current plans for revision context:</p>
        <Assign var={plansContent} bash={`cat "\${PHASE_DIR}"/*-PLAN.md 2>/dev/null`} />
        <p>Spawn gsd-planner with revision prompt:</p>
        <Markdown>{`
\`\`\`markdown
<revision_context>

**Phase:** {phase_number}
**Mode:** revision

**Existing plans:**
{plans_content}

**Checker issues:**
{structured_issues_from_checker}

</revision_context>

<instructions>
Make targeted updates to address checker issues.
Do NOT replan from scratch unless issues are fundamental.
Return what changed.
</instructions>
\`\`\`
`}</Markdown>
        <SpawnAgent
          agent="gsd-planner"
          loadFromFile={AGENT_PATHS.planner}
          model="{planner_model}"
          description="Revise Phase {phase} plans"
          promptVariable="revision_prompt"
        />
        <ul>
          <li>After planner returns → spawn checker again (step 10)</li>
          <li>Increment iteration_count</li>
        </ul>
        <p><b>If iteration_count {'>= '}3:</b></p>
        <p>Display: <code>{'Max iterations reached. {N} issues remain:'}</code></p>
        <ul>
          <li>List remaining issues</li>
        </ul>
        <p>Offer options:</p>
        <ol>
          <li>Force proceed (execute despite issues)</li>
          <li>Provide guidance (user gives direction, retry)</li>
          <li>Abandon (exit planning)</li>
        </ol>
        <p>Wait for user response.</p>

        <h2>13. Present Final Status</h2>
        <p>Route to <code>{'<offer_next>'}</code>.</p>
      </XmlBlock>

      <XmlBlock name="offer_next">
        <Markdown>
{`Output this markdown directly (not as a code block):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE {X} PLANNED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {X}: {Name}** — {N} plan(s) in {M} wave(s)

| Wave | Plans | What it builds |
|------|-------|----------------|
| 1    | 01, 02 | [objectives] |
| 2    | 03     | [objective]  |

Research: {Completed | Used existing | Skipped}
Verification: {Passed | Passed with override | Skipped}

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Execute Phase {X}** — run all {N} plans

/gsd:execute-phase {X}

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- cat .planning/phases/{phase-dir}/*-PLAN.md — review plans
- /gsd:plan-phase {X} --research — re-research first

───────────────────────────────────────────────────────────────`}
        </Markdown>
      </XmlBlock>

      <XmlBlock name="success_criteria">
        <ul>
          <li>[ ] .planning/ directory validated</li>
          <li>[ ] Phase validated against roadmap</li>
          <li>[ ] Phase directory created if needed</li>
          <li>[ ] Research completed (unless --skip-research or --gaps or exists)</li>
          <li>[ ] gsd-phase-researcher spawned if research needed</li>
          <li>[ ] Existing plans checked</li>
          <li>[ ] gsd-planner spawned with context (including RESEARCH.md if available)</li>
          <li>[ ] Plans created (PLANNING COMPLETE or CHECKPOINT handled)</li>
          <li>[ ] gsd-plan-checker spawned (unless --skip-verify)</li>
          <li>[ ] Verification passed OR user override OR max iterations with user decision</li>
          <li>[ ] User sees status between agent spawns</li>
          <li>[ ] User knows next steps (execute or review)</li>
        </ul>
      </XmlBlock>
    </Command>
  );
}
