/**
 * new-project.runtime.ts - Runtime functions for V3 new-project command
 *
 * These functions handle file I/O, context assembly, prompt building,
 * and summary generation for the /gsd:new-project command.
 *
 * Design: Maximize runtime logic (JS over Markdown)
 * - File I/O, parsing → runtime
 * - Path resolution, context assembly → runtime
 * - Model lookup, prompt building → runtime
 * - Agent prompts, banners → TSX (markdown)
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface NewProjectFlags {
  skipResearch: boolean;
  skipMapping: boolean;
}

export interface BrownfieldDetection {
  hasCodeFiles: boolean;
  hasPackageFile: boolean;
  hasCodebaseMap: boolean;
  codeFilesPreview: string[];
}

export interface WorkflowConfig {
  mode: 'yolo' | 'interactive';
  depth: 'quick' | 'standard' | 'comprehensive';
  parallelization: boolean;
  commitDocs: boolean;
  modelProfile: 'quality' | 'balanced' | 'budget';
  workflow: {
    research: boolean;
    planCheck: boolean;
    verifier: boolean;
  };
}

export interface ModelConfig {
  researcher: 'opus' | 'sonnet' | 'haiku';
  synthesizer: 'opus' | 'sonnet' | 'haiku';
  roadmapper: 'opus' | 'sonnet' | 'haiku';
}

export interface NewProjectContext {
  error?: string;
  projectExists: boolean;
  gitInitialized: boolean;
  brownfield: BrownfieldDetection;
  flags: NewProjectFlags;
  models: ModelConfig;
  modelProfile: string;
  agentPaths: {
    researcher: string;
    synthesizer: string;
    roadmapper: string;
  };
}

export interface QuestioningContext {
  projectName: string;
  projectDescription: string;
  coreValue: string;
  requirements: string[];
  outOfScope: string[];
  context: string;
  constraints: string[];
  decisions: Array<{ decision: string; rationale: string }>;
}

export interface ResearcherPrompt {
  dimension: 'stack' | 'features' | 'architecture' | 'pitfalls';
  prompt: string;
  outputPath: string;
}

export interface RequirementsData {
  v1Requirements: Array<{ id: string; category: string; description: string }>;
  v2Requirements: Array<{ id: string; category: string; description: string }>;
  outOfScope: Array<{ feature: string; reason: string }>;
}

export interface RoadmapSummary {
  phaseCount: number;
  requirementCount: number;
  phases: Array<{
    number: number;
    name: string;
    goal: string;
    requirementIds: string[];
    criteriaCount: number;
  }>;
}

export interface AgentResult {
  status: 'COMPLETE' | 'BLOCKED' | 'CREATED' | 'REVISED';
  message?: string;
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

async function findCodeFiles(dir: string): Promise<string[]> {
  const codeExtensions = ['.ts', '.js', '.py', '.go', '.rs', '.swift', '.java', '.tsx', '.jsx'];
  const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '__pycache__', '.next'];
  const results: string[] = [];
  const queue: Array<{ dir: string; depth: number }> = [{ dir, depth: 0 }];

  while (queue.length > 0 && results.length < 20) {
    const item = queue.shift();
    if (!item || item.depth > 3) continue;

    try {
      const entries = await fs.readdir(item.dir, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= 20) break;

        const fullPath = path.join(item.dir, entry.name);
        if (entry.isDirectory()) {
          if (!ignoreDirs.includes(entry.name)) {
            queue.push({ dir: fullPath, depth: item.depth + 1 });
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (codeExtensions.includes(ext)) {
            results.push(fullPath);
          }
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  return results;
}

function parseFlags(args: string): NewProjectFlags {
  return {
    skipResearch: args.includes('--skip-research'),
    skipMapping: args.includes('--skip-mapping'),
  };
}

// ============================================================================
// Model Resolution
// ============================================================================

export function resolveModels(profile: string): ModelConfig {
  const profiles: Record<string, ModelConfig> = {
    quality: { researcher: 'opus', synthesizer: 'sonnet', roadmapper: 'opus' },
    balanced: { researcher: 'sonnet', synthesizer: 'sonnet', roadmapper: 'sonnet' },
    budget: { researcher: 'haiku', synthesizer: 'haiku', roadmapper: 'sonnet' },
  };
  return profiles[profile] || profiles.balanced;
}

// Default agent paths
const DEFAULT_AGENT_PATHS = {
  researcher: '/Users/glenninizan/.claude/agents/gsd-project-researcher.md',
  synthesizer: '/Users/glenninizan/.claude/agents/gsd-research-synthesizer.md',
  roadmapper: '/Users/glenninizan/.claude/agents/gsd-roadmapper.md',
};

// ============================================================================
// Main Runtime Functions
// ============================================================================

/**
 * Initialize new-project context: check project state, init git, detect brownfield
 */
