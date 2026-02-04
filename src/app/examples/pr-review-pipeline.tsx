/**
 * PR Review Pipeline Example
 *
 * Demonstrates intermediate TaskPipeline usage with explicit blockedBy dependencies.
 * Shows a DAG structure with:
 * - Sequential analysis phase (Fetch -> Analyze)
 * - Parallel review phase (Security + Performance blocked by Analyze)
 * - Final phase (Report blocked by both reviews)
 */
import {
  Command,
  defineTask,
  TaskDef,
  TaskPipeline,
} from '../../index.js';

// Sequential analysis phase
const FetchPR = defineTask('Fetch PR details', 'fetch');
const AnalyzeChanges = defineTask('Analyze code changes', 'analyze');

// Parallel review phase (both blocked by analyze)
const SecurityReview = defineTask('Security review', 'security');
const PerformanceReview = defineTask('Performance review', 'perf');

// Final phase (blocked by both reviews)
const GenerateReport = defineTask('Generate review report', 'report');

export default () => (
  <Command name="pr-review-pipeline" description="Comprehensive PR review pipeline">
    <h1>PR Review Pipeline</h1>

    <p>
      This pipeline demonstrates a DAG (Directed Acyclic Graph) structure where
      security and performance reviews run in parallel after initial analysis,
      then converge into a final report.
    </p>

    <TaskPipeline title="PR Analysis">
      <TaskDef
        task={FetchPR}
        description="Fetch PR metadata, changed files, and commit history from GitHub."
        activeForm="Fetching PR..."
      />
      <TaskDef
        task={AnalyzeChanges}
        description="Analyze the scope and impact of changes. Identify high-risk areas."
        activeForm="Analyzing changes..."
        blockedBy={[FetchPR]}
      />
      <TaskDef
        task={SecurityReview}
        description="Review for security vulnerabilities (OWASP top 10, auth issues, injection attacks)."
        activeForm="Security review..."
        blockedBy={[AnalyzeChanges]}
      />
      <TaskDef
        task={PerformanceReview}
        description="Review for performance issues (N+1 queries, memory leaks, inefficient algorithms)."
        activeForm="Performance review..."
        blockedBy={[AnalyzeChanges]}
      />
      <TaskDef
        task={GenerateReport}
        description="Compile findings from security and performance reviews into a structured report."
        activeForm="Generating report..."
        blockedBy={[SecurityReview, PerformanceReview]}
      />
    </TaskPipeline>
  </Command>
);
