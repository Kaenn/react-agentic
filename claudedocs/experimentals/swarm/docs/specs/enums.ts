/**
 * Shared enums for Claude Code Swarm TSX components
 */

// =============================================================================
// AGENT TYPES
// =============================================================================

/**
 * Built-in agent types available in Claude Code
 */
export enum AgentType {
  /** Command execution specialist - Tools: Bash only */
  Bash = 'Bash',

  /** Codebase exploration specialist - Tools: Read-only, Model: haiku */
  Explore = 'Explore',

  /** Architecture planning specialist - Tools: Read-only */
  Plan = 'Plan',

  /** General-purpose agent with all tools */
  GeneralPurpose = 'general-purpose',

  /** Claude Code documentation helper - Tools: Read + Web */
  ClaudeCodeGuide = 'claude-code-guide',

  /** Status line configuration - Tools: Read, Edit */
  StatuslineSetup = 'statusline-setup'
}

/**
 * Plugin agent types from compound-engineering
 */
export enum PluginAgentType {
  // Review agents
  SecuritySentinel = 'compound-engineering:review:security-sentinel',
  PerformanceOracle = 'compound-engineering:review:performance-oracle',
  ArchitectureStrategist = 'compound-engineering:review:architecture-strategist',
  CodeSimplicityReviewer = 'compound-engineering:review:code-simplicity-reviewer',
  KieranRailsReviewer = 'compound-engineering:review:kieran-rails-reviewer',
  KieranTypescriptReviewer = 'compound-engineering:review:kieran-typescript-reviewer',
  KieranPythonReviewer = 'compound-engineering:review:kieran-python-reviewer',
  DataIntegrityGuardian = 'compound-engineering:review:data-integrity-guardian',
  DataMigrationExpert = 'compound-engineering:review:data-migration-expert',
  DeploymentVerificationAgent = 'compound-engineering:review:deployment-verification-agent',
  DhhRailsReviewer = 'compound-engineering:review:dhh-rails-reviewer',
  JulikFrontendRacesReviewer = 'compound-engineering:review:julik-frontend-races-reviewer',
  AgentNativeReviewer = 'compound-engineering:review:agent-native-reviewer',
  PatternRecognitionSpecialist = 'compound-engineering:review:pattern-recognition-specialist',

  // Research agents
  BestPracticesResearcher = 'compound-engineering:research:best-practices-researcher',
  FrameworkDocsResearcher = 'compound-engineering:research:framework-docs-researcher',
  GitHistoryAnalyzer = 'compound-engineering:research:git-history-analyzer',
  LearningsResearcher = 'compound-engineering:research:learnings-researcher',
  RepoResearchAnalyst = 'compound-engineering:research:repo-research-analyst',

  // Design agents
  FigmaDesignSync = 'compound-engineering:design:figma-design-sync',

  // Workflow agents
  BugReproductionValidator = 'compound-engineering:workflow:bug-reproduction-validator'
}

// =============================================================================
// MODEL
// =============================================================================

/**
 * Model options for agents
 */
export enum Model {
  /** Fast and cheap - best for simple tasks */
  Haiku = 'haiku',

  /** Balanced performance and cost */
  Sonnet = 'sonnet',

  /** Highest capability - best for complex tasks */
  Opus = 'opus'
}

// =============================================================================
// MESSAGE TYPES
// =============================================================================

/**
 * Types of messages that can be sent between agents
 */
export enum MessageType {
  /** Regular text message between agents */
  Text = 'text',

  /** Leader requests teammate to shut down gracefully */
  ShutdownRequest = 'shutdown_request',

  /** Teammate confirms shutdown request */
  ShutdownApproved = 'shutdown_approved',

  /** Teammate rejected shutdown request */
  ShutdownRejected = 'shutdown_rejected',

  /** Teammate reports it has no more work */
  IdleNotification = 'idle_notification',

  /** Teammate reports a task was completed */
  TaskCompleted = 'task_completed',

  /** Teammate requests approval for a plan */
  PlanApprovalRequest = 'plan_approval_request',

  /** Leader approved a plan */
  PlanApproved = 'plan_approved',

  /** Leader rejected a plan */
  PlanRejected = 'plan_rejected',

  /** Agent requests to join a team */
  JoinRequest = 'join_request',

  /** Leader approved join request */
  JoinApproved = 'join_approved',