export async function init(args: { arguments: string }): Promise<NewProjectContext> {
  const errorCtx = (error: string): NewProjectContext => ({
    error,
    projectExists: false,
    gitInitialized: false,
    brownfield: {
      hasCodeFiles: false,
      hasPackageFile: false,
      hasCodebaseMap: false,
      codeFilesPreview: [],
    },
    flags: { skipResearch: false, skipMapping: false },
    models: { researcher: 'sonnet', synthesizer: 'sonnet', roadmapper: 'sonnet' },
    modelProfile: 'balanced',
    agentPaths: DEFAULT_AGENT_PATHS,
  });

  // Check if project already exists
  const projectExists = await fileExists('.planning/PROJECT.md');
  if (projectExists) {
    return errorCtx('Project already initialized. Use /gsd:progress to continue.');
  }

  // Parse flags
  const flags = parseFlags(args.arguments);

  // Check git status
  const gitExists = await fileExists('.git');

  // Brownfield detection
  const codeFiles = await findCodeFiles('.');
  const hasPackageFile =
    (await fileExists('package.json')) ||
    (await fileExists('requirements.txt')) ||
    (await fileExists('Cargo.toml')) ||
    (await fileExists('go.mod')) ||
    (await fileExists('Package.swift'));
  const hasCodebaseMap = await fileExists('.planning/codebase');

  const brownfield: BrownfieldDetection = {
    hasCodeFiles: codeFiles.length > 0,
    hasPackageFile,
    hasCodebaseMap,
    codeFilesPreview: codeFiles.slice(0, 5),
  };

  // Default model profile
  const modelProfile = 'balanced';
  const models = resolveModels(modelProfile);

  return {
    projectExists: false,
    gitInitialized: gitExists,
    brownfield,
    flags,
    models,
    modelProfile,
    agentPaths: DEFAULT_AGENT_PATHS,
  };
}

/**
 * Build PROJECT.md content from questioning context
 */
export async function buildProjectMd(args: {
  questioning: QuestioningContext;
  isBrownfield: boolean;
}): Promise<{ content: string; path: string }> {
  const { questioning, isBrownfield } = args;
  const today = new Date().toISOString().split('T')[0];

  // Build decisions table
  const decisionsTable =
    questioning.decisions.length > 0
      ? questioning.decisions
          .map((d) => `| ${d.decision} | ${d.rationale} | — Pending |`)
          .join('\n')
      : '| (None yet) | — | — |';

  // Build requirements section based on greenfield vs brownfield
  let requirementsSection: string;
  if (isBrownfield) {
    requirementsSection = `## Requirements

### Validated

(Inferred from existing code — see .planning/codebase/)

### Active

${questioning.requirements.map((r) => `- [ ] ${r}`).join('\n')}

### Out of Scope

${questioning.outOfScope.map((o) => `- ${o}`).join('\n') || '(None defined)'}`;
  } else {
    requirementsSection = `## Requirements

### Validated

(None yet — ship to validate)

### Active

${questioning.requirements.map((r) => `- [ ] ${r}`).join('\n')}

### Out of Scope

${questioning.outOfScope.map((o) => `- ${o}`).join('\n') || '(None defined)'}`;
  }

  const content = `# ${questioning.projectName}

## What This Is

${questioning.projectDescription}

## Core Value

${questioning.coreValue}

## Context

${questioning.context}

## Constraints

${questioning.constraints.map((c) => `- ${c}`).join('\n') || '(None specified)'}

${requirementsSection}

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
${decisionsTable}

---
*Last updated: ${today} after initialization*
`;

  return {
    content,
    path: '.planning/PROJECT.md',
  };
}

/**
 * Build researcher prompts for all 4 dimensions
 */
