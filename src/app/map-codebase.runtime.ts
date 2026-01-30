/**
 * map-codebase.runtime.ts - Runtime functions for V3 map-codebase command
 *
 * These functions handle file I/O, context assembly, prompt building,
 * and summary generation for the /gsd:map-codebase command.
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

export interface MapCodebaseContext {
  error?: string;
  hasExistingMapping: boolean;
  existingDocuments: ExistingDoc[];
  codebaseDir: string;
  modelProfile: string;
  mapperModel: 'sonnet' | 'haiku';
  commitPlanningDocs: boolean;
  focusArea?: string;
  agentPath: string;
}

export interface ExistingDoc {
  name: string;
  lines: number;
  path: string;
}

export interface AgentPrompt {
  focus: 'tech' | 'arch' | 'quality' | 'concerns';
  prompt: string;
  description: string;
  expectedDocs: string[];
}

export interface VerificationResult {
  allExist: boolean;
  documents: DocumentInfo[];
  missingDocs: string[];
  emptyDocs: string[];
}

export interface DocumentInfo {
  name: string;
  path: string;
  lines: number;
  exists: boolean;
}

export interface SummaryData {
  documents: DocumentInfo[];
  totalLines: number;
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

async function countLines(filePath: string): Promise<number> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
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

// Default agent path
const DEFAULT_AGENT_PATH = '/Users/glenninizan/.claude/agents/gsd-codebase-mapper.md';

// Expected documents for each focus area
const FOCUS_DOCUMENTS: Record<string, string[]> = {
  tech: ['STACK.md', 'INTEGRATIONS.md'],
  arch: ['ARCHITECTURE.md', 'STRUCTURE.md'],
  quality: ['CONVENTIONS.md', 'TESTING.md'],
  concerns: ['CONCERNS.md'],
};

// All expected documents
const ALL_DOCUMENTS = [
  'STACK.md',
  'INTEGRATIONS.md',
  'ARCHITECTURE.md',
  'STRUCTURE.md',
  'CONVENTIONS.md',
  'TESTING.md',
  'CONCERNS.md',
];

// ============================================================================
// Model Resolution
// ============================================================================

function resolveMapperModel(profile: string): 'sonnet' | 'haiku' {
  // quality = sonnet, balanced/budget = haiku
  return profile === 'quality' ? 'sonnet' : 'haiku';
}

// ============================================================================
// Main Runtime Functions
// ============================================================================

/**
 * Initialize map-codebase context: check directories, read config
 */
export async function init(args: { arguments: string }): Promise<MapCodebaseContext> {
  const errorCtx = (error: string): MapCodebaseContext => ({
    error,
    hasExistingMapping: false,
    existingDocuments: [],
    codebaseDir: '.planning/codebase',
    modelProfile: 'balanced',
    mapperModel: 'haiku',
    commitPlanningDocs: false,
    agentPath: DEFAULT_AGENT_PATH,
  });

  // Check .planning directory exists
  if (!await fileExists('.planning')) {
    return errorCtx('.planning/ directory not found. Run /gsd:new-project first.');
  }

  const codebaseDir = '.planning/codebase';

  // Check for existing codebase mapping
  const hasExistingMapping = await fileExists(codebaseDir);
  const existingDocuments: ExistingDoc[] = [];

  if (hasExistingMapping) {
    const files = await findFiles(codebaseDir, /\.md$/);
    for (const file of files) {
      const lines = await countLines(file);
      existingDocuments.push({
        name: path.basename(file),
        lines,
        path: file,
      });
    }
  }

  // Read config
  let modelProfile = 'balanced';
  let commitPlanningDocs = false;
  let agentPath = DEFAULT_AGENT_PATH;

  try {
    const configJson = await readFile('.planning/config.json');
    if (configJson) {
      const parsed = JSON.parse(configJson);
      modelProfile = parsed.model_profile || 'balanced';
      commitPlanningDocs = parsed.commit_docs === true;

      // Check if .planning is in .gitignore
      if (commitPlanningDocs) {
        const gitignore = await readFile('.gitignore');
        if (gitignore.includes('.planning')) {
          commitPlanningDocs = false;
        }
      }

      // Override agent path if specified
      if (parsed.agents?.mapper) {
        agentPath = parsed.agents.mapper;
      }
    }
  } catch {
    // Use defaults
  }

  // Parse optional focus area from arguments
  const focusMatch = args.arguments.match(/\b(tech|arch|quality|concerns)\b/i);
  const focusArea = focusMatch ? focusMatch[1].toLowerCase() : undefined;

  return {
    hasExistingMapping,
    existingDocuments,
    codebaseDir,
    modelProfile,
    mapperModel: resolveMapperModel(modelProfile),
    commitPlanningDocs,
    focusArea,
    agentPath,
  };
}

/**
 * Build prompt for a specific focus area mapper agent
 */