  /** Leader rejected join request */
  JoinRejected = 'join_rejected',

  /** Teammate needs tool/permission approval */
  PermissionRequest = 'permission_request'
}

// =============================================================================
// TASK STATUS
// =============================================================================

/**
 * Task status values
 */
export enum TaskStatus {
  /** Task is waiting to be started */
  Pending = 'pending',

  /** Task is currently being worked on */
  InProgress = 'in_progress',

  /** Task has been completed */
  Completed = 'completed',

  /** Task was deleted */
  Deleted = 'deleted'
}

// =============================================================================
// CALLOUT TYPES
// =============================================================================

/**
 * Types of callouts with corresponding icons
 */
export enum CalloutType {
  /** ℹ️ General information, context, explanations */
  Info = 'info',

  /** ⚠️ Cautions, potential issues, things to watch for */
  Warning = 'warning',

  /** 🚨 Critical warnings, actions that can cause problems */
  Danger = 'danger',

  /** 💡 Best practices, helpful hints, optimizations */
  Tip = 'tip'
}

// =============================================================================
// BACKEND TYPES
// =============================================================================

/**
 * Spawn backend types - determines how teammate processes are created
 */
export enum BackendType {
  /** Teammates run as async tasks in same Node.js process */
  InProcess = 'in-process',

  /** Teammates run as separate processes in tmux panes */
  Tmux = 'tmux',

  /** Teammates run as split panes in iTerm2 (macOS only) */
  ITerm2 = 'iterm2'
}

// =============================================================================
// TEAMMATE OPERATIONS
// =============================================================================

/**
 * Operations available on the Teammate tool
 */
export enum TeammateOperation {
  /** Create a new team */
  SpawnTeam = 'spawnTeam',

  /** Discover available teams */
  DiscoverTeams = 'discoverTeams',

  /** Request to join a team */
  RequestJoin = 'requestJoin',

  /** Approve a join request (leader only) */
  ApproveJoin = 'approveJoin',

  /** Reject a join request (leader only) */
  RejectJoin = 'rejectJoin',

  /** Send message to one teammate */
  Write = 'write',

  /** Send message to all teammates */
  Broadcast = 'broadcast',

  /** Request teammate shutdown (leader only) */
  RequestShutdown = 'requestShutdown',

  /** Approve shutdown request (teammate only) */
  ApproveShutdown = 'approveShutdown',

  /** Reject shutdown request (teammate only) */
  RejectShutdown = 'rejectShutdown',

  /** Approve plan (leader only) */
  ApprovePlan = 'approvePlan',

  /** Reject plan (leader only) */
  RejectPlan = 'rejectPlan',

  /** Cleanup team resources */
  Cleanup = 'cleanup'
}

// =============================================================================
// CODE BLOCK LANGUAGES
// =============================================================================

/**
 * Common languages for code blocks
 */
export enum CodeLanguage {
  JavaScript = 'javascript',
  TypeScript = 'typescript',
  JSON = 'json',
  Bash = 'bash',
  Mermaid = 'mermaid',
  Markdown = 'markdown',
  Python = 'python',
  Ruby = 'ruby'
}

// =============================================================================
// TASK REFERENCE SYSTEM
// =============================================================================

/**
 * A reference to a task that can be used in blockedBy
 */
export interface TaskRef {
  /** Human-readable title (maps to TaskCreate.subject) */
  readonly subject: string;
  /** Short label for mermaid diagrams (derived from subject if not provided) */
  readonly name: string;
  /** UUID for cross-file identity resolution */
  readonly __id: string;
  /** Type guard marker */
  readonly __isTaskRef: true;
}

/**
 * Derives a short name from a subject string.
 * Truncates to 15 chars, lowercases, replaces spaces with hyphens.
 */
function deriveNameFromSubject(subject: string): string {
  return subject
    .slice(0, 15)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+$/, ''); // Remove trailing hyphens
}

/**
 * Counter for auto-generating task IDs (used for sequential numbering in output)
 */
let taskIdCounter = 0;

/**
 * Resets the task ID counter (useful for new pipelines/pools)
 */
export function resetTaskIds(): void {
  taskIdCounter = 0;
}