export async function buildResearcherPrompts(args: {
  projectName: string;
  projectDescription: string;
  coreValue: string;
  domain: string;
  milestoneContext: 'greenfield' | 'subsequent';
  agentPath: string;
}): Promise<ResearcherPrompt[]> {
  const { projectName, projectDescription, coreValue, domain, milestoneContext, agentPath } = args;

  const projectContext = `Project: ${projectName}
Description: ${projectDescription}
Core Value: ${coreValue}`;

  const milestoneNote =
    milestoneContext === 'greenfield'
      ? `Greenfield: Research the standard stack for building ${domain} from scratch.`
      : `Subsequent: Research what's needed to add new features to an existing ${domain} app.`;

  const prompts: ResearcherPrompt[] = [
    {
      dimension: 'stack',
      outputPath: '.planning/research/STACK.md',
      prompt: `First, read ${agentPath} for your role and instructions.

<research_type>
Project Research — Stack dimension for ${domain}.
</research_type>

<milestone_context>
${milestoneContext}

${milestoneNote}
</milestone_context>

<question>
What's the standard 2025 stack for ${domain}?
</question>

<project_context>
${projectContext}
</project_context>

<downstream_consumer>
Your STACK.md feeds into roadmap creation. Be prescriptive:
- Specific libraries with versions
- Clear rationale for each choice
- What NOT to use and why
</downstream_consumer>

<quality_gate>
- [ ] Versions are current (verify with Context7/official docs, not training data)
- [ ] Rationale explains WHY, not just WHAT
- [ ] Confidence levels assigned to each recommendation
</quality_gate>

<output>
Write to: .planning/research/STACK.md
</output>`,
    },
    {
      dimension: 'features',
      outputPath: '.planning/research/FEATURES.md',
      prompt: `First, read ${agentPath} for your role and instructions.

<research_type>
Project Research — Features dimension for ${domain}.
</research_type>

<milestone_context>
${milestoneContext}

${milestoneNote}
</milestone_context>

<question>
What features do ${domain} products have? What's table stakes vs differentiating?
</question>

<project_context>
${projectContext}
</project_context>

<downstream_consumer>
Your FEATURES.md feeds into requirements definition. Categorize clearly:
- Table stakes (must have or users leave)
- Differentiators (competitive advantage)
- Anti-features (things to deliberately NOT build)
</downstream_consumer>

<quality_gate>
- [ ] Categories are clear (table stakes vs differentiators vs anti-features)
- [ ] Complexity noted for each feature
- [ ] Dependencies between features identified
</quality_gate>

<output>
Write to: .planning/research/FEATURES.md
</output>`,
    },
    {
      dimension: 'architecture',
      outputPath: '.planning/research/ARCHITECTURE.md',
      prompt: `First, read ${agentPath} for your role and instructions.

<research_type>
Project Research — Architecture dimension for ${domain}.
</research_type>

<milestone_context>
${milestoneContext}

${milestoneNote}
</milestone_context>

<question>
How are ${domain} systems typically structured? What are major components?
</question>

<project_context>
${projectContext}
</project_context>

<downstream_consumer>
Your ARCHITECTURE.md informs phase structure in roadmap. Include:
- Component boundaries (what talks to what)
- Data flow (how information moves)
- Suggested build order (dependencies between components)
</downstream_consumer>

<quality_gate>
- [ ] Components clearly defined with boundaries
- [ ] Data flow direction explicit
- [ ] Build order implications noted
</quality_gate>

<output>
Write to: .planning/research/ARCHITECTURE.md
</output>`,
    },
    {
      dimension: 'pitfalls',
      outputPath: '.planning/research/PITFALLS.md',
      prompt: `First, read ${agentPath} for your role and instructions.

<research_type>
Project Research — Pitfalls dimension for ${domain}.
</research_type>

<milestone_context>
${milestoneContext}

${milestoneNote}
</milestone_context>

<question>
What do ${domain} projects commonly get wrong? Critical mistakes?
</question>

<project_context>
${projectContext}
</project_context>

<downstream_consumer>
Your PITFALLS.md prevents mistakes in roadmap/planning. For each pitfall:
- Warning signs (how to detect early)
- Prevention strategy (how to avoid)
- Which phase should address it
</downstream_consumer>

<quality_gate>
- [ ] Pitfalls are specific to this domain (not generic advice)
- [ ] Prevention strategies are actionable
- [ ] Phase mapping included where relevant
</quality_gate>

<output>
Write to: .planning/research/PITFALLS.md
</output>`,
    },
  ];

  return prompts;
}

/**
 * Build synthesizer prompt
 */
export async function buildSynthesizerPrompt(args: {
  projectName: string;
}): Promise<{ prompt: string }> {
  return {
    prompt: `<task>
Synthesize research outputs into SUMMARY.md.
</task>

<research_files>
Read these files:
- .planning/research/STACK.md
- .planning/research/FEATURES.md
- .planning/research/ARCHITECTURE.md
- .planning/research/PITFALLS.md
</research_files>

<output>
Write to: .planning/research/SUMMARY.md
Commit after writing.
</output>`,
  };
}

