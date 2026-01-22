import {
  Command,
  XmlBlock,
  Markdown,
  SpawnAgent,
  Assign,
  useVariable,
  useOutput,
  OnStatus,
} from '../../jsx.js';
import type { VersionAnalyzerInput, VersionAnalyzerOutput } from './version-analyzer.agent.js';
import type { ChangelogGeneratorInput, ChangelogGeneratorOutput } from './changelog-generator.agent.js';
import type { ReleaseValidatorInput, ReleaseValidatorOutput } from './release-validator.agent.js';

// ============================================================================
// Shell Variables (references only - assignments specified at emission point)
// ============================================================================

/** Release timestamp in ISO format */
const releaseDate = useVariable<string>("RELEASE_DATE");

/** Current git branch */
const currentBranch = useVariable<string>("CURRENT_BRANCH");

/** Project name from package.json */
const projectName = useVariable<string>("PROJECT_NAME");

/** Changelog output path */
const changelogPath = useVariable<string>("CHANGELOG_PATH");

/** Last version from SQLite database */
const lastVersion = useVariable<string>("LAST_VERSION");

/** Commit count since last release */
const commitCount = useVariable<string>("COMMIT_COUNT");

/** Commit messages since last release */
const commitMessages = useVariable<string>("COMMIT_MESSAGES");

/** Version determined by analyzer agent */
const nextVersion = useVariable<string>("VERSION");

/** Bump type determined by analyzer */
const bumpType = useVariable<string>("BUMP_TYPE");

// ============================================================================
// Agent Outputs
// ============================================================================

const versionOutput = useOutput<VersionAnalyzerOutput>("release/version-analyzer");
const changelogOutput = useOutput<ChangelogGeneratorOutput>("release/changelog-generator");
const validatorOutput = useOutput<ReleaseValidatorOutput>("release/release-validator");

// ============================================================================
// Command
// ============================================================================