/**
 * Helper to define a task and get its reference
 *
 * @param subject - Human-readable title for the task
 * @param name - Optional short label for mermaid diagrams (derived if not provided)
 *
 * @example
 * // Simple usage (name derived from subject)
 * const Research = defineTask('Research best practices');
 *
 * // Explicit name for cleaner mermaid labels
 * const Research = defineTask('Research best practices', 'research');
 *
 * <TaskDef task={Research} description="..." />
 */
export function defineTask(subject: string, name?: string): TaskRef {
  taskIdCounter++;
  return {
    subject,
    name: name ?? deriveNameFromSubject(subject),
    __id: `task-${taskIdCounter}`,
    __isTaskRef: true
  };
}

// =============================================================================
// PIPELINE BUILDER
// =============================================================================

export interface PipelineStage {
  task: TaskRef;
  description?: string;
  blockedBy: TaskRef[];
}

export interface Pipeline {
  title: string;
  tasks: Record<string, TaskRef>;
  stages: PipelineStage[];
}

export interface PipelineBuilder {
  task(subject: string, name?: string, description?: string): PipelineBuilder;
  build(): Pipeline;
}

/**
 * Creates a pipeline builder with auto-chaining
 *
 * @example
 * const pipeline = createPipeline('OAuth Implementation')
 *   .task('Research best practices', 'research')
 *   .task('Create implementation plan', 'plan')
 *   .task('Build OAuth endpoints', 'implement')
 *   .build();
 *
 * // Access tasks: pipeline.tasks.research, pipeline.tasks.plan
 */
export function createPipeline(title: string): PipelineBuilder {
  resetTaskIds();
  const tasks: Record<string, TaskRef> = {};
  const stages: PipelineStage[] = [];
  let previousTask: TaskRef | null = null;

  return {
    task(subject: string, name?: string, description?: string) {
      const taskRef = defineTask(subject, name);
      const taskName = taskRef.name;
      tasks[taskName] = taskRef;
      stages.push({
        task: taskRef,
        description,
        blockedBy: previousTask ? [previousTask] : []
      });
      previousTask = taskRef;
      return this;
    },

    build() {
      return { title, tasks, stages };
    }
  };
}

// =============================================================================
// TASK POOL HELPERS
// =============================================================================

export interface TaskPoolResult {
  tasks: TaskRef[];
  byName: Record<string, TaskRef>;
}

/**
 * Creates a pool of tasks with auto-generated IDs
 *
 * @example
 * const pool = createTaskPool([
 *   { subject: 'Review auth module', name: 'auth' },
 *   { subject: 'Review payment module', name: 'payment' }
 * ]);
 *
 * pool.byName.auth  // TaskRef
 */
export function createTaskPool(
  items: Array<{ subject: string; name?: string }>
): TaskPoolResult {
  resetTaskIds();
  const tasks: TaskRef[] = [];
  const byName: Record<string, TaskRef> = {};

  for (const item of items) {
    const ref = defineTask(item.subject, item.name);
    tasks.push(ref);
    byName[ref.name] = ref;
  }

  return { tasks, byName };
}

/**
 * Creates a pool of file review tasks
 *
 * @example
 * const pool = createFileReviewPool([
 *   'user.rb',
 *   'payment.rb',
 *   'api_controller.rb'
 * ]);
 */
export function createFileReviewPool(
  files: string[],
  reviewType = 'Review'
): TaskPoolResult {
  return createTaskPool(
    files.map((file) => {
      const name = file.replace(/[\/\.]/g, '-');
      return {
        name,
        subject: `${reviewType} ${file}`
      };
    })
  );
}

// =============================================================================
// WORKER REFERENCE SYSTEM
// =============================================================================

/**
 * A reference to a worker that can be used in Teammate and Message components
 *
 * Workers are Claude Code's built-in subagent types (Explore, Plan, etc.)
 * This is distinct from file-based Agents which you define with <Agent> component.
 */
export interface WorkerRef {
  /** Worker identifier */
  readonly name: string;
  /** Claude Code subagent_type */
  readonly type: string;
  /** Model preference */
  readonly model?: string;
  /** UUID for identity resolution */
  readonly __id: string;
  /** Type guard marker */
  readonly __isWorkerRef: true;
}

/**
 * Counter for auto-generating worker IDs
 */
let workerIdCounter = 0;

/**
 * Resets the worker ID counter
 */
export function resetWorkerIds(): void {
  workerIdCounter = 0;
}

