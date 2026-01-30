/**
 * plan-phase.runtime.ts - TypeScript runtime for plan-phase command
 *
 * This file contains all deterministic logic extracted from the TSX.
 * It will be compiled to .js and executed via the js-proxy skill.
 *
 * Each exported function corresponds to a <Script fn="..."> in the TSX.
 *
 * NOTE: This is a prototype showing the structure, not a complete implementation.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Type Definitions
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

interface CheckerIssue {
  severity: 'error' | 'warning';
  message: string;
  location?: string;
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
// Model Resolution Table
// ============================================================================

const MODEL_TABLE = {
  quality: { researcher: 'opus', planner: 'opus', checker: 'sonnet' },
  balanced: { researcher: 'sonnet', planner: 'opus', checker: 'sonnet' },
  budget: { researcher: 'haiku', planner: 'sonnet', checker: 'haiku' },
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

function readFileOrNull(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function globSync(pattern: string): string[] {
  // Simplified glob - in real impl would use a glob library
  const dir = path.dirname(pattern);
  const filePattern = path.basename(pattern).replace('*', '');

  try {
    return fs.readdirSync(dir)
      .filter((f) => f.includes(filePattern.replace('*', '')))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

function normalizePhase(phase: string): string {
  // 8 -> "08", 2.1 -> "02.1"
  if (/^\d+$/.test(phase)) {
    return phase.padStart(2, '0');
  }
  const match = phase.match(/^(\d+)\.(\d+)$/);
  if (match) {
    return `${match[1].padStart(2, '0')}.${match[2]}`;
  }
  return phase;
}

function parseArguments(args: string): {
  phase: string | null;
  flags: string[];
} {
  const parts = args.trim().split(/\s+/);
  const flags: string[] = [];
  let phase: string | null = null;

  for (const part of parts) {
    if (part.startsWith('--')) {
      flags.push(part);
    } else if (/^\d+(\.\d+)?$/.test(part)) {
      phase = part;
    }
  }

  return { phase, flags };
}

function readConfig(): { model_profile?: string; workflow?: { research?: boolean; plan_check?: boolean } } {
  const configPath = '.planning/config.json';
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return {};
  }
}

function getPhaseFromRoadmap(phaseId: string): { name: string; description: string } | null {
  const roadmap = readFileOrNull('.planning/ROADMAP.md');
  if (!roadmap) return null;

  // Parse roadmap for phase info
  const regex = new RegExp(`Phase ${phaseId}:\\s*(.+?)\\n([\\s\\S]*?)(?=Phase \\d|$)`, 'i');
  const match = roadmap.match(regex);

  if (match) {
    return {
      name: match[1].trim(),
      description: match[2].trim().slice(0, 500), // First 500 chars
    };
  }
  return null;
}

function detectNextUnplannedPhase(): string | null {
  const roadmap = readFileOrNull('.planning/ROADMAP.md');
  if (!roadmap) return null;

  // Find all phases
  const phases = roadmap.match(/Phase (\d+):/g);
  if (!phases) return null;

  for (const phaseMatch of phases) {
    const num = phaseMatch.match(/\d+/)?.[0];
    if (num) {
      const normalized = normalizePhase(num);
      const planFiles = globSync(`.planning/phases/${normalized}-*/*-PLAN.md`);
      if (planFiles.length === 0) {
        return normalized;
      }
    }
  }
  return null;
}

function resolvePhaseDir(phaseId: string): string {
  // Try to find existing dir
  const existing = globSync(`.planning/phases/${phaseId}-*`);
  if (existing.length > 0) {
    return existing[0];
  }

  // Create new dir from roadmap name
  const phaseInfo = getPhaseFromRoadmap(phaseId);
  const dirName = phaseInfo
    ? phaseInfo.name.toLowerCase().replace(/\s+/g, '-')
    : 'unnamed';

  const newDir = `.planning/phases/${phaseId}-${dirName}`;
  fs.mkdirSync(newDir, { recursive: true });
  return newDir;
}

// ============================================================================
// Exported Functions (called via <Script fn="...">)
// ============================================================================

/**
 * Initialize command context.
 * Called at the start to gather all deterministic info.
 */
export async function init(args: { arguments: string }): Promise<PlanPhaseContext> {
  // Check environment
  if (!fs.existsSync('.planning')) {
    return {
      error: '.planning/ directory not found. Run /gsd:new-project first.',
    } as PlanPhaseContext;
  }

  // Parse arguments
  const parsed = parseArguments(args.arguments);

  // Determine phase
  let phaseId = parsed.phase;
  if (!phaseId) {
    phaseId = detectNextUnplannedPhase();
    if (!phaseId) {
      return {
        error: 'No phase specified and no unplanned phases found in roadmap.',
      } as PlanPhaseContext;
    }
  }
  phaseId = normalizePhase(phaseId);

  // Validate phase exists in roadmap
  const phaseInfo = getPhaseFromRoadmap(phaseId);
  if (!phaseInfo) {
    return {
      error: `Phase ${phaseId} not found in ROADMAP.md`,
    } as PlanPhaseContext;
  }

  // Resolve/create phase directory
  const phaseDir = resolvePhaseDir(phaseId);

  // Check for existing files
  const researchFiles = globSync(`${phaseDir}/*-RESEARCH.md`);
  const planFiles = globSync(`${phaseDir}/*-PLAN.md`);

  // Read config
  const config = readConfig();
  const modelProfile = (config.model_profile as 'quality' | 'balanced' | 'budget') || 'balanced';

  return {
    phaseId,
    phaseDir,
    phaseName: phaseInfo.name,
    phaseDescription: phaseInfo.description,
    hasResearch: researchFiles.length > 0,
    hasPlans: planFiles.length > 0,
    planCount: planFiles.length,
    modelProfile,
    models: MODEL_TABLE[modelProfile],
    flags: {
      research: parsed.flags.includes('--research'),
      skipResearch: parsed.flags.includes('--skip-research'),
      gaps: parsed.flags.includes('--gaps'),
      skipVerify: parsed.flags.includes('--skip-verify'),
    },
    config: {
      workflowResearch: config.workflow?.research !== false,
      workflowPlanCheck: config.workflow?.plan_check !== false,
    },
  };
}

/**
 * Gather context for the researcher agent.
 */
