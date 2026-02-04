/**
 * Pipeline Builder
 *
 * Fluent builder pattern for creating auto-chained task pipelines.
 * Provides programmatic alternative to JSX TaskPipeline.
 */

import { defineTask, type TaskRef } from './refs.js';

/**
 * A single stage in the pipeline with its dependencies
 */
export interface PipelineStage {
  /** Task reference for this stage */
  task: TaskRef;
  /** Optional description override */
  description?: string;
  /** Tasks that block this stage */
  blockedBy: TaskRef[];
}

/**
 * Complete pipeline definition
 */
export interface Pipeline {
  /** Pipeline title */
  title: string;
  /** Map of task names to TaskRefs for easy access */
  tasks: Record<string, TaskRef>;
  /** Ordered stages with dependencies */
  stages: PipelineStage[];
}

/**
 * Fluent builder interface for constructing pipelines
 */
export interface PipelineBuilder {
  /**
   * Add a task to the pipeline
   *
   * When autoChain is enabled (default), each task after the first
   * is automatically blocked by the previous task.
   *
   * @param subject - Human-readable task title (maps to TaskCreate.subject)
   * @param name - Optional short label for diagrams (derived from subject if not provided)
   * @param description - Optional description for the stage
   */
  task(subject: string, name?: string, description?: string): PipelineBuilder;

  /**
   * Finalize and return the pipeline
   */
  build(): Pipeline;
}

/**
 * Internal builder implementation
 */
class PipelineBuilderImpl implements PipelineBuilder {
  private readonly title: string;
  private readonly stages: PipelineStage[] = [];
  private readonly taskMap: Record<string, TaskRef> = {};

  constructor(title: string) {
    this.title = title;
  }

  task(subject: string, name?: string, description?: string): PipelineBuilder {
    const taskRef = defineTask(subject, name);
    const effectiveName = taskRef.name;

    // Auto-chain: block by previous task if exists
    const blockedBy: TaskRef[] = [];
    if (this.stages.length > 0) {
      blockedBy.push(this.stages[this.stages.length - 1].task);
    }

    this.stages.push({
      task: taskRef,
      description,
      blockedBy,
    });

    this.taskMap[effectiveName] = taskRef;

    return this;
  }

  build(): Pipeline {
    return {
      title: this.title,
      tasks: { ...this.taskMap },
      stages: [...this.stages],
    };
  }
}

/**
 * Create a new pipeline builder
 *
 * @param title - Pipeline title (used as section heading)
 *
 * @example
 * const pipeline = createPipeline('OAuth Implementation')
 *   .task('Research OAuth providers', 'research')
 *   .task('Create implementation plan', 'plan')
 *   .task('Build OAuth integration', 'implement')
 *   .build();
 *
 * // Access tasks by name
 * const { research, plan, implement } = pipeline.tasks;
 */
export function createPipeline(title: string): PipelineBuilder {
  return new PipelineBuilderImpl(title);
}
