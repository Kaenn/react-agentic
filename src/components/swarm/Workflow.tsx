/**
 * Workflow - Orchestrates Team, TaskPipeline, and ShutdownSequence
 *
 * Provides team context propagation to child components.
 * Emits structured markdown with heading level adjustment.
 */

import type { TeamRef } from './refs.js';
import type { ReactNode } from 'react';

export interface WorkflowProps {
  /**
   * Workflow name - appears in heading.
   */
  name: string;

  /**
   * Team reference for context propagation.
   * Child components (e.g., ShutdownSequence) can inherit this.
   */
  team: TeamRef;

  /**
   * Optional description displayed as blockquote.
   */
  description?: string;

  /**
   * Child components: Team, TaskPipeline, ShutdownSequence, etc.
   */
  children: ReactNode;
}

/**
 * Orchestrates a complete workflow with team context propagation.
 *
 * @example
 * <Workflow name="Feature X" team={FeatureTeam} description="Build feature with review">
 *   <Team team={FeatureTeam}>
 *     <Teammate worker={Security} description="Security review" prompt="..." />
 *   </Team>
 *   <TaskPipeline title="Implementation">
 *     <TaskDef task={Research} description="Research best practices" />
 *     <TaskDef task={Plan} description="Plan implementation" blockedBy={[Research]} />
 *   </TaskPipeline>
 *   <ShutdownSequence workers={[Security]} reason="Feature complete" />
 * </Workflow>
 */
export function Workflow(_props: WorkflowProps): null {
  return null;
}
