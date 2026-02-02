/**
 * plan-phase.runtime.ts - Runtime functions for V3 plan-phase command
 *
 * These functions are extracted to runtime.js and called via node.
 * They handle file I/O, parsing, context preparation, and prompt building.
 *
 * Design: Maximize runtime logic (JS over Markdown)
 * - File I/O, parsing → runtime
 * - Path resolution, context assembly → runtime
 * - Model lookup, summary generation → runtime
 * - Agent prompts, banners → TSX (markdown)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { randomCatName } from 'cat-names';

// ============================================================================
// Types
// ============================================================================

export interface PlanPhaseFlags {
  research: boolean;      // --research: force re-research
  skipResearch: boolean;  // --skip-research: skip research entirely
  gaps: boolean;          // --gaps: gap closure mode
  skipVerify: boolean;    // --skip-verify: skip verification loop
}

export interface ModelConfig {
  researcher: 'opus' | 'sonnet' | 'haiku';
  planner: 'opus' | 'sonnet' | 'haiku';
  checker: 'opus' | 'sonnet' | 'haiku';
}

export interface PlanPhaseContext {
  error?: string;
  phaseId: string;           // Normalized phase (e.g., "08", "02.1")
  phaseName: string;         // Phase name from roadmap
  phaseDescription: string;  // Full description
  phaseDir: string;          // Path to phase directory
  hasResearch: boolean;      // RESEARCH.md exists
  hasPlans: boolean;         // PLAN.md files exist
  planCount: number;         // Number of existing plans
  planFiles: string[];       // List of plan file paths
  needsResearch: boolean;    // Should spawn researcher
  flags: PlanPhaseFlags;
  models: ModelConfig;
  modelProfile: string;      // 'quality' | 'balanced' | 'budget'
  config: {
    workflowResearch: boolean;
    workflowPlanCheck: boolean;
  };
  mascot: string;            // Random cat name for this phase
}

export interface ResearchContext {
  phaseDescription: string;
  requirements: string;
  decisions: string;
  phaseContext: string;
}

export interface PlanningContext {
  state: string;
  roadmap: string;
  requirements: string;
  context: string;
  research: string;
  verification: string;
  uat: string;
}

export interface AgentResult {
  status: 'COMPLETE' | 'BLOCKED' | 'INCONCLUSIVE' | 'CHECKPOINT';
  message?: string;
  data?: Record<string, unknown>;
}

export interface CheckerResult {
  passed: boolean;
  issues: string[];
  status: 'PASSED' | 'ISSUES_FOUND';
}

export interface PlanSummary {
  phaseId: string;
  phaseName: string;
  planCount: number;
  waveCount: number;
  waves: { wave: number; plans: string[]; objective: string }[];
  research: 'completed' | 'existing' | 'skipped';
  verification: 'passed' | 'override' | 'skipped';
}

export interface PromptResult {
  prompt: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
}

async function findFiles(dir: string, pattern: RegExp): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter(e => e.isFile() && pattern.test(e.name))
      .map(e => path.join(dir, e.name));
  } catch {
    return [];
  }
}

async function findDirectories(dir: string, pattern: RegExp): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && pattern.test(e.name))
      .map(e => path.join(dir, e.name));
  } catch {
    return [];
  }
}

function normalizePhaseId(input: string): string {
  const trimmed = input.trim();
  // Integer: 8 -> 08
  if (/^\d+$/.test(trimmed)) {
    return trimmed.padStart(2, '0');
  }
  // Decimal: 2.1 -> 02.1
  const match = trimmed.match(/^(\d+)\.(\d+)$/);
  if (match) {
    return `${match[1].padStart(2, '0')}.${match[2]}`;
  }
  return trimmed;
}

function parseFlags(args: string): PlanPhaseFlags {
  return {
    research: args.includes('--research'),
    skipResearch: args.includes('--skip-research'),
    gaps: args.includes('--gaps'),
    skipVerify: args.includes('--skip-verify'),
  };
}

function resolveModels(profile: string): ModelConfig {
  const profiles: Record<string, ModelConfig> = {
    quality: { researcher: 'opus', planner: 'opus', checker: 'sonnet' },
    balanced: { researcher: 'sonnet', planner: 'opus', checker: 'sonnet' },
    budget: { researcher: 'haiku', planner: 'sonnet', checker: 'haiku' },
  };
  return profiles[profile] || profiles.balanced;
}


// ============================================================================
// Main Runtime Functions
// ============================================================================

/**
 * Initialize plan-phase context from arguments
 */
