/**
 * map-codebase.tsx - V3 Command
 *
 * Analyzes a codebase with parallel mapper agents to produce structured
 * documents in .planning/codebase/. These documents are consumed by
 * other GSD commands (plan-phase, execute-phase) for context.
 *
 * Flow: Init → Check existing → Spawn 4 parallel mappers → Verify → Summary
 *
 * Uses TypeScript runtime functions for:
 * - File I/O and directory operations
 * - Config reading and model resolution
 * - Prompt building for each focus area
 * - Document verification and summary generation
 */

import {
  Command,
  useScriptVar,
  runtimeFn,
  If,
  Else,
  Return,
  AskUser,
  SpawnAgent,
  XmlBlock,
  Table,
} from '../../jsx.js';

// Import runtime functions
import {
  init,
  buildMapperPrompt,
  deleteExistingMapping,
  ensureCodebaseDir,
  verifyDocuments,
  generateSummary,
  formatSummaryMarkdown,
} from './map-codebase.runtime.js';

// Import types
import type {
  MapCodebaseContext,
  AgentPrompt,
  VerificationResult,
  SummaryData,
} from './map-codebase.runtime.js';

// ============================================================================
// Create typed runtime function components
// ============================================================================

const Init = runtimeFn(init);
const BuildMapperPrompt = runtimeFn(buildMapperPrompt);
const DeleteExistingMapping = runtimeFn(deleteExistingMapping);
const EnsureCodebaseDir = runtimeFn(ensureCodebaseDir);
const VerifyDocuments = runtimeFn(verifyDocuments);
const GenerateSummary = runtimeFn(generateSummary);
const FormatSummary = runtimeFn(formatSummaryMarkdown);

// ============================================================================
// Command Definition
// ============================================================================

