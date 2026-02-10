/**
 * Team Helpers - TSX Interface Sketches
 *
 * Concrete interfaces for the team-helpers proposal.
 * These are SPEC files, not implementation.
 */

import {
  AgentType,
  PluginAgentType,
  Model,
  WorkerRef,
  TeamRef,
  TaskRef,
  defineWorker,
  defineTeam,
  defineTask,
} from '../experimentals/swarm/docs/specs/enums';

// =============================================================================
// PERSONA (P0)
// =============================================================================

interface PersonaProps {
  /** Agent's functional role / expertise area */
  role: string;
  /** What the agent optimizes for — shapes prioritization */
  goal: string;
  /** Narrative context shaping reasoning and communication style */
  backstory?: string;
  /** Hard constraints the agent must follow */
  constraints?: string[];
  /** Detailed task instructions (alternative to children) */
  children?: React.ReactNode;
}

/**
 * @component Persona
 * @description Structured prompt sections that shape agent behavior through narrative.
 *
 * Use inside <Teammate> as alternative to plain `prompt` prop.
 * Generates structured markdown sections (Role, Goal, Background, etc.)
 */
export function Persona({ role, goal, backstory, constraints, children }: PersonaProps) {
  // Emits:
  // ## Role
  // {role}
  //
  // ## Goal
  // {goal}
  //
  // ## Background
  // {backstory}
  //
  // ## Constraints
  // - {constraint[0]}
  // - {constraint[1]}
  //
  // ## Instructions
  // {children}
}

// =============================================================================
// PERSONA USAGE EXAMPLES
// =============================================================================

// Example 1: Simple persona
const SimplePersonaExample = () => (
  <Teammate worker={defineWorker('security', PluginAgentType.SecuritySentinel)} description="Security audit">
    <Persona
      role="Security Engineer"
      goal="Find all critical vulnerabilities"
    >
      Review authentication code for OWASP Top 10. Send findings to team-lead.
    </Persona>
  </Teammate>
);

// Example 2: Full persona with backstory and constraints
const FullPersonaExample = () => (
  <Teammate worker={defineWorker('architect', PluginAgentType.ArchitectureStrategist, Model.Opus)} description="Architecture review">
    <Persona
      role="Principal Software Architect"
      goal="Ensure system design supports 10x growth without rewrites"
      backstory="15 years designing distributed systems. Migrated 3 monoliths to microservices. Values simplicity over cleverness."
      constraints={[
        'Reject any design that introduces circular dependencies',
        'Require explicit error handling strategy for every external call',
        'Flag any module with more than 5 direct dependencies',
      ]}
    >
      Review the proposed architecture for the payment processing system.
      Focus on separation of concerns between payment gateway, order management, and notification services.
      Provide a written recommendation with architecture decision records (ADRs).
      Send findings to team-lead.
    </Persona>
  </Teammate>
);

/**
 * Example 2 emits:
 *
 * ```markdown
 * ## Role
 * Principal Software Architect
 *
 * ## Goal
 * Ensure system design supports 10x growth without rewrites
 *
 * ## Background
 * 15 years designing distributed systems. Migrated 3 monoliths to microservices. Values simplicity over cleverness.
 *
 * ## Constraints
 * - Reject any design that introduces circular dependencies
 * - Require explicit error handling strategy for every external call
 * - Flag any module with more than 5 direct dependencies
 *
 * ## Instructions
 * Review the proposed architecture for the payment processing system.
 * Focus on separation of concerns between payment gateway, order management, and notification services.
 * Provide a written recommendation with architecture decision records (ADRs).
 * Send findings to team-lead.
 * ```
 */

// =============================================================================
// REVIEW TEAM (P0)
// =============================================================================

/** Available review dimensions with default worker mappings */
type ReviewDimension = 'security' | 'performance' | 'architecture' | 'quality';

interface ReviewTeamProps {
  /** What is being reviewed — injected into all reviewer prompts */
  target: string;

  /** Review dimensions to activate (default: ['security', 'performance', 'architecture']) */
  reviewers?: ReviewDimension[];

  /** Additional context injected into all reviewer prompts */
  context?: string;

  /** Team name override (default: auto-generated from target) */
  name?: string;

  /**
   * Override default workers entirely.
   * When provided, reviewers prop is ignored and children define the team.
   */
  children?: React.ReactNode;
}

