/**
 * Swarm System
 *
 * Type-safe references for orchestrating Claude Code agents.
 */

// Enums
export { AgentType, PluginAgentType, Model } from './enums.js';

// Refs + Factories
export { defineTask, defineWorker, defineTeam } from './refs.js';
export type { TaskRef, WorkerRef, TeamRef } from './refs.js';

// Guards
export { isTaskRef, isWorkerRef, isTeamRef } from './guards.js';

// Components
export { TaskDef, type TaskDefProps } from './TaskDef.js';
export { TaskPipeline, type TaskPipelineProps } from './TaskPipeline.js';
export { Team, type TeamProps } from './Team.js';
export { Teammate, type TeammateProps } from './Teammate.js';
export { Prompt, type PromptProps } from './Prompt.js';

// Pipeline Builder
export { createPipeline, type Pipeline, type PipelineBuilder, type PipelineStage } from './pipeline-builder.js';