export async function getResearchContext(args: {
  phaseId: string;
  phaseDir: string;
}): Promise<ResearchContext> {
  const phaseInfo = getPhaseFromRoadmap(args.phaseId);

  return {
    phaseDescription: phaseInfo?.description || '',
    requirements: readFileOrNull('.planning/REQUIREMENTS.md'),
    decisions: extractSection(readFileOrNull('.planning/STATE.md'), '### Decisions Made'),
    phaseContext: readFileOrNull(`${args.phaseDir}/${args.phaseId}-CONTEXT.md`),
  };
}

/**
 * Gather all context for the planner agent.
 */
export async function getPlanningContext(args: {
  phaseDir: string;
  phaseId: string;
  gaps: boolean;
}): Promise<PlanningContext> {
  return {
    state: readFileOrNull('.planning/STATE.md') || '',
    roadmap: readFileOrNull('.planning/ROADMAP.md') || '',
    requirements: readFileOrNull('.planning/REQUIREMENTS.md'),
    research: readFileOrNull(`${args.phaseDir}/${args.phaseId}-RESEARCH.md`),
    context: readFileOrNull(`${args.phaseDir}/${args.phaseId}-CONTEXT.md`),
    verification: args.gaps ? readFileOrNull(`${args.phaseDir}/${args.phaseId}-VERIFICATION.md`) : null,
    uat: args.gaps ? readFileOrNull(`${args.phaseDir}/${args.phaseId}-UAT.md`) : null,
  };
}

/**
 * Get verification context (plans content).
 */
export async function getVerificationContext(args: {
  phaseDir: string;
  phaseId: string;
}): Promise<PlanningContext> {
  const planFiles = globSync(`${args.phaseDir}/*-PLAN.md`);
  const plansContent = planFiles.map((f) => readFileOrNull(f)).filter(Boolean).join('\n\n---\n\n');

  return {
    state: plansContent, // Reusing field for plans
    roadmap: readFileOrNull('.planning/ROADMAP.md') || '',
    requirements: readFileOrNull('.planning/REQUIREMENTS.md'),
    research: null,
    context: null,
    verification: null,
    uat: null,
  };
}

/**
 * Prepare context for revision iteration.
 */
export async function prepareRevisionContext(args: {
  issues: CheckerIssue[];
  phaseDir: string;
}): Promise<string> {
  const planFiles = globSync(`${args.phaseDir}/*-PLAN.md`);
  const plansContent = planFiles.map((f) => readFileOrNull(f)).filter(Boolean).join('\n\n---\n\n');

  const issuesFormatted = args.issues
    .map((i) => `- [${i.severity.toUpperCase()}] ${i.message}${i.location ? ` (${i.location})` : ''}`)
    .join('\n');

  return `## Existing Plans\n\n${plansContent}\n\n## Issues to Address\n\n${issuesFormatted}`;
}

/**
 * Initialize iteration counter.
 */
export async function initIteration(): Promise<number> {
  return 0;
}

/**
 * Read and display existing plans.
 */
export async function readAndDisplayPlans(args: { phaseDir: string }): Promise<string> {
  const planFiles = globSync(`${args.phaseDir}/*-PLAN.md`);
  return planFiles.map((f) => {
    const content = readFileOrNull(f);
    return `### ${path.basename(f)}\n\n${content}`;
  }).join('\n\n---\n\n');
}

/**
 * Archive existing plans before replan.
 */
export async function archiveExistingPlans(args: { phaseDir: string }): Promise<void> {
  const archiveDir = path.join(args.phaseDir, '.archive', new Date().toISOString().slice(0, 10));
  fs.mkdirSync(archiveDir, { recursive: true });

  const planFiles = globSync(`${args.phaseDir}/*-PLAN.md`);
  for (const file of planFiles) {
    fs.renameSync(file, path.join(archiveDir, path.basename(file)));
  }
}