/** Internal: default worker config per dimension */
const REVIEW_DEFAULTS: Record<ReviewDimension, { type: PluginAgentType; model: Model; focus: string }> = {
  security: {
    type: PluginAgentType.SecuritySentinel,
    model: Model.Sonnet,
    focus: 'security vulnerabilities (OWASP Top 10, auth bypass, injection, data exposure)',
  },
  performance: {
    type: PluginAgentType.PerformanceOracle,
    model: Model.Sonnet,
    focus: 'performance issues (N+1 queries, missing indexes, memory leaks, inefficient algorithms)',
  },
  architecture: {
    type: PluginAgentType.ArchitectureStrategist,
    model: Model.Sonnet,
    focus: 'architectural concerns (SOLID principles, separation of concerns, testability, coupling)',
  },
  quality: {
    type: PluginAgentType.CodeSimplicityReviewer,
    model: Model.Sonnet,
    focus: 'code quality (readability, naming, complexity, duplication, error handling)',
  },
};

/**
 * @component ReviewTeam
 * @description Parallel specialists review the same artifact simultaneously.
 *
 * Composes: Team + Teammate (per dimension) + ShutdownSequence
 * Pattern: Fan-out parallel workers, each sends findings to team-lead.
 */
export function ReviewTeam({ target, reviewers, context, name, children }: ReviewTeamProps) {
  // Internal implementation:
  // 1. For each dimension in `reviewers`, create a WorkerRef with REVIEW_DEFAULTS
  // 2. Create TeamRef with all workers
  // 3. Emit <Workflow> containing:
  //    - <Team> with <Teammate> per dimension
  //    - <ShutdownSequence> for all workers
}

// =============================================================================
// REVIEW TEAM USAGE EXAMPLES
// =============================================================================

// Example 1: Minimal — just specify what to review
const MinimalReviewExample = () => (
  <Command name="review-pr" description="Review a pull request">
    <ReviewTeam target="PR #123 - Add user authentication" />
  </Command>
);
// Uses default reviewers: security, performance, architecture

// Example 2: Custom dimensions with context
const CustomReviewExample = () => (
  <Command name="review-migration" description="Review database migration">
    <ReviewTeam
      target="Migration: add payment_transactions table"
      reviewers={['security', 'performance', 'quality']}
      context="This migration runs on a 500M row database. Downtime budget: 30 seconds."
    />
  </Command>
);

// Example 3: Full override with children
const OverrideReviewExample = () => {
  const CustomReviewer = defineWorker('data-integrity', PluginAgentType.DataIntegrityGuardian, Model.Opus);
  const SecurityReviewer = defineWorker('security', PluginAgentType.SecuritySentinel);
  const ReviewTeamRef = defineTeam('migration-review', [CustomReviewer, SecurityReviewer]);

  return (
    <Command name="review-migration" description="Review database migration">
      <ReviewTeam target="Migration: add payment_transactions table" name="migration-review">
        {/* Children override default workers */}
        <Teammate worker={CustomReviewer} description="Data integrity check">
          <Persona
            role="Data Integrity Specialist"
            goal="Ensure zero data loss during migration"
          >
            Verify referential integrity, check for orphaned records, validate constraints.
          </Persona>
        </Teammate>
        <Teammate worker={SecurityReviewer} description="Security review">
          <Prompt>Review for SQL injection risks in migration scripts.</Prompt>
        </Teammate>
      </ReviewTeam>
    </Command>
  );
};

// =============================================================================
// RESEARCH TEAM (P1)
// =============================================================================

interface ResearchTeamProps {
  /** Research question or topic */
  question: string;

  /** Research angles — each becomes a parallel researcher */
  angles: string[];

  /** Research depth (affects model choice and prompt detail) */
  depth?: 'quick' | 'standard' | 'deep';

  /** Output format for the synthesis phase */
  output?: 'comparison' | 'recommendation' | 'report';

  /** Additional context for all researchers */
  context?: string;

  /** Team name override */
  name?: string;
}

/** Internal: depth -> model mapping */
const DEPTH_CONFIG = {
  quick:    { researchModel: Model.Haiku,  synthModel: Model.Sonnet },
  standard: { researchModel: Model.Sonnet, synthModel: Model.Sonnet },
  deep:     { researchModel: Model.Sonnet, synthModel: Model.Opus },
} as const;

/**
 * @component ResearchTeam
 * @description Multiple researchers investigate different angles in parallel,
 *              then a synthesizer combines findings.
 *
 * Composes: Team + Teammate (per angle) + synthesizer Teammate + TaskPipeline
 * Pattern: Phase 1 (parallel research) -> Phase 2 (synthesis)
 */
export function ResearchTeam({ question, angles, depth, output, context, name }: ResearchTeamProps) {
  // Internal implementation:
  // 1. Create N WorkerRef (AgentType.Explore) for each angle
  // 2. Create 1 WorkerRef (AgentType.GeneralPurpose) for synthesizer
  // 3. Create TeamRef with all workers
  // 4. Create TaskPipeline:
  //    - N parallel research tasks (no blockedBy)
  //    - 1 synthesis task (blockedBy: all research tasks)
  // 5. Emit <Workflow> containing:
  //    - <Team> with all Teammates
  //    - <TaskPipeline> with research + synthesis tasks
  //    - <ShutdownSequence>
}