export default function ReleaseCommand() {
  return (
    <Command
      name="release"
      description="Create a new release: analyze commits, generate changelog, validate, tag, and record in SQLite"
      argumentHint="[--major|--minor|--patch] [--skip-tests] [--skip-build] [--dry-run]"
      agent="release/version-analyzer"
      allowedTools={['Read', 'Write', 'Bash', 'Task', 'mcp__release-db__read_query', 'mcp__release-db__write_query']}
    >
      <XmlBlock name="objective">
        <p>Orchestrate a complete release workflow:</p>
        <ol>
          <li>Query SQLite for last release version</li>
          <li>Gather commit history since last release</li>
          <li>Spawn version-analyzer to determine next version</li>
          <li>Spawn changelog-generator to create changelog entry</li>
          <li>Spawn release-validator for pre-flight checks</li>
          <li>Create git tag and push (unless dry-run)</li>
          <li>Record release in SQLite database</li>
        </ol>
      </XmlBlock>

      <XmlBlock name="context">
        <p><b>Flags:</b></p>
        <ul>
          <li><code>--major</code> — Force major version bump</li>
          <li><code>--minor</code> — Force minor version bump</li>
          <li><code>--patch</code> — Force patch version bump</li>
          <li><code>--skip-tests</code> — Skip test validation</li>
          <li><code>--skip-build</code> — Skip build validation</li>
          <li><code>--dry-run</code> — Don't tag or record, just show what would happen</li>
        </ul>
        <p><b>MCP Server:</b> release-db (SQLite for release tracking)</p>
      </XmlBlock>

      <XmlBlock name="database_schema">
        <p>Initialize database if tables don't exist:</p>
        <Markdown>{`
\`\`\`sql
-- Create releases table
CREATE TABLE IF NOT EXISTS releases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  commit_range TEXT NOT NULL,
  changelog_summary TEXT,
  bump_type TEXT,
  created_by TEXT DEFAULT 'claude',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Create config table for key-value storage
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert default config if not exists
INSERT OR IGNORE INTO config (key, value) VALUES ('release_branch', 'main');
INSERT OR IGNORE INTO config (key, value) VALUES ('run_tests', 'true');
INSERT OR IGNORE INTO config (key, value) VALUES ('run_build', 'true');
\`\`\`
`}</Markdown>
      </XmlBlock>

      <XmlBlock name="process">
        <h2>Step 1: Initialize Environment</h2>
        <p>Set up shell variables and check prerequisites:</p>

        <Assign var={releaseDate} bash={`date -u +"%Y-%m-%dT%H:%M:%SZ"`} />
        <Assign var={currentBranch} bash={`git rev-parse --abbrev-ref HEAD`} />
        <Assign var={projectName} bash={`node -p "require('./package.json').name" 2>/dev/null || echo "project"`} />
        <Assign var={changelogPath} value="./CHANGELOG.md" />

        <h2>Step 2: Initialize Database</h2>
        <p>Create database directory and initialize tables:</p>
        <pre><code className="language-bash">mkdir -p data</code></pre>
        <p>Use MCP to create tables if they don't exist:</p>
        <Markdown>{`
\`\`\`
mcp__release-db__write_query({
  sql: "CREATE TABLE IF NOT EXISTS releases (...)"
})
mcp__release-db__write_query({
  sql: "CREATE TABLE IF NOT EXISTS config (...)"
})
\`\`\`
`}</Markdown>

        <h2>Step 3: Query Last Release</h2>
        <p>Get the last release version from SQLite:</p>
        <Markdown>{`
\`\`\`
mcp__release-db__read_query({
  sql: "SELECT version FROM releases ORDER BY created_at DESC LIMIT 1"
})
\`\`\`
`}</Markdown>
        <p>If no releases found, default to 0.0.0:</p>
        <Assign var={lastVersion} bash={`echo "$DB_RESULT" | grep -oE '[0-9]+\\.[0-9]+\\.[0-9]+' || echo "0.0.0"`} />

        <h2>Step 4: Gather Commit History</h2>
        <p>Get commits since last release:</p>
        <pre><code className="language-bash">{`# Get commit range based on last version
if [[ "$LAST_VERSION" != "0.0.0" ]]; then
  COMMIT_RANGE="v$LAST_VERSION..HEAD"
else
  COMMIT_RANGE="HEAD"
fi`}</code></pre>
        <Assign var={commitCount} bash={`git rev-list --count $COMMIT_RANGE 2>/dev/null || echo "0"`} />
        <Assign var={commitMessages} bash={`git log --oneline $COMMIT_RANGE 2>/dev/null | head -50 || echo ""`} />

        <p><b>If no commits:</b></p>
        <pre><code className="language-bash">{`if [ "$COMMIT_COUNT" = "0" ]; then
  echo "No new commits to release."
  exit 0
fi`}</code></pre>

        <h2>Step 5: Display Release Context</h2>
        <Markdown>{`
\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RELEASE ► STARTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: {PROJECT_NAME}
Last Version: {LAST_VERSION}
Commits: {COMMIT_COUNT}
Branch: {CURRENT_BRANCH}

◆ Analyzing commits...
\`\`\`
`}</Markdown>

        <h2>Step 6: Spawn Version Analyzer</h2>
        <SpawnAgent<VersionAnalyzerInput>
          agent="release/version-analyzer"
          model="haiku"
          description="Analyze commits for version"
          input={{
            currentVersion: lastVersion,
            commits: commitMessages,
            commitCount: commitCount,
          }}
        >
          Analyze the commits and determine the next semantic version.
          Look for breaking changes, features, and fixes to decide bump type.
        </SpawnAgent>

        <h3>Handle Version Analysis</h3>
        <OnStatus output={versionOutput} status="SUCCESS">
          <p>Version analysis complete. Extract version and bump type from agent output:</p>
          <Assign var={nextVersion} bash={`echo "$AGENT_OUTPUT" | grep -oE 'Next Version: [0-9]+\\.[0-9]+\\.[0-9]+' | cut -d' ' -f3`} />
          <Assign var={bumpType} bash={`echo "$AGENT_OUTPUT" | grep -oE 'Bump Type: (major|minor|patch)' | cut -d' ' -f3`} />
          <Markdown>{`
\`\`\`
◆ Version Analysis Complete
  Next Version: $VERSION
  Bump Type: $BUMP_TYPE

◆ Generating changelog...
\`\`\`
`}</Markdown>
        </OnStatus>

        <OnStatus output={versionOutput} status="ERROR">
          <p>Version analysis failed: {versionOutput.field('message')}</p>
          <p>Offer options: 1) Retry, 2) Manually specify version, 3) Abort</p>
        </OnStatus>

        <h2>Step 7: Spawn Changelog Generator</h2>
        <SpawnAgent<ChangelogGeneratorInput>
          agent="release/changelog-generator"
          model="haiku"
          description="Generate changelog entry"
          input={{
            version: nextVersion,
            previousVersion: lastVersion,
            commits: commitMessages,
            releaseDate: releaseDate,
            projectName: projectName,
            outputPath: changelogPath,
            appendMode: true,
          }}
        >
          Generate a changelog entry for this release.
          Categorize commits and format according to Keep a Changelog.
        </SpawnAgent>

        <h3>Handle Changelog Generation</h3>
        <OnStatus output={changelogOutput} status="SUCCESS">
          <p>Changelog generated at {changelogOutput.field('changelogPath')}.</p>
          <Markdown>{`
\`\`\`
◆ Changelog Generated
  File: $CHANGELOG_PATH

◆ Running pre-flight checks...
\`\`\`
`}</Markdown>
        </OnStatus>

        <OnStatus output={changelogOutput} status="ERROR">
          <p>Changelog generation failed: {changelogOutput.field('message')}</p>
        </OnStatus>

        <h2>Step 8: Spawn Release Validator</h2>
        <p>Parse flags to determine which checks to run:</p>
        <pre><code className="language-bash">{`# Parse validation flags
RUN_TESTS="true"
RUN_BUILD="true"
[[ "$ARGUMENTS" == *"--skip-tests"* ]] && RUN_TESTS="false"
[[ "$ARGUMENTS" == *"--skip-build"* ]] && RUN_BUILD="false"`}</code></pre>

        <SpawnAgent<ReleaseValidatorInput>
          agent="release/release-validator"
          model="haiku"
          description="Validate release"
          input={{
            version: nextVersion,
            changelogPath: changelogPath,
            runTests: "true",
            checkBuild: "true",
            branch: currentBranch,
            requiredBranch: "main",
          }}
        >
          Run pre-flight validation checks for the release.
          Verify branch, clean tree, changelog, tests, and build.
        </SpawnAgent>

        <h3>Handle Validation</h3>
        <OnStatus output={validatorOutput} status="SUCCESS">
          <p>Validation completed. Check agent output for pass/fail status:</p>
          <Markdown>{`
If validation passed:
\`\`\`
◆ Validation Passed ✓

All pre-flight checks completed successfully.
\`\`\`

If validation failed (valid=false):
\`\`\`
◆ Validation Failed ✗

Review failures and warnings from validator output.
\`\`\`
Offer options: 1) Fix issues and retry, 2) Force release anyway, 3) Abort
`}</Markdown>
        </OnStatus>

        <OnStatus output={validatorOutput} status="ERROR">
          <p>Validation check failed. Review error details and retry.</p>
        </OnStatus>

        <h2>Step 9: Check Dry Run and Execute</h2>
        <pre><code className="language-bash">{`[[ "$ARGUMENTS" == *"--dry-run"* ]] && DRY_RUN="true" || DRY_RUN="false"`}</code></pre>

        <p><b>If dry-run mode:</b></p>
        <Markdown>{`
\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RELEASE ► DRY RUN COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Would release: v$VERSION
Changes: $COMMIT_COUNT commits
Bump: $BUMP_TYPE

No changes made (--dry-run flag).
\`\`\`
`}</Markdown>

        <p><b>Otherwise (actual release):</b></p>
        <h2>Step 10: Create Git Tag</h2>
        <pre><code className="language-bash">{`# Create annotated tag
git tag -a "v$VERSION" -m "Release v$VERSION

$BUMP_TYPE release
Commits: $COMMIT_COUNT
Date: $RELEASE_DATE"

# Push tag
git push origin "v$VERSION"`}</code></pre>

        <h2>Step 11: Record in SQLite</h2>
        <Markdown>{`
\`\`\`
mcp__release-db__write_query({
  sql: "INSERT INTO releases (version, date, commit_range, changelog_summary, bump_type) VALUES (?, ?, ?, ?, ?)",
  params: [VERSION, RELEASE_DATE, COMMIT_RANGE, CHANGELOG_SUMMARY, BUMP_TYPE]
})
\`\`\`
`}</Markdown>
      </XmlBlock>

      <XmlBlock name="offer_next">
        <Markdown>{`
Output this markdown directly:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RELEASE ► v$VERSION COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**$PROJECT_NAME v$VERSION** — $BUMP_TYPE release

| Metric | Value |
|--------|-------|
| Previous | $LAST_VERSION |
| New | $VERSION |
| Commits | $COMMIT_COUNT |
| Date | $RELEASE_DATE |

### Actions Taken

- [x] Version analyzed ($BUMP_TYPE bump)
- [x] Changelog generated
- [x] Pre-flight checks passed
- [x] Git tag created: v$VERSION
- [x] Release recorded in database

───────────────────────────────────────────────────────────────

## ▶ Next Steps

**View Release:**
git show v$VERSION

**Push to Remote (if not auto-pushed):**
git push origin v$VERSION

**View Changelog:**
cat CHANGELOG.md

───────────────────────────────────────────────────────────────`}
        </Markdown>
      </XmlBlock>

      <XmlBlock name="success_criteria">
        <ul>
          <li>[ ] SQLite database initialized with tables</li>
          <li>[ ] Last version retrieved from database</li>
          <li>[ ] Commit history gathered</li>
          <li>[ ] version-analyzer spawned and returned version</li>
          <li>[ ] changelog-generator spawned and created entry</li>
          <li>[ ] release-validator spawned and all checks passed (or user override)</li>
          <li>[ ] Git tag created (unless dry-run)</li>
          <li>[ ] Release recorded in SQLite (unless dry-run)</li>
          <li>[ ] User sees complete summary</li>
        </ul>
      </XmlBlock>
    </Command>
  );
}