/**
 * Creates a new worker reference with auto-generated ID
 *
 * @example
 * const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
 * const Perf = defineWorker('perf', PluginAgentType.PerformanceOracle);
 *
 * <Teammate worker={Security} ... />
 * <Message from={Security} to={Perf} content="..." />
 */
export function defineWorker(
  name: string,
  type: AgentType | PluginAgentType | string,
  model?: Model | string
): WorkerRef {
  workerIdCounter++;
  return {
    name,
    type,
    model,
    __id: `worker-${workerIdCounter}`,
    __isWorkerRef: true
  };
}

// =============================================================================
// TEAM REFERENCE SYSTEM
// =============================================================================

/**
 * A reference to a team
 */
export interface TeamRef {
  /** Team identifier */
  readonly name: string;
  /** Team members */
  readonly members?: WorkerRef[];
  /** UUID for identity resolution */
  readonly __id: string;
  /** Type guard marker */
  readonly __isTeamRef: true;
}

/**
 * Counter for auto-generating team IDs
 */
let teamIdCounter = 0;

/**
 * Resets the team ID counter
 */
export function resetTeamIds(): void {
  teamIdCounter = 0;
}

/**
 * Creates a new team reference with auto-generated ID
 *
 * @example
 * const ReviewTeam = defineTeam('reviewers', [Security, Perf]);
 *
 * <Team team={ReviewTeam}>
 *   <Teammate worker={Security} ... />
 * </Team>
 */
export function defineTeam(name: string, members?: WorkerRef[]): TeamRef {
  teamIdCounter++;
  return {
    name,
    members,
    __id: `team-${teamIdCounter}`,
    __isTeamRef: true
  };
}

/**
 * Add a worker to a team (returns new TeamRef)
 */
export function addToTeam(team: TeamRef, worker: WorkerRef): TeamRef {
  return {
    ...team,
    members: [...(team.members ?? []), worker]
  };
}

// =============================================================================
// CONDITIONAL RENDERING
// =============================================================================

/**
 * Conditional wrapper props
 */
export interface ConditionalProps {
  /** Condition to evaluate */
  when: boolean;
  /** Content to render if condition is true */
  children: React.ReactNode;
}

/**
 * Helper to create conditional content
 *
 * @example
 * <TaskDef
 *   task={Deploy}
 *   description="Deploy to production"
 *   when={env === 'production'}
 * />
 */
export function when<T>(condition: boolean, value: T): T | undefined {
  return condition ? value : undefined;
}

/**
 * Conditional component - only renders children if condition is true
 *
 * @example
 * <If when={isProduction}>
 *   <TaskDef task={Deploy} description="Deploy" />
 * </If>
 */
export function If({ when: condition, children }: ConditionalProps) {
  return condition ? children : null;
}

/**
 * Switch/Case pattern for conditional rendering
 *
 * @example
 * <Switch value={env}>
 *   <Case match="production"><ProductionTasks /></Case>
 *   <Case match="staging"><StagingTasks /></Case>
 *   <Default><DevTasks /></Default>
 * </Switch>
 */
export interface SwitchProps<T> {
  value: T;
  children: React.ReactNode;
}

export interface CaseProps<T> {
  match: T;
  children: React.ReactNode;
}

// =============================================================================
// VARIABLE INTERPOLATION
// =============================================================================

/**
 * Variable bag for template interpolation
 */
export type Variables = Record<string, string | number | boolean>;

/**
 * Interpolates variables into a template string
 *
 * @example
 * const vars = { repo: 'my-app', branch: 'main' };
 * interpolate('Review ${repo} on ${branch}', vars);
 * // => 'Review my-app on main'
 */
export function interpolate(template: string, vars: Variables): string {
  return template.replace(/\$\{(\w+)\}/g, (_, key) => {
    return vars[key]?.toString() ?? `\${${key}}`;
  });
}

/**
 * Creates a prompt template that can be reused with different variables
 *
 * @example
 * const reviewPrompt = createPromptTemplate(
 *   'Review ${file} for ${concern} issues'
 * );
 *
 * reviewPrompt({ file: 'user.rb', concern: 'security' });
 * // => 'Review user.rb for security issues'
 */
export function createPromptTemplate(
  template: string
): (vars: Variables) => string {
  return (vars) => interpolate(template, vars);
}

/**
 * Tagged template literal for variable interpolation
 *
 * @example
 * const file = 'user.rb';
 * const concern = 'security';
 * const prompt = t`Review ${file} for ${concern} issues`;
 */