// =============================================================================
// RESEARCH TEAM USAGE EXAMPLES
// =============================================================================

// Example 1: Quick comparison
const QuickCompareExample = () => (
  <Command name="compare-db" description="Compare database options">
    <ResearchTeam
      question="Best database for our real-time analytics pipeline"
      angles={['PostgreSQL + TimescaleDB', 'ClickHouse', 'Apache Druid']}
      depth="quick"
      output="comparison"
    />
  </Command>
);

// Example 2: Deep recommendation
const DeepRecommendExample = () => (
  <Command name="auth-strategy" description="Research auth strategies">
    <ResearchTeam
      question="Optimal authentication strategy for our B2B SaaS"
      angles={[
        'OAuth2 + OIDC with Auth0/Clerk',
        'SAML-based SSO for enterprise',
        'Passkeys / WebAuthn',
        'Custom JWT with refresh token rotation',
      ]}
      depth="deep"
      output="recommendation"
      context="Multi-tenant SaaS, 500+ enterprise customers, SOC2 compliance required."
    />
  </Command>
);

// =============================================================================
// FAN-OUT SYNTHESIZE PATTERN (P1)
// =============================================================================

interface FanOutSynthesizeProps {
  /** Parallel worker definitions */
  workers: Array<{
    name: string;
    prompt: string;
    type?: AgentType | PluginAgentType;
    model?: Model;
  }>;

  /** Synthesizer instructions */
  synthesize: string;

  /** Synthesizer model (default: Model.Opus) */
  synthesizerModel?: Model;

  /** Team name */
  name?: string;

  /** Description */
  description?: string;
}

/**
 * @component FanOutSynthesize
 * @description Generic pattern: N parallel workers -> 1 synthesizer.
 *
 * This is the low-level pattern that powers ResearchTeam, financial analysis,
 * and any "gather then combine" workflow.
 */
export function FanOutSynthesize({ workers, synthesize, synthesizerModel, name, description }: FanOutSynthesizeProps) {
  // Emits Workflow with:
  // 1. Team containing all workers + synthesizer
  // 2. TaskPipeline:
  //    - N parallel tasks (one per worker)
  //    - 1 synthesis task blockedBy all N tasks
  // 3. ShutdownSequence
}

// =============================================================================
// FAN-OUT SYNTHESIZE USAGE EXAMPLES
// =============================================================================

// Example: Financial analysis
const FinancialAnalysisExample = () => (
  <Command name="investment-analysis" description="Analyze investment opportunity">
    <FanOutSynthesize
      name="fintech-analysis"
      description="Multi-angle fintech investment analysis"
      workers={[
        { name: 'market-data', prompt: 'Gather Q3 market data for top 5 fintech stocks. Focus on revenue growth, user acquisition, and regulatory developments.' },
        { name: 'news-sentiment', prompt: 'Analyze news sentiment for fintech sector over past 30 days. Track coverage of major players and emerging trends.' },
        { name: 'tech-analysis', prompt: 'Technical analysis: support/resistance levels, volume trends, and momentum indicators for PYPL, SQ, SOFI, AFRM, NU.' },
      ]}
      synthesize="Synthesize all research into a ranked investment recommendation. Include risk assessment, confidence levels, and a recommended portfolio allocation."
      synthesizerModel={Model.Opus}
    />
  </Command>
);

// =============================================================================
// CONTENT PIPELINE (P1)
// =============================================================================

type ContentStage = 'research' | 'outline' | 'write' | 'edit' | 'review';
type ContentOutput = 'blog-post' | 'report' | 'documentation' | 'analysis';

interface ContentPipelineProps {
  /** Content topic or brief */
  topic: string;

  /** Output format (shapes prompts for each stage) */
  output?: ContentOutput;

  /** Stages to include (default: ['research', 'write', 'edit']) */
  stages?: ContentStage[];

  /** Additional context for all stages */
  context?: string;

  /** Pipeline title override */
  title?: string;
}

/** Internal: stage -> worker config */
const CONTENT_STAGE_DEFAULTS: Record<ContentStage, { type: AgentType; model: Model; activeForm: string }> = {
  research: { type: AgentType.Explore,         model: Model.Haiku,  activeForm: 'Researching...' },
  outline:  { type: AgentType.Plan,            model: Model.Sonnet, activeForm: 'Outlining...' },
  write:    { type: AgentType.GeneralPurpose,  model: Model.Sonnet, activeForm: 'Writing...' },
  edit:     { type: AgentType.GeneralPurpose,  model: Model.Opus,   activeForm: 'Editing...' },
  review:   { type: AgentType.GeneralPurpose,  model: Model.Sonnet, activeForm: 'Reviewing...' },
};