export default (
  <Command
    name="gsd:map-codebase"
    description="REACT AGENTIC: Analyze codebase with parallel mapper agents to produce .planning/codebase/ documents"
    argumentHint="[optional: specific area to map]"
    allowedTools={["Read", "Write", "Bash", "Glob", "Grep", "Task"]}
  >
    {() => {
      // Variable declarations with typed ScriptVars
      const ctx = useScriptVar<MapCodebaseContext>('CTX');
      const userChoice = useScriptVar<string>('USER_CHOICE');
      const techPrompt = useScriptVar<AgentPrompt>('TECH_PROMPT');
      const archPrompt = useScriptVar<AgentPrompt>('ARCH_PROMPT');
      const qualityPrompt = useScriptVar<AgentPrompt>('QUALITY_PROMPT');
      const concernsPrompt = useScriptVar<AgentPrompt>('CONCERNS_PROMPT');
      const verification = useScriptVar<VerificationResult>('VERIFICATION');
      const summary = useScriptVar<SummaryData>('SUMMARY');
      const summaryMd = useScriptVar<string>('SUMMARY_MD');
      const _void = useScriptVar<void>('_VOID'); // Placeholder for void returns

      return (
        <>
          <XmlBlock name="objective">
            <p>Analyze the codebase with parallel mapper agents to produce structured documentation.</p>
            <p><b>Output:</b> 7 documents in .planning/codebase/ for use by plan-phase and execute-phase.</p>
            <p><b>Flow:</b> Init → Check existing → Create directory → Spawn 4 parallel mappers → Verify → Summary</p>
          </XmlBlock>

          <XmlBlock name="critical_instructions">
            <p><b>IMPORTANT:</b> This command uses a Node.js runtime for complex operations.</p>
            <p><b>You MUST execute the bash commands shown in code blocks.</b> Do NOT improvise or read files manually.</p>
            <p>Follow each step sequentially. Run bash commands FIRST, then use the output variables in subsequent steps.</p>
          </XmlBlock>

          <XmlBlock name="process">

            {/* ============================================================ */}
            {/* STEP 1: Validate Environment and Initialize */}
            {/* ============================================================ */}

            <h2>Step 1: Initialize</h2>

            <p>Check .planning exists, detect existing mapping, read config:</p>

            <Init.Call
              args={{ arguments: "$ARGUMENTS" }}
              output={ctx}
            />

            <If condition={ctx.error}>
              <p><b>Error:</b> {ctx.error}</p>
              <p>Run <code>/gsd:new-project</code> first if .planning/ directory is missing.</p>
              <Return status="ERROR" message="Initialization failed" />
            </If>

            <p>Model profile: {ctx.modelProfile}</p>
            <p>Mapper model: {ctx.mapperModel}</p>

            <h3>Model Profile Lookup</h3>
            <Table
              headers={["Agent", "quality", "balanced", "budget"]}
              rows={[
                ["gsd-codebase-mapper", "sonnet", "haiku", "haiku"],
              ]}
            />

            {/* ============================================================ */}
            {/* STEP 2: Handle Existing Mapping */}
            {/* ============================================================ */}

            <h2>Step 2: Check Existing Mapping</h2>

            <If condition={ctx.hasExistingMapping}>
              <p>Found existing codebase mapping with {ctx.existingDocuments.length} document(s):</p>
              <pre>{ctx.existingDocuments.map(d => `- ${d.name} (${d.lines} lines)`).join('\n')}</pre>

              <AskUser
                question="Codebase mapping already exists. What would you like to do?"
                header="Existing"
                options={[
                  { value: 'refresh', label: 'Refresh (Recommended)', description: 'Delete and remap entire codebase' },
                  { value: 'skip', label: 'Skip', description: 'Use existing mapping as-is' },
                ]}
                output={userChoice}
              />

              <If condition={userChoice === 'skip'}>
                <p>Using existing mapping.</p>
                <Return status="SUCCESS" message="Using existing codebase mapping" />
              </If>

              <If condition={userChoice === 'refresh'}>
                <p>Deleting existing mapping...</p>
                <DeleteExistingMapping.Call
                  args={{ codebaseDir: ctx.codebaseDir }}
                  output={_void}
                />
                <p>Existing mapping deleted. Proceeding with fresh analysis.</p>
              </If>
            </If>

            {/* ============================================================ */}
            {/* STEP 3: Create Directory */}
            {/* ============================================================ */}

            <h2>Step 3: Create Directory</h2>

            <EnsureCodebaseDir.Call
              args={{ codebaseDir: ctx.codebaseDir }}
              output={_void}
            />

            <p>Created {ctx.codebaseDir}/</p>

            {/* ============================================================ */}
            {/* STEP 4: Build Prompts for All 4 Agents */}
            {/* ============================================================ */}

            <h2>Step 4: Build Mapper Prompts</h2>

            <p>Building prompts for 4 focus areas...</p>

            <BuildMapperPrompt.Call
              args={{ focus: 'tech', agentPath: ctx.agentPath, codebaseDir: ctx.codebaseDir }}
              output={techPrompt}
            />

            <BuildMapperPrompt.Call
              args={{ focus: 'arch', agentPath: ctx.agentPath, codebaseDir: ctx.codebaseDir }}
              output={archPrompt}
            />

            <BuildMapperPrompt.Call
              args={{ focus: 'quality', agentPath: ctx.agentPath, codebaseDir: ctx.codebaseDir }}
              output={qualityPrompt}
            />

            <BuildMapperPrompt.Call
              args={{ focus: 'concerns', agentPath: ctx.agentPath, codebaseDir: ctx.codebaseDir }}
              output={concernsPrompt}
            />

            <p>All 4 prompts ready.</p>

            {/* ============================================================ */}
            {/* STEP 5: Spawn 4 Parallel Mapper Agents */}
            {/* ============================================================ */}

            <h2>Step 5: Spawn Mapper Agents</h2>

            <pre>{`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► MAPPING CODEBASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`}</pre>

            <XmlBlock name="parallel_agents">
              <p><b>CRITICAL:</b> Spawn all 4 agents IN PARALLEL using <code>run_in_background: true</code>.</p>
              <p>Make a SINGLE Task() call with MULTIPLE agents to maximize parallelization.</p>
              <p>Each agent writes documents directly to {ctx.codebaseDir}/</p>
              <p>Use the mapper model from the table above (default: haiku for balanced/budget, sonnet for quality).</p>

              <h3>Tech Stack Agent</h3>
              <SpawnAgent
                agent="gsd-codebase-mapper"
                loadFromFile={ctx.agentPath}
                model="haiku"
                description="Map tech stack"
                input={{ prompt: techPrompt.prompt }}
              />
              <p>Expected output: STACK.md, INTEGRATIONS.md</p>

              <h3>Architecture Agent</h3>
              <SpawnAgent
                agent="gsd-codebase-mapper"
                loadFromFile={ctx.agentPath}
                model="haiku"
                description="Map architecture"
                input={{ prompt: archPrompt.prompt }}
              />
              <p>Expected output: ARCHITECTURE.md, STRUCTURE.md</p>

              <h3>Quality Agent</h3>
              <SpawnAgent
                agent="gsd-codebase-mapper"
                loadFromFile={ctx.agentPath}
                model="haiku"
                description="Map conventions"
                input={{ prompt: qualityPrompt.prompt }}
              />
              <p>Expected output: CONVENTIONS.md, TESTING.md</p>

              <h3>Concerns Agent</h3>
              <SpawnAgent
                agent="gsd-codebase-mapper"
                loadFromFile={ctx.agentPath}
                model="haiku"
                description="Map concerns"
                input={{ prompt: concernsPrompt.prompt }}
              />
              <p>Expected output: CONCERNS.md</p>

              <p><b>Wait for ALL 4 agents to complete before continuing to verification.</b></p>
            </XmlBlock>

            {/* ============================================================ */}
            {/* STEP 6: Verify Documents */}
            {/* ============================================================ */}

            <h2>Step 6: Verify Documents</h2>

            <p>Checking all 7 documents exist with sufficient content...</p>

            <VerifyDocuments.Call
              args={{ codebaseDir: ctx.codebaseDir }}
              output={verification}
            />

            <If condition={!verification.allExist}>
              <p><b>Verification issues found:</b></p>

              <If condition={verification.missingDocs.length > 0}>
                <p>Missing documents: {verification.missingDocs.join(', ')}</p>
              </If>

              <If condition={verification.emptyDocs.length > 0}>
                <p>Documents with insufficient content: {verification.emptyDocs.join(', ')}</p>
              </If>

              <AskUser
                question="Some documents are missing or too short. How would you like to proceed?"
                header="Issues"
                options={[
                  { value: 'continue', label: 'Continue', description: 'Proceed with available documents' },
                  { value: 'retry', label: 'Retry', description: 'Re-run failed mappers' },
                ]}
                output={userChoice}
              />

              <If condition={userChoice === 'retry'}>
                <p>Re-running mapping is not yet implemented. Continuing with available documents.</p>
              </If>
            </If>
            <Else>
              <p>All 7 documents verified.</p>
            </Else>

            {/* ============================================================ */}
            {/* STEP 7: Commit (if configured) */}
            {/* ============================================================ */}

            <h2>Step 7: Commit</h2>

            <If condition={ctx.commitPlanningDocs}>
              <p>Committing codebase map...</p>
              <pre>{`git add .planning/codebase/ && git commit -m "docs: add codebase mapping

Generated by /gsd:map-codebase"`}</pre>
            </If>
            <Else>
              <p>Skipping commit (commit_docs: false in config or .planning in .gitignore)</p>
            </Else>

            {/* ============================================================ */}
            {/* STEP 8: Generate Final Summary */}
            {/* ============================================================ */}

            <h2>Step 8: Summary</h2>

            <GenerateSummary.Call
              args={{ documents: verification.documents }}
              output={summary}
            />

            <FormatSummary.Call
              args={{ summary: summary }}
              output={summaryMd}
            />

          </XmlBlock>

          <XmlBlock name="offer_next">
            <p>{summaryMd}</p>
          </XmlBlock>

          <XmlBlock name="success_criteria">
            <p>- Step 1 Init: .planning/ exists, config.json read, mapper model resolved from profile</p>
            <p>- Step 2 Existing: user consulted if .planning/codebase/ exists (refresh deletes, skip returns)</p>
            <p>- Step 3 Directory: .planning/codebase/ created</p>
            <p>- Step 4 Prompts: 4 focus-specific prompts built (tech, arch, quality, concerns)</p>
            <p>- Step 5 Agents: 4 gsd-codebase-mapper agents spawned IN PARALLEL with run_in_background</p>
            <p>- Step 6 Verify: all 7 documents exist (STACK, INTEGRATIONS, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, CONCERNS) with &gt;20 lines each</p>
            <p>- Step 7 Commit: git commit if commit_docs=true and .planning not in .gitignore</p>
            <p>- Step 8 Summary: GSD-style completion box with document table and next steps</p>
          </XmlBlock>
        </>
      );
    }}
  </Command>
);