export async function init(args: { arguments: string }): Promise<PlanPhaseContext> {
  const errorCtx = (error: string): PlanPhaseContext => ({
    error,
    phaseId: '', phaseName: '', phaseDescription: '', phaseDir: '',
    hasResearch: false, hasPlans: false, planCount: 0, planFiles: [],
    needsResearch: false,
    flags: { research: false, skipResearch: false, gaps: false, skipVerify: false },
    models: { researcher: 'sonnet', planner: 'opus', checker: 'sonnet' },
    modelProfile: 'balanced',
    config: { workflowResearch: true, workflowPlanCheck: true },
    mascot: randomCatName(),
  });

  // Check .planning directory exists
  if (!await fileExists('.planning')) {
    return errorCtx('.planning/ directory not found. Run /gsd:new-project first.');
  }

  const flags = parseFlags(args.arguments);

  // Extract phase number from arguments
  const phaseMatch = args.arguments.match(/\b(\d+(?:\.\d+)?)\b/);
  let phaseId = phaseMatch ? normalizePhaseId(phaseMatch[1]) : '';

  // Read roadmap
  const roadmap = await readFile('.planning/ROADMAP.md');
  if (!roadmap) {
    return errorCtx('ROADMAP.md not found or empty.');
  }

  // Auto-detect next unplanned phase if not specified
  if (!phaseId) {
    const phaseMatches = roadmap.matchAll(/Phase (\d+(?:\.\d+)?):/g);
    for (const match of phaseMatches) {
      const num = match[1];
      const normalized = normalizePhaseId(num);
      const phaseDirs = await findDirectories('.planning/phases', new RegExp(`^${normalized.replace('.', '\\.')}-`));

      if (phaseDirs.length === 0) {
        phaseId = normalized;
        break;
      }

      // Check if phase has plans
      const plans = await findFiles(phaseDirs[0], /-PLAN\.md$/);
      if (plans.length === 0) {
        phaseId = normalized;
        break;
      }
    }
  }

  if (!phaseId) {
    return errorCtx('Could not determine phase number. Specify phase or check roadmap.');
  }

  // Extract phase info from roadmap
  const phaseRegex = new RegExp(`Phase ${phaseId.replace('.', '\\.')}:\\s*(.+?)(?=\\n|$)`);
  const nameMatch = roadmap.match(phaseRegex);
  const phaseName = nameMatch ? nameMatch[1].trim() : `Phase ${phaseId}`;

  // Get phase description (lines following phase header)
  const descRegex = new RegExp(`Phase ${phaseId.replace('.', '\\.')}:[^\\n]*\\n([\\s\\S]*?)(?=\\n## |\\nPhase \\d|$)`);
  const descMatch = roadmap.match(descRegex);
  const phaseDescription = descMatch ? descMatch[1].trim() : '';

  // Validate phase exists in roadmap
  if (!nameMatch) {
    const availablePhases = Array.from(roadmap.matchAll(/Phase (\d+(?:\.\d+)?)/g))
      .map(m => m[1])
      .join(', ');
    return errorCtx(`Phase ${phaseId} not found in roadmap. Available: ${availablePhases}`);
  }

  // Find or create phase directory
  let phaseDir = '';
  const phaseDirs = await findDirectories('.planning/phases', new RegExp(`^${phaseId.replace('.', '\\.')}-`));
  if (phaseDirs.length > 0) {
    phaseDir = phaseDirs[0];
  } else {
    const safeName = phaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
    phaseDir = `.planning/phases/${phaseId}-${safeName}`;
    await fs.mkdir(phaseDir, { recursive: true });
  }

  // Check for existing research and plans
  const researchFiles = await findFiles(phaseDir, /-RESEARCH\.md$/);
  const planFiles = await findFiles(phaseDir, /-PLAN\.md$/);

  // Read config
  let config = { workflowResearch: true, workflowPlanCheck: true };
  let modelProfile = 'balanced';

  try {
    const configJson = await readFile('.planning/config.json');
    if (configJson) {
      const parsed = JSON.parse(configJson);
      config.workflowResearch = parsed.workflow?.research !== false;
      config.workflowPlanCheck = parsed.workflow?.plan_check !== false;
      modelProfile = parsed.model_profile || 'balanced';
    }
  } catch {
    // Use defaults
  }

  // Determine if research is needed
  const hasResearch = researchFiles.length > 0;
  let needsResearch = false;

  if (!flags.gaps && !flags.skipResearch) {
    if (config.workflowResearch) {
      if (flags.research || !hasResearch) {
        needsResearch = true;
      }
    }
  }

  return {
    phaseId,
    phaseName,
    phaseDescription,
    phaseDir,
    hasResearch,
    hasPlans: planFiles.length > 0,
    planCount: planFiles.length,
    planFiles,
    needsResearch,
    flags,
    models: resolveModels(modelProfile),
    modelProfile,
    config,
    mascot: randomCatName(),
  };
}