/**
 * @component ContentPipeline
 * @description Sequential specialists produce content through staged refinement.
 *
 * Composes: TaskPipeline autoChain with one worker per stage.
 * Pattern: Linear pipeline where each stage builds on the previous output.
 */
export function ContentPipeline({ topic, output, stages, context, title }: ContentPipelineProps) {
  // Emits TaskPipeline autoChain with:
  // - One TaskDef per stage
  // - Prompts shaped by `output` format and `topic`
  // - Context injected into each stage prompt
}

// =============================================================================
// CONTENT PIPELINE USAGE EXAMPLES
// =============================================================================

// Example 1: Blog post
const BlogPostExample = () => (
  <Command name="write-blog" description="Generate a blog post">
    <ContentPipeline
      topic="Why React Server Components change everything for data-heavy applications"
      output="blog-post"
      stages={['research', 'outline', 'write', 'edit']}
    />
  </Command>
);

// Example 2: Technical documentation
const TechDocsExample = () => (
  <Command name="write-docs" description="Generate technical documentation">
    <ContentPipeline
      topic="API reference for the payment processing module"
      output="documentation"
      stages={['research', 'write', 'review']}
      context="Target audience: backend engineers integrating our payment API. Include code examples in TypeScript."
    />
  </Command>
);

// =============================================================================
// FEATURE PIPELINE (P2)
// =============================================================================

interface FeaturePipelineProps {
  /** Feature description */
  feature: string;

  /** Pipeline stages (default: ['research', 'plan', 'implement', 'test']) */
  stages?: ('research' | 'plan' | 'implement' | 'test' | 'review')[];

  /** Enable plan approval gate between plan and implement */
  planApproval?: boolean;

  /** Review dimensions for the review stage (uses ReviewTeam internally) */
  reviewers?: ReviewDimension[];

  /** Additional context */
  context?: string;

  /** Pipeline title override */
  title?: string;
}

/**
 * @component FeaturePipeline
 * @description End-to-end feature implementation with optional parallel review.
 *
 * Composes: TaskPipeline (autoChain for stages) + ReviewTeam (for review stage)
 * Pattern: Sequential pipeline + parallel fan-out at the end.
 *
 * When `planApproval` is true, the planner gets `mode="plan"` requiring
 * leader approval before proceeding to implementation.
 */
export function FeaturePipeline({ feature, stages, planApproval, reviewers, context, title }: FeaturePipelineProps) {
  // Emits Workflow containing:
  // 1. Team with all workers (research, plan, implement, test, review specialists)
  // 2. TaskPipeline autoChain for stages 1 through N-1
  // 3. If 'review' stage:
  //    - ReviewTeam with specified dimensions, blockedBy last pipeline stage
  // 4. ShutdownSequence for all workers
}

// =============================================================================
// FEATURE PIPELINE USAGE EXAMPLES
// =============================================================================

// Example 1: Standard feature
const StandardFeatureExample = () => (
  <Command name="build-auth" description="Build authentication">
    <FeaturePipeline
      feature="OAuth2 authentication with Google and GitHub providers"
      stages={['research', 'plan', 'implement', 'test', 'review']}
      planApproval={true}
      reviewers={['security', 'performance']}
      context="Existing Express.js backend with PostgreSQL. Use passport.js."
    />
  </Command>
);

// Example 2: Quick implementation (no research or review)
const QuickFeatureExample = () => (
  <Command name="add-endpoint" description="Add API endpoint">
    <FeaturePipeline
      feature="Add GET /api/users/:id/activity endpoint"
      stages={['plan', 'implement', 'test']}
      context="Follow existing patterns in src/routes/users.ts"
    />
  </Command>
);

// =============================================================================
// COMPOSITION EXAMPLES
// =============================================================================

// Team helpers compose naturally inside Command

// Example: Multi-phase project using multiple helpers
const MultiPhaseProject = () => (
  <Command name="launch-feature" description="Full feature launch workflow">
    <h1>Feature Launch: Payment Processing v2</h1>

    <h2>Phase 1: Research</h2>
    <ResearchTeam
      question="Best payment processing architecture for our scale"
      angles={['Stripe Connect', 'Adyen for Platforms', 'Custom with Plaid']}
      depth="deep"
      output="recommendation"
    />

    <h2>Phase 2: Build</h2>
    <FeaturePipeline
      feature="Payment processing v2 based on research recommendation"
      stages={['plan', 'implement', 'test']}
      planApproval={true}
    />

    <h2>Phase 3: Review</h2>
    <ReviewTeam
      target="Payment processing v2 implementation"
      reviewers={['security', 'performance', 'architecture', 'quality']}
    />
  </Command>
);
