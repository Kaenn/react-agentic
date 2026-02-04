/**
 * @component TaskPipeline
 * @description Container for sequential tasks with automatic dependency visualization
 */

import {
  TaskRef,
  defineTask,
  resetTaskIds,
  createPipeline,
  Pipeline,
  PipelineBuilder,
  PipelineStage
} from './enums';

// =============================================================================
// RE-EXPORTS (for convenience)
// =============================================================================

export { TaskRef, defineTask, createPipeline, Pipeline, PipelineBuilder, PipelineStage };

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface TaskPipelineProps {
  /**
   * Title for the pipeline section
   * @default "Task Pipeline"
   */
  title?: string;

  /**
   * Automatically chain tasks in sequence
   * When true, each task is blocked by the previous one
   * @default false
   */
  autoChain?: boolean;

  /**
   * TaskDef components defining the pipeline stages
   * If autoChain=true, blockedBy is set automatically
   * @required
   */
  children: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TaskPipeline({ title = 'Task Pipeline', children }: TaskPipelineProps) {
  // Implementation renders to markdown with mermaid diagram
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// -----------------------------------------------------------------------------
// Pattern 1: Using defineTask with type-safe references (RECOMMENDED)
// -----------------------------------------------------------------------------

const Research = defineTask('Research', 'research');
const Implement = defineTask('Implement', 'implement');
const Test = defineTask('Test', 'test');

const TypeSafePipeline = () => (
  <TaskPipeline>
    <TaskDef task={Research} description="Research best practices" activeForm="Researching..." />

    <TaskDef
      task={Implement}
      description="Implement the feature"
      activeForm="Implementing..."
      blockedBy={[Research]} // Type-safe reference!
    />

    <TaskDef
      task={Test}
      description="Write and run tests"
      activeForm="Testing..."
      blockedBy={[Implement]} // Type-safe reference!
    />
  </TaskPipeline>
);

// -----------------------------------------------------------------------------
// Pattern 2: Auto-chaining (pipeline handles dependencies automatically)
// -----------------------------------------------------------------------------

const AutoChainPipeline = () => (
  <TaskPipeline title="OAuth Implementation" autoChain>
    {/* No need to specify blockedBy - each task auto-blocked by previous */}
    <TaskDef name="research" subject="Research OAuth providers" description="Compare Google, GitHub, Auth0" />
    <TaskDef name="design" subject="Design auth flow" description="Create sequence diagrams" />
    <TaskDef name="implement" subject="Implement endpoints" description="Build OAuth endpoints" />
    <TaskDef name="test" subject="Write tests" description="Integration tests" />
    <TaskDef name="review" subject="Security review" description="Final audit" />
  </TaskPipeline>
);

// -----------------------------------------------------------------------------
// Pattern 3: Using createPipeline builder (most concise)
// -----------------------------------------------------------------------------

const pipeline = createPipeline('OAuth Implementation')
  .task('Research OAuth providers', 'research', 'Compare Google, GitHub, Auth0')
  .task('Design auth flow', 'design', 'Create sequence diagrams')
  .task('Implement endpoints', 'implement', 'Build OAuth endpoints')
  .task('Write tests', 'test', 'Integration tests')
  .task('Security review', 'review', 'Final audit')
  .build();

// Access individual task refs
const { research, design, implement, test, review } = pipeline.tasks;

// Use in JSX
const BuilderPipeline = () => (
  <TaskPipeline title={pipeline.title}>
    {pipeline.stages.map((stage) => (
      <TaskDef
        key={stage.task.__id}
        task={stage.task}
        description={stage.description || ''}
        blockedBy={stage.blockedBy}
      />
    ))}
  </TaskPipeline>
);

// -----------------------------------------------------------------------------
// Pattern 4: Complex pipeline with parallel stages
// -----------------------------------------------------------------------------

const ResearchPhase = defineTask('Research', 'research');
const FrontendImpl = defineTask('Frontend Implementation', 'frontend');
const BackendImpl = defineTask('Backend Implementation', 'backend');
const DatabaseSetup = defineTask('Database Setup', 'database');
const Integration = defineTask('Integration Testing', 'integration');
const Deploy = defineTask('Deploy', 'deploy');

const ComplexPipeline = () => (
  <TaskPipeline title="Full Stack Feature">
    {/* Stage 1: Research */}
    <TaskDef task={ResearchPhase} description="Research requirements" />

    {/* Stage 2: Parallel implementation (all blocked by research) */}
    <TaskDef task={FrontendImpl} description="Build React UI" blockedBy={[ResearchPhase]} />
    <TaskDef task={BackendImpl} description="Build API" blockedBy={[ResearchPhase]} />
    <TaskDef task={DatabaseSetup} description="Setup DB" blockedBy={[ResearchPhase]} />

    {/* Stage 3: Integration (blocked by ALL parallel tasks) */}
    <TaskDef
      task={Integration}
      description="Run integration tests"
      blockedBy={[FrontendImpl, BackendImpl, DatabaseSetup]}
    />

    {/* Stage 4: Deploy (blocked by integration) */}
    <TaskDef task={Deploy} description="Deploy to production" blockedBy={[Integration]} />
  </TaskPipeline>
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Pattern 1 (TypeSafePipeline) renders to:
 *
 * ```markdown
 * ### Task Pipeline
 *
 * ```mermaid
 * flowchart LR
 *     T1[research] --> T2[implement] --> T3[test]
 * ```
 *
 * - **#1 Research** (`research`)
 *   - Description: Research best practices
 *   - Active Form: "Researching..."
 *
 * - **#2 Implement** (`implement`)
 *   - Description: Implement the feature
 *   - Active Form: "Implementing..."
 *   - Blocked By: #1 (research)
 *
 * - **#3 Test** (`test`)
 *   - Description: Write and run tests
 *   - Active Form: "Testing..."
 *   - Blocked By: #2 (implement)
 * ```
 */

/**
 * Pattern 2 (AutoChainPipeline with autoChain=true) renders to:
 *
 * ```markdown
 * ### OAuth Implementation
 *
 * > Auto-chained: each task is automatically blocked by the previous one
 *
 * ```mermaid
 * flowchart LR
 *     T1[research] --> T2[design] --> T3[implement] --> T4[test] --> T5[review]
 * ```
 *
 * ```javascript
 * // Auto-generated dependencies
 * TaskCreate({ subject: "Research OAuth providers", ... })
 * TaskCreate({ subject: "Design auth flow", ... })
 * TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })  // Auto-added
 * TaskCreate({ subject: "Implement endpoints", ... })
 * TaskUpdate({ taskId: "3", addBlockedBy: ["2"] })  // Auto-added
 * // ... etc
 * ```
 * ```
 */

/**
 * Pattern 4 (ComplexPipeline with parallel stages) renders to:
 *
 * ```markdown
 * ### Full Stack Feature
 *
 * ```mermaid
 * flowchart LR
 *     T1[research] --> T2[frontend]
 *     T1 --> T3[backend]
 *     T1 --> T4[database]
 *     T2 --> T5[integration]
 *     T3 --> T5
 *     T4 --> T5
 *     T5 --> T6[deploy]
 * ```
 *
 * - **#1 Research** (`research`)
 *   - Description: Research requirements
 *
 * - **#2 Frontend Implementation** (`frontend`)
 *   - Description: Build React UI
 *   - Blocked By: #1 (research)
 *
 * - **#3 Backend Implementation** (`backend`)
 *   - Description: Build API
 *   - Blocked By: #1 (research)
 *
 * - **#4 Database Setup** (`database`)
 *   - Description: Setup DB
 *   - Blocked By: #1 (research)
 *
 * - **#5 Integration Testing** (`integration`)
 *   - Description: Run integration tests
 *   - Blocked By: #2 (frontend), #3 (backend), #4 (database)
 *
 * - **#6 Deploy** (`deploy`)
 *   - Description: Deploy to production
 *   - Blocked By: #5 (integration)
 * ```
 */

/**
 * How auto-IDs work:
 *
 * const Research = defineTask('Research', 'research');    // __id: UUID
 * const Implement = defineTask('Implement', 'implement'); // __id: UUID
 * const Test = defineTask('Test', 'test');               // __id: UUID
 *
 * blockedBy={[Research]} → resolved at emit time via __id
 * blockedBy={[Research, Implement]} → both resolved via __id
 *
 * Benefits:
 * - No manual ID management
 * - Type-safe references (can't typo task names)
 * - IDE autocomplete for task references
 * - Refactoring support
 */