/**
 * Build roadmapper prompt
 */
export async function buildRoadmapperPrompt(args: {
  hasResearch: boolean;
  isRevision: boolean;
  revisionNotes?: string;
}): Promise<{ prompt: string }> {
  const { hasResearch, isRevision, revisionNotes } = args;

  if (isRevision && revisionNotes) {
    return {
      prompt: `<revision>
User feedback on roadmap:
${revisionNotes}

Current ROADMAP.md: @.planning/ROADMAP.md

Update the roadmap based on feedback. Edit files in place.
Return ROADMAP REVISED with changes made.
</revision>`,
    };
  }

  return {
    prompt: `<planning_context>

**Project:**
@.planning/PROJECT.md

**Requirements:**
@.planning/REQUIREMENTS.md

${
  hasResearch
    ? `**Research (if exists):**
@.planning/research/SUMMARY.md`
    : ''
}

**Config:**
@.planning/config.json

</planning_context>

<instructions>
Create roadmap:
1. Derive phases from requirements (don't impose structure)
2. Map every v1 requirement to exactly one phase
3. Derive 2-5 success criteria per phase (observable user behaviors)
4. Validate 100% coverage
5. Write files immediately (ROADMAP.md, STATE.md, update REQUIREMENTS.md traceability)
6. Return ROADMAP CREATED with summary

Write files first, then return. This ensures artifacts persist even if context is lost.
</instructions>`,
  };
}

/**
 * Build REQUIREMENTS.md content from scoping
 */
export async function buildRequirementsMd(args: {
  requirements: RequirementsData;
}): Promise<{ content: string; path: string }> {
  const { requirements } = args;

  // Group v1 requirements by category
  const v1ByCategory: Map<string, Array<{ id: string; category: string; description: string }>> = new Map();
  for (const req of requirements.v1Requirements) {
    const existing = v1ByCategory.get(req.category) || [];
    existing.push(req);
    v1ByCategory.set(req.category, existing);
  }

  // Build v1 section
  let v1Section = '## v1 Requirements\n\n';
  for (const [category, reqs] of v1ByCategory) {
    v1Section += `### ${category}\n\n`;
    for (const req of reqs) {
      v1Section += `- [ ] **${req.id}**: ${req.description}\n`;
    }
    v1Section += '\n';
  }

  // Build v2 section
  let v2Section = '## v2 Requirements (Deferred)\n\n';
  if (requirements.v2Requirements.length > 0) {
    for (const req of requirements.v2Requirements) {
      v2Section += `- ${req.id}: ${req.description}\n`;
    }
  } else {
    v2Section += '(None)\n';
  }

  // Build out of scope section
  let outOfScopeSection = '## Out of Scope\n\n';
  if (requirements.outOfScope.length > 0) {
    for (const item of requirements.outOfScope) {
      outOfScopeSection += `- **${item.feature}** — ${item.reason}\n`;
    }
  } else {
    outOfScopeSection += '(None)\n';
  }

  const content = `# Requirements

${v1Section}
${v2Section}
${outOfScopeSection}
## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
${requirements.v1Requirements.map((r) => `| ${r.id} | — | Pending |`).join('\n')}
`;

  return {
    content,
    path: '.planning/REQUIREMENTS.md',
  };
}

/**
 * Build config.json content from preferences
 */
export async function buildConfigJson(args: {
  config: WorkflowConfig;
}): Promise<{ content: string; path: string }> {
  const content = JSON.stringify(
    {
      mode: args.config.mode,
      depth: args.config.depth,
      parallelization: args.config.parallelization,
      commit_docs: args.config.commitDocs,
      model_profile: args.config.modelProfile,
      workflow: {
        research: args.config.workflow.research,
        plan_check: args.config.workflow.planCheck,
        verifier: args.config.workflow.verifier,
      },
    },
    null,
    2
  );

  return {
    content,
    path: '.planning/config.json',
  };
}

/**
 * Parse agent output to extract status
 */