export function t(
  strings: TemplateStringsArray,
  ...values: (string | number | boolean)[]
): string {
  return strings.reduce((result, str, i) => {
    return result + str + (values[i]?.toString() ?? '');
  }, '');
}

// =============================================================================
// COMMON PROPS FACTORIES
// =============================================================================

/**
 * Default props for agents
 */
export interface AgentDefaults {
  model?: Model;
  activeForm?: string;
}

/**
 * Creates default props for review agents
 *
 * @example
 * const reviewDefaults = createReviewDefaults(Model.Sonnet);
 *
 * <Teammate name="security" {...reviewDefaults} />
 */
export function createReviewDefaults(model: Model = Model.Sonnet): AgentDefaults {
  return {
    model,
    activeForm: 'Reviewing...'
  };
}

/**
 * Creates default props for implementation agents
 */
export function createImplementDefaults(model: Model = Model.Sonnet): AgentDefaults {
  return {
    model,
    activeForm: 'Implementing...'
  };
}

/**
 * Creates default props for research agents
 */
export function createResearchDefaults(model: Model = Model.Haiku): AgentDefaults {
  return {
    model,
    activeForm: 'Researching...'
  };
}

/**
 * Creates default props for testing agents
 */
export function createTestDefaults(model: Model = Model.Sonnet): AgentDefaults {
  return {
    model,
    activeForm: 'Testing...'
  };
}

// =============================================================================
// WORKFLOW FACTORIES
// =============================================================================

export interface ReviewWorkflowConfig {
  files: string[];
  reviewers: (AgentType | PluginAgentType)[];
  teamName?: string;
}

export interface ReviewWorkflowResult {
  team: TeamRef;
  workers: WorkerRef[];
  taskPool: TaskPoolResult;
}

/**
 * Creates a complete review workflow with team, workers, and tasks
 *
 * @example
 * const workflow = createReviewWorkflow({
 *   files: ['user.rb', 'payment.rb'],
 *   reviewers: [PluginAgentType.SecuritySentinel, PluginAgentType.PerformanceOracle]
 * });
 *
 * // workflow.team - TeamRef
 * // workflow.workers - WorkerRef[]
 * // workflow.taskPool - TaskPoolResult
 */
export function createReviewWorkflow(
  config: ReviewWorkflowConfig
): ReviewWorkflowResult {
  resetWorkerIds();
  resetTaskIds();

  // Create workers for each reviewer
  const workers = config.reviewers.map((type, i) => {
    const name = typeof type === 'string' ? type.split(':').pop()! : type;
    return defineWorker(`reviewer-${i + 1}`, type);
  });

  // Create team
  const team = defineTeam(config.teamName ?? 'review-team', workers);

  // Create task pool for files
  const taskPool = createFileReviewPool(config.files);

  return { team, workers, taskPool };
}

export interface PipelineWorkflowConfig {
  title: string;
  stages: Array<{
    name: string;
    subject: string;
    description?: string;
    agentType?: AgentType | PluginAgentType;
  }>;
}

export interface PipelineWorkflowResult {
  pipeline: Pipeline;
  workers: Record<string, WorkerRef>;
}

/**
 * Creates a pipeline workflow with workers for each stage
 *
 * @example
 * const workflow = createPipelineWorkflow({
 *   title: 'Feature Development',
 *   stages: [
 *     { name: 'research', subject: 'Research', agentType: AgentType.Explore },
 *     { name: 'implement', subject: 'Implement', agentType: AgentType.GeneralPurpose },
 *     { name: 'test', subject: 'Test', agentType: AgentType.Bash }
 *   ]
 * });
 */
export function createPipelineWorkflow(
  config: PipelineWorkflowConfig
): PipelineWorkflowResult {
  resetWorkerIds();

  // Create pipeline
  let builder = createPipeline(config.title);
  const workers: Record<string, WorkerRef> = {};

  for (const stage of config.stages) {
    builder = builder.task(stage.name, stage.subject, stage.description);
    if (stage.agentType) {
      workers[stage.name] = defineWorker(stage.name, stage.agentType);
    }
  }

  return {
    pipeline: builder.build(),
    workers
  };
}

/**
 * Creates a swarm workflow with a pool of workers
 */
export interface SwarmWorkflowConfig {
  teamName: string;
  workerCount: number;
  workerType: AgentType | PluginAgentType;
  tasks: Array<{ name: string; subject: string }>;
}

