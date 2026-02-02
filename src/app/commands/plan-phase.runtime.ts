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
  // Shorthand model accessors for TSX
  researcherModel: 'opus' | 'sonnet' | 'haiku';
  plannerModel: 'opus' | 'sonnet' | 'haiku';
  checkerModel: 'opus' | 'sonnet' | 'haiku';
  config: {
    workflowResearch: boolean;
    workflowPlanCheck: boolean;
  };
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
    researcherModel: 'sonnet',
    plannerModel: 'opus',
    checkerModel: 'sonnet',
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

  const models = resolveModels(modelProfile);

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
    models,
    modelProfile,
    config,
    researcherModel: models.researcher,
    plannerModel: models.planner,
    checkerModel: models.checker,
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