export async function parseAgentStatus(args: { output: string }): Promise<AgentResult> {
  const output = args.output;

  if (output.includes('## ROADMAP CREATED') || output.includes('## SYNTHESIS COMPLETE')) {
    return { status: 'CREATED', message: 'Agent completed successfully' };
  }

  if (output.includes('## ROADMAP REVISED')) {
    return { status: 'REVISED', message: 'Roadmap revised successfully' };
  }

  if (output.includes('## RESEARCH COMPLETE')) {
    return { status: 'COMPLETE', message: 'Research completed' };
  }

  if (
    output.includes('## RESEARCH BLOCKED') ||
    output.includes('## ROADMAP BLOCKED') ||
    output.includes('## SYNTHESIS BLOCKED')
  ) {
    const blockerMatch = output.match(
      /## (?:RESEARCH|ROADMAP|SYNTHESIS) BLOCKED[:\s]*([^\n]+)?/
    );
    return {
      status: 'BLOCKED',
      message: blockerMatch?.[1] || 'Agent encountered a blocker',
    };
  }

  // Default: assume complete if no explicit status
  return { status: 'COMPLETE', message: 'Agent completed (no explicit status)' };
}

/**
 * Parse ROADMAP.md to extract summary for display table
 */
export async function parseRoadmapSummary(args: {
  roadmapPath: string;
}): Promise<RoadmapSummary> {
  const content = await readFile(args.roadmapPath);

  // Extract phases from roadmap
  const phases: RoadmapSummary['phases'] = [];
  const phaseRegex = /## Phase (\d+(?:\.\d+)?): (.+?)\n(?:.*?\n)*?(?:\*\*Goal:\*\*|Goal:)\s*(.+?)(?:\n|$)/g;

  let match;
  while ((match = phaseRegex.exec(content)) !== null) {
    const phaseNum = parseFloat(match[1]);
    const phaseName = match[2].trim();
    const goal = match[3].trim();

    // Extract requirements for this phase
    const reqPattern = new RegExp(
      `Phase ${match[1]}[\\s\\S]*?(?:Requirements:|\\*\\*Requirements:\\*\\*)\\s*([\\s\\S]*?)(?=\\n##|\\n\\*\\*Success|$)`,
      'g'
    );
    const reqMatch = reqPattern.exec(content);
    const reqIds: string[] = [];
    if (reqMatch) {
      const reqIdPattern = /[A-Z]+-\d+/g;
      let reqIdMatch;
      while ((reqIdMatch = reqIdPattern.exec(reqMatch[1])) !== null) {
        reqIds.push(reqIdMatch[0]);
      }
    }

    // Count success criteria
    const criteriaPattern = new RegExp(
      `Phase ${match[1]}[\\s\\S]*?(?:Success Criteria:|\\*\\*Success Criteria:\\*\\*)[\\s\\S]*?((?:\\d+\\.|-)\\s+.+(?:\\n(?:\\d+\\.|-)\\s+.+)*)`,
      'g'
    );
    const criteriaMatch = criteriaPattern.exec(content);
    const criteriaCount = criteriaMatch
      ? (criteriaMatch[1].match(/^(?:\d+\.|-)\s+/gm) || []).length
      : 0;

    phases.push({
      number: phaseNum,
      name: phaseName,
      goal,
      requirementIds: reqIds,
      criteriaCount,
    });
  }

  // Count total requirements
  const allReqIds = phases.flatMap((p) => p.requirementIds);
  const uniqueReqIds = [...new Set(allReqIds)];

  return {
    phaseCount: phases.length,
    requirementCount: uniqueReqIds.length,
    phases,
  };
}

/**
 * Format completion summary for final output
 */
export async function formatCompletionSummary(args: {
  projectName: string;
  phaseCount: number;
  requirementCount: number;
  hasResearch: boolean;
  firstPhaseName: string;
  firstPhaseGoal: string;
}): Promise<{ summary: string }> {
  const { projectName, phaseCount, requirementCount, hasResearch, firstPhaseName, firstPhaseGoal } =
    args;

  const summary = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PROJECT INITIALIZED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**${projectName}**

| Artifact       | Location                    |
|----------------|-----------------------------|
| Project        | \`.planning/PROJECT.md\`      |
| Config         | \`.planning/config.json\`     |
${hasResearch ? '| Research       | `.planning/research/`       |\n' : ''}| Requirements   | \`.planning/REQUIREMENTS.md\` |
| Roadmap        | \`.planning/ROADMAP.md\`      |

**${phaseCount} phases** | **${requirementCount} requirements** | Ready to build ✓

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Phase 1: ${firstPhaseName}** — ${firstPhaseGoal}

\`/gsd:discuss-phase 1\` — gather context and clarify approach

<sub>/clear first → fresh context window</sub>

---

**Also available:**
- /gsd:plan-phase 1 — skip discussion, plan directly

───────────────────────────────────────────────────────────────
`;

  return { summary };
}