export interface SwarmWorkflowResult {
  team: TeamRef;
  workers: WorkerRef[];
  taskPool: TaskPoolResult;
}

export function createSwarmWorkflow(
  config: SwarmWorkflowConfig
): SwarmWorkflowResult {
  resetWorkerIds();
  resetTaskIds();

  // Create workers
  const workers: WorkerRef[] = [];
  for (let i = 0; i < config.workerCount; i++) {
    workers.push(defineWorker(`worker-${i + 1}`, config.workerType));
  }

  // Create team
  const team = defineTeam(config.teamName, workers);

  // Create task pool
  const taskPool = createTaskPool(config.tasks);

  return { team, workers, taskPool };
}

// =============================================================================
// COMPUTED DEPENDENCIES
// =============================================================================

/**
 * Extended TaskPoolResult with computed dependency helpers
 */
export interface TaskPoolWithDeps extends TaskPoolResult {
  /** Returns a dependency that waits for ALL tasks in pool */
  all(): TaskRef[];
  /** Returns a dependency that waits for ANY task (first to complete) */
  any(): TaskRef;
  /** Returns subset of tasks matching predicate */
  filter(predicate: (task: TaskRef) => boolean): TaskRef[];
  /** Returns first N tasks */
  first(n: number): TaskRef[];
  /** Returns last N tasks */
  last(n: number): TaskRef[];
  /** Returns count of tasks */
  count(): number;
}

/**
 * Creates a task pool with computed dependency helpers
 *
 * @example
 * const pool = createTaskPoolWithDeps([
 *   { subject: 'Review file 1', name: 'review-1' },
 *   { subject: 'Review file 2', name: 'review-2' },
 *   { subject: 'Review file 3', name: 'review-3' }
 * ]);
 *
 * // Wait for ALL tasks
 * <TaskDef task={Integration} blockedBy={pool.all()} />
 *
 * // Wait for first 2 tasks
 * <TaskDef task={QuickCheck} blockedBy={pool.first(2)} />
 */
export function createTaskPoolWithDeps(
  items: Array<{ subject: string; name?: string }>
): TaskPoolWithDeps {
  const basePool = createTaskPool(items);

  return {
    ...basePool,
    all() {
      return [...this.tasks];
    },
    any() {
      // Returns first task as representative
      return this.tasks[0];
    },
    filter(predicate) {
      return this.tasks.filter(predicate);
    },
    first(n) {
      return this.tasks.slice(0, n);
    },
    last(n) {
      return this.tasks.slice(-n);
    },
    count() {
      return this.tasks.length;
    }
  };
}

/**
 * Creates a file review pool with computed dependency helpers
 */
export function createFileReviewPoolWithDeps(
  files: string[],
  reviewType = 'Review'
): TaskPoolWithDeps {
  return createTaskPoolWithDeps(
    files.map((file) => {
      const name = file.replace(/[\/\.]/g, '-');
      return {
        subject: `${reviewType} ${file}`,
        name
      };
    })
  );
}

// =============================================================================
// DEPENDENCY COMBINATORS
// =============================================================================

/**
 * Combines multiple task refs into a single dependency array
 *
 * @example
 * const deps = combine(Task1, Task2, pool.first(2));
 * <TaskDef task={Final} blockedBy={deps} />
 */
export function combine(
  ...refs: (TaskRef | TaskRef[] | undefined)[]
): TaskRef[] {
  return refs.flat().filter((ref): ref is TaskRef => ref !== undefined);
}

/**
 * Creates a dependency on all tasks from multiple sources
 *
 * @example
 * <TaskDef
 *   task={Deploy}
 *   blockedBy={allOf(frontendTasks.all(), backendTasks.all(), testTask)}
 * />
 */
export function allOf(
  ...sources: (TaskRef | TaskRef[] | TaskPoolResult)[]
): TaskRef[] {
  return sources.flatMap((source) => {
    if (Array.isArray(source)) return source;
    if ('tasks' in source) return source.tasks;
    return [source];
  });
}

/**
 * Creates a named dependency group for documentation
 *
 * @example
 * const criticalPath = dependencyGroup('Critical Path', [Research, Design, Implement]);
 *
 * <TaskDef task={Deploy} blockedBy={criticalPath.tasks} />
 * // Renders: "Blocked By: Critical Path (Research, Design, Implement)"
 */
