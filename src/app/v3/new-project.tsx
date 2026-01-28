/**
 * new-project.tsx - V3 Command (Full Implementation)
 *
 * Initialize a new project with deep context gathering and PROJECT.md.
 * Demonstrates V3 hybrid runtime for complex orchestration with user interaction.
 *
 * Flow: Setup → Brownfield → Questioning → PROJECT.md → Preferences → Research → Requirements → Roadmap → Done
 *
 * Uses TypeScript runtime functions for:
 * - File I/O and brownfield detection
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
} from '../../jsx.js';

// Import runtime functions
import {
  init,
  buildProjectMd,
  buildResearcherPrompts,
  buildSynthesizerPrompt,
  buildRoadmapperPrompt,
  buildRequirementsMd,
  buildConfigJson,
  parseAgentStatus,
  parseRoadmapSummary,
  formatCompletionSummary,
  resolveModels,
} from './new-project.runtime.js';

// Import types
import type {
  NewProjectContext,
  QuestioningContext,
  WorkflowConfig,
  RequirementsData,
  RoadmapSummary,
  ResearcherPrompt,
  AgentResult,
} from './new-project.runtime.js';

// ============================================================================
// Create typed runtime function components
// ============================================================================

const Init = runtimeFn(init);
const BuildProjectMd = runtimeFn(buildProjectMd);
const BuildResearcherPrompts = runtimeFn(buildResearcherPrompts);
const BuildSynthesizerPrompt = runtimeFn(buildSynthesizerPrompt);
const BuildRoadmapperPrompt = runtimeFn(buildRoadmapperPrompt);
const BuildRequirementsMd = runtimeFn(buildRequirementsMd);
const BuildConfigJson = runtimeFn(buildConfigJson);
const ParseAgentStatus = runtimeFn(parseAgentStatus);
const ParseRoadmapSummary = runtimeFn(parseRoadmapSummary);
const FormatCompletionSummary = runtimeFn(formatCompletionSummary);

// ============================================================================
// Command Definition
// ============================================================================

export default (
  <Command
    name="gsd:new-project"
    description="REACT AGENTIC: Initialize a new project with deep context gathering and PROJECT.md"
    argumentHint="[--skip-research] [--skip-mapping]"
    allowedTools={[
      'Read',
      'Write',
      'Bash',
      'Glob',
      'Grep',
      'Task',
      'AskUserQuestion',
      'mcp__context7__*',
    ]}
  >
    {() => {
      // Variable declarations with typed ScriptVars
      const ctx = useRuntimeVar<NewProjectContext>('CTX');
      const questioning = useRuntimeVar<QuestioningContext>('QUESTIONING');
      const config = useRuntimeVar<WorkflowConfig>('CONFIG');
      const requirements = useRuntimeVar<RequirementsData>('REQUIREMENTS');
      const roadmapSummary = useRuntimeVar<RoadmapSummary>('ROADMAP_SUMMARY');
      const userChoice = useRuntimeVar<string>('USER_CHOICE');
      const agentOutput = useRuntimeVar<string>('AGENT_OUTPUT');
      const agentStatus = useRuntimeVar<AgentResult>('AGENT_STATUS');
      const researcherPrompts = useRuntimeVar<ResearcherPrompt[]>('RESEARCHER_PROMPTS');
      const iteration = useRuntimeVar<number>('ITERATION');
      const projectMdContent = useRuntimeVar<{ content: string; path: string }>('PROJECT_MD');
      const configContent = useRuntimeVar<{ content: string; path: string }>('CONFIG_JSON');
      const reqMdContent = useRuntimeVar<{ content: string; path: string }>('REQUIREMENTS_MD');
      const synthesizerPrompt = useRuntimeVar<{ prompt: string }>('SYNTHESIZER_PROMPT');
      const roadmapperPrompt = useRuntimeVar<{ prompt: string }>('ROADMAPPER_PROMPT');
      const completionSummary = useRuntimeVar<{ summary: string }>('COMPLETION_SUMMARY');
      const _void = useRuntimeVar<void>('_VOID');

      return (
        <>
          <ExecutionContext
            paths={[
              '/Users/glenninizan/.claude/get-shit-done/references/questioning.md',
              '/Users/glenninizan/.claude/get-shit-done/references/ui-brand.md',
              '/Users/glenninizan/.claude/get-shit-done/templates/project.md',
              '/Users/glenninizan/.claude/get-shit-done/templates/requirements.md',
            ]}
          />

          <XmlBlock name="objective">
            <p>
              Initialize a new project through unified flow: questioning → research (optional) →
              requirements → roadmap.
            </p>
            <p>
              This is the most leveraged moment in any project. Deep questioning here means better
              plans, better execution, better outcomes.
            </p>
            <p>
              <b>Creates:</b> .planning/PROJECT.md, config.json, research/ (optional),
              REQUIREMENTS.md, ROADMAP.md, STATE.md
            </p>
            <p>
              <b>After this command:</b> Run /gsd:plan-phase 1 to start execution.
            </p>
          </XmlBlock>

          <XmlBlock name="critical_instructions">
            <p>
              <b>IMPORTANT:</b> This command uses a Node.js runtime for complex operations.
            </p>
            <p>
              <b>You MUST execute the bash commands shown in code blocks.</b> Do NOT improvise or
              read files manually.
            </p>
            <p>Follow each step sequentially. Run bash commands FIRST, then use the output.</p>
          </XmlBlock>

          {/* ============================================================ */}
          {/* PHASE 1: Setup */}
          {/* ============================================================ */}

          <h2>Phase 1: Setup</h2>

          <p>Initialize context, check project state, detect brownfield:</p>

          <Init.Call args={{ arguments: '$ARGUMENTS' }} output={ctx} />

          <If condition={ctx.error}>
            <p>
              <b>Error:</b> {ctx.error}
            </p>
            <Return status="ERROR" message="Initialization failed" />
          </If>

          <If condition={!ctx.gitInitialized}>
            <p>Initializing git repository...</p>
            <pre>git init</pre>
          </If>

          {/* ============================================================ */}
          {/* PHASE 2: Brownfield Detection */}
          {/* ============================================================ */}

          <h2>Phase 2: Brownfield Check</h2>

          <If condition={ctx.brownfield.hasCodeFiles && !ctx.brownfield.hasCodebaseMap}>
            <p>Existing code detected in this directory:</p>
            <pre>{ctx.brownfield.codeFilesPreview}</pre>

            <AskUser
              question="I detected existing code. Would you like to map the codebase first?"
              header="Existing Code"
              options={[
                {
                  value: 'map',
                  label: 'Map codebase first (Recommended)',
                  description:
                    'Run /gsd:map-codebase to understand existing architecture',
                },
                {
                  value: 'skip',
                  label: 'Skip mapping',
                  description: 'Proceed with project initialization',
                },
              ]}
              output={userChoice}
            />

            <If condition={userChoice === 'map'}>
              <p>Run `/gsd:map-codebase` first, then return to `/gsd:new-project`</p>
              <Return status="CHECKPOINT" message="Map codebase first" />
            </If>
          </If>
          <Else>
            <p>
              {ctx.brownfield.hasCodebaseMap
                ? 'Codebase already mapped. Using existing analysis.'
                : 'Greenfield project - no existing code detected.'}
            </p>
          </Else>

          {/* ============================================================ */}
          {/* PHASE 3: Deep Questioning */}
          {/* ============================================================ */}

          <h2>Phase 3: Deep Questioning</h2>

          <pre>{`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► QUESTIONING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`}</pre>

          <XmlBlock name="questioning_instructions">
            <p>
              <b>CRITICAL:</b> This phase requires FREEFORM conversation with the user.
            </p>
            <p>Read @/Users/glenninizan/.claude/get-shit-done/references/questioning.md for techniques.</p>
            <p>
              <b>Start:</b> Ask "What do you want to build?" and WAIT for their response.
            </p>
            <p>
              <b>Follow their energy:</b> Dig into what they emphasized. Ask probing questions.
            </p>
            <p>
              <b>Use AskUserQuestion with options</b> for structured choices, but let them share
              freely when exploring ideas.
            </p>
            <div>
              <b>Capture into QUESTIONING context:</b>
              <ul>
                <li>projectName - What they want to call it</li>
                <li>projectDescription - What it is and does</li>
                <li>coreValue - The ONE thing that must work</li>
                <li>requirements - What they need</li>
                <li>outOfScope - What they explicitly don't want</li>
                <li>context - Background, motivation, why now</li>
                <li>constraints - Budget, timeline, tech limitations</li>
                <li>decisions - Any choices already made</li>
              </ul>
            </div>
            <p>
              <b>Context checklist (mental, not explicit):</b> What is it? Who is it for? What
              problem? What success looks like? What's out? What constraints? What's decided?
            </p>
          </XmlBlock>

          <Loop max={10} counter={iteration}>
            <p>
              Continue exploring with the user. When you could write a clear PROJECT.md, proceed to
              the decision gate.
            </p>

            <AskUser
              question="I think I understand what you're after. Ready to create PROJECT.md?"
              header="Ready?"
              options={[
                { value: 'create', label: 'Create PROJECT.md', description: "Let's move forward" },
                {
                  value: 'keep',
                  label: 'Keep exploring',
                  description: 'I want to share more / ask me more',
                },
              ]}
              output={userChoice}
            />

            <If condition={userChoice === 'create'}>
              <Break message="Ready to create PROJECT.md" />
            </If>
          </Loop>

          {/* ============================================================ */}
          {/* PHASE 4: Write PROJECT.md */}
          {/* ============================================================ */}

          <h2>Phase 4: Write PROJECT.md</h2>

          <XmlBlock name="project_md_instructions">
            <p>
              Synthesize all context gathered during questioning into PROJECT.md. Use the
              QUESTIONING context you've built up.
            </p>
            <p>
              <b>Set QUESTIONING variable</b> with all gathered context before calling
              BuildProjectMd.
            </p>
          </XmlBlock>

          <BuildProjectMd.Call
            args={{
              questioning: questioning,
              isBrownfield: ctx.brownfield.hasCodebaseMap,
            }}
            output={projectMdContent}
          />

          <p>Writing PROJECT.md:</p>
          <pre>
            mkdir -p .planning{'\n'}
            Write content to {projectMdContent.path}
          </pre>

          <p>Committing PROJECT.md:</p>
          <pre>{`git add .planning/PROJECT.md
git commit -m "docs: initialize project"`}</pre>

          {/* ============================================================ */}
          {/* PHASE 5: Workflow Preferences */}
          {/* ============================================================ */}

          <h2>Phase 5: Workflow Preferences</h2>

          <p>
            <b>Round 1 — Core workflow settings:</b>
          </p>

          <AskUser
            question="How do you want to work?"
            header="Mode"
            options={[
              {
                value: 'yolo',
                label: 'YOLO (Recommended)',
                description: 'Auto-approve, just execute',
              },
              { value: 'interactive', label: 'Interactive', description: 'Confirm at each step' },
            ]}
            output={userChoice}
          />

          <AskUser
            question="How thorough should planning be?"
            header="Depth"
            options={[
              {
                value: 'quick',
                label: 'Quick',
                description: 'Ship fast (3-5 phases, 1-3 plans each)',
              },
              {
                value: 'standard',
                label: 'Standard (Recommended)',
                description: 'Balanced scope and speed (5-8 phases, 3-5 plans each)',
              },
              {
                value: 'comprehensive',
                label: 'Comprehensive',
                description: 'Thorough coverage (8-12 phases, 5-10 plans each)',
              },
            ]}
            output={userChoice}
          />

          <AskUser
            question="Run plans in parallel?"
            header="Execution"
            options={[
              {
                value: 'parallel',
                label: 'Parallel (Recommended)',
                description: 'Independent plans run simultaneously',
              },
              { value: 'sequential', label: 'Sequential', description: 'One plan at a time' },
            ]}
            output={userChoice}
          />

          <AskUser
            question="Commit planning docs to git?"
            header="Git Tracking"
            options={[
              {
                value: 'yes',
                label: 'Yes (Recommended)',
                description: 'Planning docs tracked in version control',
              },
              {
                value: 'no',
                label: 'No',
                description: 'Keep .planning/ local-only (add to .gitignore)',
              },
            ]}
            output={userChoice}
          />

          <p>
            <b>Round 2 — Workflow agents:</b>
          </p>

          <Table
            headers={['Agent', 'When it runs', 'What it does']}
            rows={[
              [
                'Researcher',
                'Before planning each phase',
                'Investigates domain, finds patterns, surfaces gotchas',
              ],
              [
                'Plan Checker',
                'After plan is created',
                'Verifies plan actually achieves the phase goal',
              ],
              [
                'Verifier',
                'After phase execution',
                'Confirms must-haves were delivered',
              ],
            ]}
          />

          <AskUser
            question="Research before planning each phase? (adds tokens/time)"
            header="Research"
            options={[
              {
                value: 'yes',
                label: 'Yes (Recommended)',
                description: 'Investigate domain, find patterns, surface gotchas',
              },
              { value: 'no', label: 'No', description: 'Plan directly from requirements' },
            ]}
            output={userChoice}
          />

          <AskUser
            question="Verify plans will achieve their goals? (adds tokens/time)"
            header="Plan Check"
            options={[
              {
                value: 'yes',
                label: 'Yes (Recommended)',
                description: 'Catch gaps before execution starts',
              },
              { value: 'no', label: 'No', description: 'Execute plans without verification' },
            ]}
            output={userChoice}
          />

          <AskUser
            question="Verify work satisfies requirements after each phase? (adds tokens/time)"
            header="Verifier"
            options={[
              {
                value: 'yes',
                label: 'Yes (Recommended)',
                description: 'Confirm deliverables match phase goals',
              },
              { value: 'no', label: 'No', description: 'Trust execution, skip verification' },
            ]}
            output={userChoice}
          />

          <AskUser
            question="Which AI models for planning agents?"
            header="Model Profile"
            options={[
              {
                value: 'balanced',
                label: 'Balanced (Recommended)',
                description: 'Sonnet for most agents — good quality/cost ratio',
              },
              {
                value: 'quality',
                label: 'Quality',
                description: 'Opus for research/roadmap — higher cost, deeper analysis',
              },
              {
                value: 'budget',
                label: 'Budget',
                description: 'Haiku where possible — fastest, lowest cost',
              },
            ]}
            output={userChoice}
          />

          <XmlBlock name="config_assembly">
            <p>
              Assemble CONFIG from all preference answers above. Map user choices to WorkflowConfig
              structure.
            </p>
          </XmlBlock>

          <BuildConfigJson.Call args={{ config: config }} output={configContent} />

          <p>Writing config.json:</p>
          <pre>Write content to {configContent.path}</pre>

          <p>Committing config.json:</p>
          <pre>{`git add .planning/config.json
git commit -m "chore: add project config"`}</pre>

          {/* ============================================================ */}
          {/* PHASE 5.5: Resolve Model Profile */}
          {/* ============================================================ */}

          <h2>Phase 5.5: Resolve Model Profile</h2>

          <Table
            headers={['Agent', 'quality', 'balanced', 'budget']}
            rows={[
              ['gsd-project-researcher', 'opus', 'sonnet', 'haiku'],
              ['gsd-research-synthesizer', 'sonnet', 'sonnet', 'haiku'],
              ['gsd-roadmapper', 'opus', 'sonnet', 'sonnet'],
            ]}
          />

          <p>Store resolved models from config.modelProfile for use in Task calls below.</p>

          {/* ============================================================ */}
          {/* PHASE 6: Research Decision */}
          {/* ============================================================ */}

          <h2>Phase 6: Research Decision</h2>

          <AskUser
            question="Research the domain ecosystem before defining requirements?"
            header="Research"
            options={[
              {
                value: 'research',
                label: 'Research first (Recommended)',
                description:
                  'Discover standard stacks, expected features, architecture patterns',
              },
              {
                value: 'skip',
                label: 'Skip research',
                description: 'I know this domain well, go straight to requirements',
              },
            ]}
            output={userChoice}
          />

          <If condition={userChoice === 'research'}>
            <pre>{`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► RESEARCHING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`}</pre>

            <pre>mkdir -p .planning/research</pre>

            <XmlBlock name="research_context">
              <p>
                Determine milestone context: If no "Validated" requirements in PROJECT.md →
                greenfield. Otherwise → subsequent.
              </p>
              <p>
                Extract domain from PROJECT.md description (e.g., "social media app", "e-commerce
                platform").
              </p>
            </XmlBlock>

            <p>
              <b>Spawning 4 researchers in parallel...</b>
            </p>

            <BuildResearcherPrompts.Call
              args={{
                projectName: questioning.projectName,
                projectDescription: questioning.projectDescription,
                coreValue: questioning.coreValue,
                domain: '[domain extracted from project]',
                milestoneContext: 'greenfield',
                agentPath: ctx.agentPaths.researcher,
              }}
              output={researcherPrompts}
            />

            <XmlBlock name="research_spawning">
              <p>Use the resolved model from config (quality=opus, balanced=sonnet, budget=haiku for researcher).</p>
              <p>Spawn all 4 researchers in parallel:</p>
            </XmlBlock>

            <p>→ Stack research</p>
            <SpawnAgent
              agent="gsd-project-researcher"
              loadFromFile="/Users/glenninizan/.claude/agents/gsd-project-researcher.md"
              model="sonnet"
              description="Stack research"
              input={{ prompt: researcherPrompts[0].prompt }}
              output={agentOutput}
            />

            <p>→ Features research</p>
            <SpawnAgent
              agent="gsd-project-researcher"
              loadFromFile="/Users/glenninizan/.claude/agents/gsd-project-researcher.md"
              model="sonnet"
              description="Features research"
              input={{ prompt: researcherPrompts[1].prompt }}
              output={agentOutput}
            />

            <p>→ Architecture research</p>
            <SpawnAgent
              agent="gsd-project-researcher"
              loadFromFile="/Users/glenninizan/.claude/agents/gsd-project-researcher.md"
              model="sonnet"
              description="Architecture research"
              input={{ prompt: researcherPrompts[2].prompt }}
              output={agentOutput}
            />

            <p>→ Pitfalls research</p>
            <SpawnAgent
              agent="gsd-project-researcher"
              loadFromFile="/Users/glenninizan/.claude/agents/gsd-project-researcher.md"
              model="sonnet"
              description="Pitfalls research"
              input={{ prompt: researcherPrompts[3].prompt }}
              output={agentOutput}
            />

            <p>All researchers complete. Spawning synthesizer...</p>

            <BuildSynthesizerPrompt.Call args={{ projectName: questioning.projectName }} output={synthesizerPrompt} />

            <SpawnAgent
              agent="gsd-research-synthesizer"
              loadFromFile="/Users/glenninizan/.claude/agents/gsd-research-synthesizer.md"
              model="sonnet"
              description="Synthesize research"
              input={{ prompt: synthesizerPrompt.prompt }}
              output={agentOutput}
            />

            <ParseAgentStatus.Call args={{ output: agentOutput }} output={agentStatus} />

            <If condition={agentStatus.status === 'BLOCKED'}>
              <p>
                <b>Research blocked:</b> {agentStatus.message}
              </p>
              <Return status="BLOCKED" message="Research blocked" />
            </If>

            <pre>{`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► RESEARCH COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`}</pre>

            <p>Files: `.planning/research/`</p>
          </If>
          <Else>
            <p>Skipping research — proceeding to requirements.</p>
          </Else>

          {/* ============================================================ */}
          {/* PHASE 7: Define Requirements */}
          {/* ============================================================ */}

          <h2>Phase 7: Define Requirements</h2>

          <pre>{`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► DEFINING REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`}</pre>

          <XmlBlock name="requirements_instructions">
            <p>
              <b>If research exists:</b> Read research/FEATURES.md and present features by category.
            </p>
            <p>
              <b>If no research:</b> Ask "What are the main things users need to be able to do?"
            </p>
            <p>
              <b>For each category:</b> Use AskUserQuestion with multiSelect to let user choose v1
              features.
            </p>
            <p>
              <b>Track:</b> Selected → v1 requirements, Unselected table stakes → v2, Unselected
              differentiators → out of scope.
            </p>
            <p>
              <b>REQ-ID format:</b> [CATEGORY]-[NUMBER] (AUTH-01, CONTENT-02)
            </p>
            <p>
              <b>Good requirements are:</b> Specific and testable, User-centric, Atomic,
              Independent.
            </p>
            <div>
              Build REQUIREMENTS data structure:
              <ul>
                <li>v1Requirements: Array of (id, category, description)</li>
                <li>v2Requirements: Array of (id, category, description)</li>
                <li>outOfScope: Array of (feature, reason)</li>
              </ul>
            </div>
          </XmlBlock>

          <Loop max={5} counter={iteration}>
            <p>
              Present full requirements list for user confirmation. Show every requirement (not just
              counts).
            </p>

            <AskUser
              question="Does this capture what you're building?"
              header="Requirements"
              options={[
                { value: 'yes', label: 'Yes', description: 'Requirements are complete' },
                { value: 'adjust', label: 'Adjust', description: 'I need to change some' },
              ]}
              output={userChoice}
            />

            <If condition={userChoice === 'yes'}>
              <Break message="Requirements confirmed" />
            </If>
          </Loop>

          <BuildRequirementsMd.Call args={{ requirements: requirements }} output={reqMdContent} />

          <p>Writing REQUIREMENTS.md:</p>
          <pre>Write content to {reqMdContent.path}</pre>

          <p>Committing REQUIREMENTS.md:</p>
          <pre>{`git add .planning/REQUIREMENTS.md
git commit -m "docs: define v1 requirements"`}</pre>

          {/* ============================================================ */}
          {/* PHASE 8: Create Roadmap */}
          {/* ============================================================ */}

          <h2>Phase 8: Create Roadmap</h2>

          <pre>{`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► CREATING ROADMAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning roadmapper...`}</pre>

          <BuildRoadmapperPrompt.Call
            args={{ hasResearch: userChoice === 'research', isRevision: false }}
            output={roadmapperPrompt}
          />

          <SpawnAgent
            agent="gsd-roadmapper"
            loadFromFile="/Users/glenninizan/.claude/agents/gsd-roadmapper.md"
            model="sonnet"
            description="Create roadmap"
            input={{ prompt: roadmapperPrompt.prompt }}
            output={agentOutput}
          />

          <ParseAgentStatus.Call args={{ output: agentOutput }} output={agentStatus} />

          <If condition={agentStatus.status === 'BLOCKED'}>
            <p>
              <b>Roadmap blocked:</b> {agentStatus.message}
            </p>
            <p>Work with user to resolve, then re-spawn.</p>
            <Return status="BLOCKED" message="Roadmap creation blocked" />
          </If>

          <ParseRoadmapSummary.Call args={{ roadmapPath: '.planning/ROADMAP.md' }} output={roadmapSummary} />

          <p>
            <b>Proposed Roadmap:</b>
          </p>
          <p>
            <b>{roadmapSummary.phaseCount} phases</b> | <b>{roadmapSummary.requirementCount} requirements mapped</b> | All v1 requirements covered
          </p>

          <Loop max={5} counter={iteration}>
            <AskUser
              question="Does this roadmap structure work for you?"
              header="Roadmap"
              options={[
                { value: 'approve', label: 'Approve', description: 'Commit and continue' },
                { value: 'adjust', label: 'Adjust phases', description: 'Tell me what to change' },
                { value: 'review', label: 'Review full file', description: 'Show raw ROADMAP.md' },
              ]}
              output={userChoice}
            />

            <If condition={userChoice === 'approve'}>
              <Break message="Roadmap approved" />
            </If>

            <If condition={userChoice === 'review'}>
              <p>Display raw ROADMAP.md:</p>
              <pre>cat .planning/ROADMAP.md</pre>
            </If>

            <If condition={userChoice === 'adjust'}>
              <p>Get user's adjustment notes, then re-spawn roadmapper with revision context.</p>

              <BuildRoadmapperPrompt.Call
                args={{
                  hasResearch: true,
                  isRevision: true,
                  revisionNotes: '[user adjustment notes]',
                }}
                output={roadmapperPrompt}
              />

              <SpawnAgent
                agent="gsd-roadmapper"
                loadFromFile="/Users/glenninizan/.claude/agents/gsd-roadmapper.md"
                model="sonnet"
                description="Revise roadmap"
                input={{ prompt: roadmapperPrompt.prompt }}
                output={agentOutput}
              />

              <ParseRoadmapSummary.Call args={{ roadmapPath: '.planning/ROADMAP.md' }} output={roadmapSummary} />
            </If>
          </Loop>

          <p>Committing roadmap (after approval):</p>
          <pre>{`git add .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md
git commit -m "docs: create roadmap (${roadmapSummary.phaseCount} phases)"`}</pre>

          {/* ============================================================ */}
          {/* PHASE 10: Done */}
          {/* ============================================================ */}

          <h2>Phase 10: Done</h2>

          <FormatCompletionSummary.Call
            args={{
              projectName: questioning.projectName,
              phaseCount: roadmapSummary.phaseCount,
              requirementCount: roadmapSummary.requirementCount,
              hasResearch: userChoice === 'research',
              firstPhaseName: roadmapSummary.phases[0]?.name || 'Setup',
              firstPhaseGoal: roadmapSummary.phases[0]?.goal || 'Initialize project',
            }}
            output={completionSummary}
          />

          <XmlBlock name="offer_next">
            <p>{completionSummary.summary}</p>
          </XmlBlock>

          <XmlBlock name="success_criteria">
            <p>- [ ] Project state checked, git initialized if needed</p>
            <p>- [ ] Brownfield detection completed, codebase mapping offered if needed</p>
            <p>- [ ] Deep questioning completed (threads followed, not rushed)</p>
            <p>- [ ] PROJECT.md created and committed</p>
            <p>- [ ] Workflow preferences gathered (mode, depth, parallelization, agents)</p>
            <p>- [ ] config.json created and committed</p>
            <p>- [ ] Research completed if selected (4 researchers + synthesizer)</p>
            <p>- [ ] Requirements gathered and scoped (v1/v2/out of scope)</p>
            <p>- [ ] REQUIREMENTS.md created and committed</p>
            <p>- [ ] Roadmapper spawned, user approved roadmap</p>
            <p>- [ ] ROADMAP.md, STATE.md created, traceability updated, committed</p>
            <p>- [ ] User knows next step is /gsd:discuss-phase 1</p>
          </XmlBlock>
        </>
      );
    }}
  </Command>
);