export async function buildMapperPrompt(args: {
  focus: 'tech' | 'arch' | 'quality' | 'concerns';
  agentPath: string;
  codebaseDir: string;
}): Promise<AgentPrompt> {
  const { focus, agentPath, codebaseDir } = args;

  const descriptions: Record<string, string> = {
    tech: 'Map tech stack',
    arch: 'Map architecture',
    quality: 'Map conventions',
    concerns: 'Map concerns',
  };

  const prompts: Record<string, string> = {
    tech: `First, read ${agentPath} for your role and instructions.

<focus>tech</focus>

<task>
Analyze the technology stack and external integrations.
Write to: ${codebaseDir}/STACK.md and ${codebaseDir}/INTEGRATIONS.md
</task>

<exploration_hints>
- Check package.json, requirements.txt, Cargo.toml, go.mod for dependencies
- Look for config files (.env*, *.config.*, tsconfig.json)
- Find SDK/API imports (stripe, supabase, aws, etc.)
- Check deployment configs (Dockerfile, vercel.json, etc.)
</exploration_hints>`,

    arch: `First, read ${agentPath} for your role and instructions.

<focus>arch</focus>

<task>
Analyze the architecture and file structure.
Write to: ${codebaseDir}/ARCHITECTURE.md and ${codebaseDir}/STRUCTURE.md
</task>

<exploration_hints>
- Map directory structure and purpose of each folder
- Identify entry points (index.*, main.*, app.*, server.*)
- Trace import patterns to understand layers
- Find key abstractions and their relationships
</exploration_hints>`,

    quality: `First, read ${agentPath} for your role and instructions.

<focus>quality</focus>

<task>
Analyze coding conventions and testing patterns.
Write to: ${codebaseDir}/CONVENTIONS.md and ${codebaseDir}/TESTING.md
</task>

<exploration_hints>
- Check linting/formatting configs (.eslintrc*, .prettierrc*, biome.json)
- Find test files (*.test.*, *.spec.*) and test config
- Sample source files for naming and style patterns
- Look for JSDoc/TSDoc patterns
</exploration_hints>`,

    concerns: `First, read ${agentPath} for your role and instructions.

<focus>concerns</focus>

<task>
Identify technical debt and issues.
Write to: ${codebaseDir}/CONCERNS.md
</task>

<exploration_hints>
- Find TODO/FIXME/HACK/XXX comments
- Identify large files (potential complexity hotspots)
- Look for empty returns/stubs (incomplete implementations)
- Check for deprecated dependencies or patterns
- Find areas with low test coverage
</exploration_hints>`,
  };

  return {
    focus,
    prompt: prompts[focus],
    description: descriptions[focus],
    expectedDocs: FOCUS_DOCUMENTS[focus],
  };
}

/**
 * Delete all files in .planning/codebase/
 */
export async function deleteExistingMapping(args: {
  codebaseDir: string;
}): Promise<void> {
  const { codebaseDir } = args;

  try {
    const entries = await fs.readdir(codebaseDir);
    for (const entry of entries) {
      const fullPath = path.join(codebaseDir, entry);
      const stat = await fs.stat(fullPath);
      if (stat.isFile()) {
        await fs.unlink(fullPath);
      }
    }
  } catch {
    // Directory might not exist, that's fine
  }
}

/**
 * Create .planning/codebase/ directory if it doesn't exist
 */
export async function ensureCodebaseDir(args: {
  codebaseDir: string;
}): Promise<void> {
  await fs.mkdir(args.codebaseDir, { recursive: true });
}

/**
 * Verify all 7 documents exist with >20 lines each
 */
export async function verifyDocuments(args: {
  codebaseDir: string;
}): Promise<VerificationResult> {
  const { codebaseDir } = args;
  const documents: DocumentInfo[] = [];
  const missingDocs: string[] = [];
  const emptyDocs: string[] = [];

  for (const docName of ALL_DOCUMENTS) {
    const docPath = path.join(codebaseDir, docName);
    const exists = await fileExists(docPath);
    const lines = exists ? await countLines(docPath) : 0;

    documents.push({
      name: docName,
      path: docPath,
      lines,
      exists,
    });

    if (!exists) {
      missingDocs.push(docName);
    } else if (lines < 20) {
      emptyDocs.push(`${docName} (${lines} lines)`);
    }
  }

  return {
    allExist: missingDocs.length === 0 && emptyDocs.length === 0,
    documents,
    missingDocs,
    emptyDocs,
  };
}

/**
 * Generate summary data from verified documents
 */
export async function generateSummary(args: {
  documents: DocumentInfo[];
}): Promise<SummaryData> {
  const { documents } = args;
  const totalLines = documents.reduce((sum, doc) => sum + doc.lines, 0);

  return {
    documents,
    totalLines,
  };
}

/**
 * Format summary as GSD-style markdown with next steps
 */
export async function formatSummaryMarkdown(args: {
  summary: SummaryData;
}): Promise<string> {
  const { summary } = args;

  // Build document table
  const docTable = summary.documents
    .map(doc => `| ${doc.name} | ${doc.lines} |`)
    .join('\n');

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► CODEBASE MAPPED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**${summary.documents.length} documents** | **${summary.totalLines} total lines**

| Document | Lines |
|----------|-------|
${docTable}

Location: \`.planning/codebase/\`

───────────────────────────────────────────────────────────────

## ▶ Next Up

These documents are now available to /gsd:plan-phase for context.

\`/gsd:progress\` — check project status and next actions

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────
`;
}