export interface DependencyGroup {
  name: string;
  tasks: TaskRef[];
}

export function dependencyGroup(
  name: string,
  tasks: TaskRef[]
): DependencyGroup {
  return { name, tasks };
}

/**
 * Creates dependencies based on task status patterns
 *
 * @example
 * // Require at least 2 of these 3 tasks to complete
 * const quorum = atLeast(2, [Task1, Task2, Task3]);
 */
export interface QuorumDependency {
  required: number;
  tasks: TaskRef[];
}

export function atLeast(required: number, tasks: TaskRef[]): QuorumDependency {
  return { required, tasks };
}

// =============================================================================
// ITERATION HELPERS
// =============================================================================

/**
 * Maps over items to create tasks
 *
 * @example
 * const files = ['user.rb', 'payment.rb', 'api.rb'];
 * const tasks = mapToTasks(files, (file) => ({
 *   subject: `Review ${file}`,
 *   name: file.replace('.rb', '')
 * }));
 */
export function mapToTasks<T>(
  items: T[],
  mapper: (item: T, index: number) => { subject: string; name?: string }
): TaskRef[] {
  resetTaskIds();
  return items.map((item, i) => {
    const { subject, name } = mapper(item, i);
    return defineTask(subject, name);
  });
}

/**
 * Maps over items to create workers
 *
 * @example
 * const reviewTypes = ['security', 'performance', 'architecture'];
 * const workers = mapToWorkers(reviewTypes, (type) => ({
 *   name: type,
 *   type: `compound-engineering:review:${type}` as PluginAgentType
 * }));
 */
export function mapToWorkers<T>(
  items: T[],
  mapper: (item: T, index: number) => { name: string; type: AgentType | PluginAgentType | string; model?: Model }
): WorkerRef[] {
  resetWorkerIds();
  return items.map((item, i) => {
    const { name, type, model } = mapper(item, i);
    return defineWorker(name, type, model);
  });
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Creates multiple related tasks at once
 *
 * @example
 * const { tasks, refs } = batchTasks('review', [
 *   { suffix: 'security', subject: 'Security Review' },
 *   { suffix: 'perf', subject: 'Performance Review' },
 *   { suffix: 'arch', subject: 'Architecture Review' }
 * ]);
 *
 * // refs.security, refs.perf, refs.arch
 */
export interface BatchTaskConfig {
  suffix: string;
  subject: string;
}

export interface BatchTaskResult {
  tasks: TaskRef[];
  refs: Record<string, TaskRef>;
}

export function batchTasks(
  prefix: string,
  configs: BatchTaskConfig[]
): BatchTaskResult {
  resetTaskIds();
  const tasks: TaskRef[] = [];
  const refs: Record<string, TaskRef> = {};

  for (const config of configs) {
    const name = `${prefix}-${config.suffix}`;
    const ref = defineTask(config.subject, name);
    tasks.push(ref);
    refs[config.suffix] = ref;
  }

  return { tasks, refs };
}

/**
 * Creates multiple related workers at once
 *
 * @example
 * const { workers, refs } = batchWorkers('reviewer', [
 *   { suffix: 'security', type: PluginAgentType.SecuritySentinel },
 *   { suffix: 'perf', type: PluginAgentType.PerformanceOracle }
 * ]);
 */
export interface BatchWorkerConfig {
  suffix: string;
  type: AgentType | PluginAgentType | string;
  model?: Model;
}

export interface BatchWorkerResult {
  workers: WorkerRef[];
  refs: Record<string, WorkerRef>;
}

export function batchWorkers(
  prefix: string,
  configs: BatchWorkerConfig[]
): BatchWorkerResult {
  resetWorkerIds();
  const workers: WorkerRef[] = [];
  const refs: Record<string, WorkerRef> = {};

  for (const config of configs) {
    const name = `${prefix}-${config.suffix}`;
    const ref = defineWorker(name, config.type, config.model);
    workers.push(ref);
    refs[config.suffix] = ref;
  }

  return { workers, refs };
}

// =============================================================================
// RESET ALL
// =============================================================================

/**
 * Resets all ID counters (tasks, workers, teams)
 * Call this at the start of each new workflow definition
 */
export function resetAllIds(): void {
  resetTaskIds();
  resetWorkerIds();
  resetTeamIds();
}