/**
 * Format remaining issues for display.
 */
export async function formatRemainingIssues(args: { issues: CheckerIssue[] }): Promise<string> {
  return args.issues
    .map((i, idx) => `${idx + 1}. **[${i.severity}]** ${i.message}${i.location ? `\n   Location: ${i.location}` : ''}`)
    .join('\n\n');
}

/**
 * Generate summary data from plan files.
 */
export async function generateSummary(args: {
  ctx: PlanPhaseContext;
  checkerPassed: boolean;
  skipVerify: boolean;
  hasResearch: boolean;
  forcedResearch: boolean;
  skippedResearch: boolean;
}): Promise<PlanSummary> {
  const planFiles = globSync(`${args.ctx.phaseDir}/*-PLAN.md`);

  // Parse waves from plan frontmatter
  const waves: Map<number, { plans: string[]; objectives: string[] }> = new Map();

  for (const file of planFiles) {
    const content = readFileOrNull(file);
    if (!content) continue;

    const waveMatch = content.match(/wave:\s*(\d+)/);
    const wave = waveMatch ? parseInt(waveMatch[1], 10) : 1;

    const objectiveMatch = content.match(/objective:\s*(.+)/);
    const objective = objectiveMatch ? objectiveMatch[1].trim() : 'Unknown';

    if (!waves.has(wave)) {
      waves.set(wave, { plans: [], objectives: [] });
    }
    waves.get(wave)!.plans.push(path.basename(file, '.md'));
    waves.get(wave)!.objectives.push(objective);
  }

  // Determine statuses
  let researchStatus: 'completed' | 'existing' | 'skipped' = 'skipped';
  if (args.skippedResearch) {
    researchStatus = 'skipped';
  } else if (args.forcedResearch) {
    researchStatus = 'completed';
  } else if (args.hasResearch) {
    researchStatus = 'existing';
  }

  let verificationStatus: 'passed' | 'override' | 'skipped' = 'skipped';
  if (args.skipVerify) {
    verificationStatus = 'skipped';
  } else if (args.checkerPassed) {
    verificationStatus = 'passed';
  } else {
    verificationStatus = 'override';
  }

  return {
    planCount: planFiles.length,
    waveCount: waves.size,
    waves: Array.from(waves.entries())
      .sort(([a], [b]) => a - b)
      .map(([wave, data]) => ({
        wave,
        plans: data.plans,
        objective: data.objectives[0], // Simplified: take first objective
      })),
    researchStatus,
    verificationStatus,
  };
}

/**
 * Format summary as markdown.
 */
export async function formatSummaryMarkdown(args: {
  summary: PlanSummary;
  ctx: PlanPhaseContext;
}): Promise<string> {
  const { summary, ctx } = args;

  const waveRows = summary.waves
    .map((w) => `| ${w.wave} | ${w.plans.join(', ')} | ${w.objective} |`)
    .join('\n');

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE ${ctx.phaseId} PLANNED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase ${ctx.phaseId}: ${ctx.phaseName}** — ${summary.planCount} plan(s) in ${summary.waveCount} wave(s)

| Wave | Plans | What it builds |
|------|-------|----------------|
${waveRows}

Research: ${summary.researchStatus.charAt(0).toUpperCase() + summary.researchStatus.slice(1)}
Verification: ${summary.verificationStatus.charAt(0).toUpperCase() + summary.verificationStatus.slice(1)}

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Execute Phase ${ctx.phaseId}** — run all ${summary.planCount} plans

\`/gsd:execute-phase ${ctx.phaseId}\`

_/clear first → fresh context window_

───────────────────────────────────────────────────────────────

**Also available:**
- \`cat ${ctx.phaseDir}/*-PLAN.md\` — review plans
- \`/gsd:plan-phase ${ctx.phaseId} --research\` — re-research first

───────────────────────────────────────────────────────────────
`;
}

// ============================================================================
// Helper: Extract section from markdown
// ============================================================================

function extractSection(content: string | null, heading: string): string | null {
  if (!content) return null;

  const regex = new RegExp(`${heading}\\n([\\s\\S]*?)(?=\\n##|$)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const fnName = args[0];
  const fnArgs = args[1] ? JSON.parse(args[1]) : {};

  const functions: Record<string, Function> = {
    init,
    getResearchContext,
    getPlanningContext,
    getVerificationContext,
    prepareRevisionContext,
    initIteration,
    readAndDisplayPlans,
    archiveExistingPlans,
    formatRemainingIssues,
    generateSummary,
    formatSummaryMarkdown,
  };

  if (!functions[fnName]) {
    console.error(JSON.stringify({ error: `Unknown function: ${fnName}` }));
    process.exit(1);
  }

  try {
    const result = await functions[fnName](fnArgs);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ error: String(err) }));
    process.exit(1);
  }
}

main();