/**
 * Check existing plans and return details
 */
export async function checkExistingPlans(args: { phaseDir: string }): Promise<{
  hasPlans: boolean;
  planCount: number;
  planFiles: string[];
  planSummary: string;
}> {
  const planFiles = await findFiles(args.phaseDir, /-PLAN\.md$/);

  if (planFiles.length === 0) {
    return {
      hasPlans: false,
      planCount: 0,
      planFiles: [],
      planSummary: '',
    };
  }

  // Build summary of existing plans
  const summaryLines: string[] = [];
  for (const file of planFiles) {
    const content = await readFile(file);
    const basename = path.basename(file, '.md');

    // Extract wave from frontmatter
    const waveMatch = content.match(/wave:\s*(\d+)/);
    const wave = waveMatch ? waveMatch[1] : '1';

    // Extract first objective if available
    const objMatch = content.match(/##.*(?:objective|goal)[^\n]*\n([^\n]+)/i);
    const objective = objMatch ? objMatch[1].trim().slice(0, 50) + '...' : '-';

    summaryLines.push(`- ${basename} (wave ${wave}): ${objective}`);
  }

  return {
    hasPlans: true,
    planCount: planFiles.length,
    planFiles,
    planSummary: summaryLines.join('\n'),
  };
}

/**
 * Build prompt for researcher agent with inlined context
 */
export async function buildResearcherPrompt(args: {
  phaseId: string;
  phaseName: string;
  phaseDir: string;
  phaseDescription: string;
}): Promise<PromptResult> {
  // Gather all context files
  const roadmap = await readFile('.planning/ROADMAP.md');
  const requirements = await readFile('.planning/REQUIREMENTS.md');
  const state = await readFile('.planning/STATE.md');
  const phaseContext = await readFile(`${args.phaseDir}/${args.phaseId}-CONTEXT.md`);

  // Extract prior decisions from STATE.md
  const decisionsMatch = state.match(/### Decisions Made[\s\S]*?(?=###|$)/);
  const decisions = decisionsMatch ? decisionsMatch[0] : '';

  const prompt = `<objective>
Research how to implement Phase ${args.phaseId}: ${args.phaseName}

Answer: "What do I need to know to PLAN this phase well?"
</objective>

<context>
**Phase description:**
${args.phaseDescription}

**Requirements (if any):**
${requirements.slice(0, 3000)}

**Prior decisions:**
${decisions}

**Phase context (if any):**
${phaseContext}
</context>

<output>
Write research findings to: ${args.phaseDir}/${args.phaseId}-RESEARCH.md
</output>`;

  return { prompt };
}

/**
 * Build prompt for planner agent with inlined context
 */
export async function buildPlannerPrompt(args: {
  phaseId: string;
  phaseName: string;
  phaseDir: string;
  mode: 'standard' | 'gap_closure' | 'revision';
  issues?: string[];
}): Promise<PromptResult> {
  // Read all context files
  const state = await readFile('.planning/STATE.md');
  const roadmap = await readFile('.planning/ROADMAP.md');
  const requirements = await readFile('.planning/REQUIREMENTS.md');
  const context = await readFile(`${args.phaseDir}/${args.phaseId}-CONTEXT.md`);
  const research = await readFile(`${args.phaseDir}/${args.phaseId}-RESEARCH.md`);

  // Gap closure mode files
  const verification = args.mode === 'gap_closure'
    ? await readFile(`${args.phaseDir}/${args.phaseId}-VERIFICATION.md`)
    : '';
  const uat = args.mode === 'gap_closure'
    ? await readFile(`${args.phaseDir}/${args.phaseId}-UAT.md`)
    : '';

  // Revision mode: read current plans
  let currentPlans = '';
  if (args.mode === 'revision') {
    const planFiles = await findFiles(args.phaseDir, /-PLAN\.md$/);
    const plans = await Promise.all(planFiles.map(f => readFile(f)));
    currentPlans = plans.join('\n\n---\n\n');
  }

  let prompt: string;

  if (args.mode === 'revision') {
    // Revision mode prompt
    prompt = `<revision_context>

**Phase:** ${args.phaseId}
**Mode:** revision

**Existing plans:**
${currentPlans}

**Checker issues:**
${args.issues?.map((issue, i) => `${i + 1}. ${issue}`).join('\n') || 'None specified'}

</revision_context>

<instructions>
Make targeted updates to address checker issues.
Do NOT replan from scratch unless issues are fundamental.
Return what changed.
</instructions>`;
  } else {
    // Standard or gap_closure mode prompt
    prompt = `<planning_context>

**Phase:** ${args.phaseId} - ${args.phaseName}
**Mode:** ${args.mode}

**Project State:**
${state}

**Roadmap:**
${roadmap}

**Requirements (if exists):**
${requirements}

**Phase Context (if exists):**
${context}

**Research (if exists):**
${research}

${args.mode === 'gap_closure' ? `**Gap Closure:**
VERIFICATION.md:
${verification}

UAT.md:
${uat}
` : ''}
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
</quality_gate>`;
  }

  return { prompt };
}

/**
 * Build prompt for checker agent
 */
export async function buildCheckerPrompt(args: {
  phaseId: string;
  phaseDir: string;
}): Promise<{ prompt: string; phaseGoal: string }> {
  // Read plans
  const planFiles = await findFiles(args.phaseDir, /-PLAN\.md$/);
  const plans = await Promise.all(planFiles.map(f => readFile(f)));
  const plansContent = plans.join('\n\n---\n\n');

  // Read requirements
  const requirements = await readFile('.planning/REQUIREMENTS.md');

  // Extract phase goal from roadmap
  const roadmap = await readFile('.planning/ROADMAP.md');
  const goalRegex = new RegExp(`Phase ${args.phaseId.replace('.', '\\.')}:[^\\n]*`);
  const goalMatch = roadmap.match(goalRegex);
  const phaseGoal = goalMatch ? goalMatch[0] : `Phase ${args.phaseId}`;

  const prompt = `<verification_context>

**Phase:** ${args.phaseId}
**Phase Goal:** ${phaseGoal}

**Plans to verify:**
${plansContent}

**Requirements (if exists):**
${requirements}

</verification_context>

<expected_output>
Return one of:
- ## VERIFICATION PASSED — all checks pass
- ## ISSUES FOUND — structured issue list
</expected_output>`;

  return {
    prompt,
    phaseGoal,
  };
}

/**
 * Parse agent output to extract status
 */
export async function parseAgentStatus(args: { output: string }): Promise<{
  status: 'COMPLETE' | 'BLOCKED' | 'INCONCLUSIVE' | 'CHECKPOINT' | 'PASSED' | 'ISSUES_FOUND';
  message: string;
  issues: string[];
}> {
  const output = args.output;

  // Check for various status markers
  if (output.includes('## RESEARCH COMPLETE') || output.includes('## PLANNING COMPLETE')) {
    return { status: 'COMPLETE', message: 'Agent completed successfully', issues: [] };
  }

  if (output.includes('## RESEARCH BLOCKED') || output.includes('## PLANNING BLOCKED')) {
    // Extract blocker reason
    const blockerMatch = output.match(/## (?:RESEARCH|PLANNING) BLOCKED[:\s]*([^\n]+)?/);
    return {
      status: 'BLOCKED',
      message: blockerMatch?.[1] || 'Agent encountered a blocker',
      issues: [],
    };
  }

  if (output.includes('## CHECKPOINT REACHED')) {
    const checkpointMatch = output.match(/## CHECKPOINT REACHED[:\s]*([^\n]+)?/);
    return {
      status: 'CHECKPOINT',
      message: checkpointMatch?.[1] || 'Checkpoint reached',
      issues: [],
    };
  }

  if (output.includes('## PLANNING INCONCLUSIVE')) {
    return { status: 'INCONCLUSIVE', message: 'Planning was inconclusive', issues: [] };
  }

  if (output.includes('## VERIFICATION PASSED')) {
    return { status: 'PASSED', message: 'Verification passed', issues: [] };
  }

  if (output.includes('## ISSUES FOUND')) {
    // Extract issues list
    const issuesSection = output.split('## ISSUES FOUND')[1] || '';
    const issueMatches = issuesSection.match(/[-*]\s+(.+)/g) || [];
    const issues = issueMatches.map(m => m.replace(/^[-*]\s+/, '').trim());

    return {
      status: 'ISSUES_FOUND',
      message: `Found ${issues.length} issue(s)`,
      issues,
    };
  }

  // Default: assume complete if no explicit status
  return { status: 'COMPLETE', message: 'Agent completed (no explicit status)', issues: [] };
}

/**
 * Gather context for research agent (legacy, kept for compatibility)
 */
export async function getResearchContext(args: {
  phaseId: string;
  phaseDir: string;
}): Promise<ResearchContext> {
  const roadmap = await readFile('.planning/ROADMAP.md');
  const requirements = await readFile('.planning/REQUIREMENTS.md');
  const state = await readFile('.planning/STATE.md');
  const phaseContext = await readFile(`${args.phaseDir}/${args.phaseId}-CONTEXT.md`);

  // Extract phase description
  const phaseRegex = new RegExp(`Phase ${args.phaseId.replace('.', '\\.')}:[^\\n]*\\n([\\s\\S]*?)(?=\\n## |\\nPhase \\d|$)`);
  const descMatch = roadmap.match(phaseRegex);
  const phaseDescription = descMatch ? descMatch[1].trim() : '';

  // Extract decisions from STATE.md
  const decisionsMatch = state.match(/### Decisions Made[\s\S]*?(?=###|$)/);
  const decisions = decisionsMatch ? decisionsMatch[0] : '';

  return {
    phaseDescription,
    requirements: requirements.slice(0, 2000), // Limit size
    decisions,
    phaseContext,
  };
}

/**
 * Gather context for planning agent (legacy, kept for compatibility)
 */
export async function getPlanningContext(args: {
  phaseDir: string;
  phaseId: string;
  gaps: boolean;
}): Promise<PlanningContext> {
  const state = await readFile('.planning/STATE.md');
  const roadmap = await readFile('.planning/ROADMAP.md');
  const requirements = await readFile('.planning/REQUIREMENTS.md');
  const context = await readFile(`${args.phaseDir}/${args.phaseId}-CONTEXT.md`);
  const research = await readFile(`${args.phaseDir}/${args.phaseId}-RESEARCH.md`);
  const verification = args.gaps ? await readFile(`${args.phaseDir}/${args.phaseId}-VERIFICATION.md`) : '';
  const uat = args.gaps ? await readFile(`${args.phaseDir}/${args.phaseId}-UAT.md`) : '';

  return { state, roadmap, requirements, context, research, verification, uat };
}

/**
 * Gather context for verification agent
 */
export async function getVerificationContext(args: {
  phaseDir: string;
  phaseId: string;
}): Promise<{ plans: string; requirements: string; phaseGoal: string }> {
  const planFiles = await findFiles(args.phaseDir, /-PLAN\.md$/);
  const plans = await Promise.all(planFiles.map(f => readFile(f)));
  const requirements = await readFile('.planning/REQUIREMENTS.md');
  const roadmap = await readFile('.planning/ROADMAP.md');

  // Extract phase goal
  const goalRegex = new RegExp(`Phase ${args.phaseId.replace('.', '\\.')}:[^\\n]*`);
  const goalMatch = roadmap.match(goalRegex);
  const phaseGoal = goalMatch ? goalMatch[0] : '';

  return {
    plans: plans.join('\n\n---\n\n'),
    requirements,
    phaseGoal,
  };
}

/**
 * Prepare revision context for planner
 */
export async function prepareRevisionContext(args: {
  issues: string[];
  phaseDir: string;
}): Promise<string> {
  const planFiles = await findFiles(args.phaseDir, /-PLAN\.md$/);
  const plans = await Promise.all(planFiles.map(f => readFile(f)));

  return `
## Current Plans

${plans.join('\n\n---\n\n')}

## Issues to Address

${args.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

## Instructions

Make targeted updates to address the issues above.
Do NOT replan from scratch unless issues are fundamental.
`;
}

/**
 * Read and display existing plans
 */
export async function readAndDisplayPlans(args: { phaseDir: string }): Promise<string> {
  const planFiles = await findFiles(args.phaseDir, /-PLAN\.md$/);
  const plans = await Promise.all(planFiles.map(async f => {
    const content = await readFile(f);
    return `### ${path.basename(f)}\n\n${content}`;
  }));
  return plans.join('\n\n---\n\n');
}

/**
 * Archive existing plans before replanning
 */
export async function archiveExistingPlans(args: { phaseDir: string }): Promise<void> {
  const planFiles = await findFiles(args.phaseDir, /-PLAN\.md$/);
  const archiveDir = `${args.phaseDir}/archive`;
  await fs.mkdir(archiveDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  for (const file of planFiles) {
    const basename = path.basename(file);
    await fs.rename(file, `${archiveDir}/${timestamp}-${basename}`);
  }
}

/**
 * Generate summary of planning session
 */
export async function generateSummary(args: {
  phaseId: string;
  phaseName: string;
  phaseDir: string;
  checkerPassed: boolean;
  skipVerify: boolean;
  hasResearch: boolean;
  forcedResearch: boolean;
  skippedResearch: boolean;
}): Promise<PlanSummary> {
  const planFiles = await findFiles(args.phaseDir, /-PLAN\.md$/);

  // Parse waves from plans
  const waves: { wave: number; plans: string[]; objective: string }[] = [];
  for (const file of planFiles) {
    const content = await readFile(file);
    const waveMatch = content.match(/wave:\s*(\d+)/);
    const wave = waveMatch ? parseInt(waveMatch[1]) : 1;

    // Extract objective
    const objMatch = content.match(/##.*(?:objective|goal)[^\n]*\n([^\n]+)/i);
    const objective = objMatch ? objMatch[1].trim() : '';

    const existing = waves.find(w => w.wave === wave);
    const planName = path.basename(file, '.md');
    if (existing) {
      existing.plans.push(planName);
      if (!existing.objective && objective) {
        existing.objective = objective;
      }
    } else {
      waves.push({ wave, plans: [planName], objective });
    }
  }
  waves.sort((a, b) => a.wave - b.wave);

  // Determine research status
  let research: 'completed' | 'existing' | 'skipped';
  if (args.skippedResearch) {
    research = 'skipped';
  } else if (args.forcedResearch || !args.hasResearch) {
    research = 'completed';
  } else {
    research = 'existing';
  }

  // Determine verification status
  let verification: 'passed' | 'override' | 'skipped';
  if (args.skipVerify) {
    verification = 'skipped';
  } else if (args.checkerPassed) {
    verification = 'passed';
  } else {
    verification = 'override';
  }

  return {
    phaseId: args.phaseId,
    phaseName: args.phaseName,
    planCount: planFiles.length,
    waveCount: waves.length,
    waves,
    research,
    verification,
  };
}

/**
 * Format summary as markdown
 */
export async function formatSummaryMarkdown(args: { summary: PlanSummary }): Promise<string> {
  const { summary } = args;

  const waveTable = summary.waves.map(w =>
    `| ${w.wave} | ${w.plans.join(', ')} | ${w.objective || '-'} |`
  ).join('\n');

  const researchStatus = {
    completed: 'Completed',
    existing: 'Used existing',
    skipped: 'Skipped',
  }[summary.research];

  const verificationStatus = {
    passed: 'Passed',
    override: 'Passed with override',
    skipped: 'Skipped',
  }[summary.verification];

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE ${summary.phaseId} PLANNED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase ${summary.phaseId}: ${summary.phaseName}** — ${summary.planCount} plan(s) in ${summary.waveCount} wave(s)

| Wave | Plans | What it builds |
|------|-------|----------------|
${waveTable}

Research: ${researchStatus}
Verification: ${verificationStatus}

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Execute Phase ${summary.phaseId}** — run all ${summary.planCount} plans

\`/gsd:execute-phase ${summary.phaseId}\`

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- cat .planning/phases/${summary.phaseId}-*/*-PLAN.md — review plans
- /gsd:plan-phase ${summary.phaseId} --research — re-research first

───────────────────────────────────────────────────────────────
`;
}
