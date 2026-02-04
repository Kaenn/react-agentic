import { describe, expect, it } from 'vitest';
import {
  defineTask,
  defineWorker,
  defineTeam,
  isTaskRef,
  isWorkerRef,
  isTeamRef,
  AgentType,
  PluginAgentType,
  Model,
} from '../../src/components/swarm/index.js';

describe('Swarm Refs', () => {
  describe('defineTask', () => {
    it('creates TaskRef with subject', () => {
      const task = defineTask('Research best practices');
      expect(task.subject).toBe('Research best practices');
      expect(task.__isTaskRef).toBe(true);
    });

    it('has expected interface fields', () => {
      const task = defineTask('Research');
      expect(Object.keys(task).sort()).toEqual(['__id', '__isTaskRef', 'name', 'subject']);
    });

    it('creates unique objects for same subject', () => {
      const task1 = defineTask('Research');
      const task2 = defineTask('Research');
      expect(task1).not.toBe(task2);
      expect(task1.subject).toBe(task2.subject);
    });
  });

  describe('defineWorker', () => {
    it('creates WorkerRef with type', () => {
      const worker = defineWorker('explorer', AgentType.Explore);
      expect(worker.name).toBe('explorer');
      expect(worker.type).toBe('Explore');
      expect(worker.__isWorkerRef).toBe(true);
    });

    it('accepts optional model', () => {
      const worker = defineWorker('explorer', AgentType.Explore, Model.Haiku);
      expect(worker.model).toBe('haiku');
    });

    it('accepts plugin agent types', () => {
      const worker = defineWorker('security', PluginAgentType.SecuritySentinel);
      expect(worker.type).toBe('compound-engineering:review:security-sentinel');
    });
  });

  describe('defineTeam', () => {
    it('creates TeamRef with name', () => {
      const team = defineTeam('review-team');
      expect(team.name).toBe('review-team');
      expect(team.__isTeamRef).toBe(true);
    });

    it('accepts optional members', () => {
      const security = defineWorker('security', PluginAgentType.SecuritySentinel);
      const perf = defineWorker('perf', PluginAgentType.PerformanceOracle);
      const team = defineTeam('review-team', [security, perf]);
      expect(team.members).toHaveLength(2);
      expect(team.members?.[0]).toBe(security);
    });
  });
});

describe('Type Guards', () => {
  describe('isTaskRef', () => {
    it('returns true for TaskRef', () => {
      const task = defineTask('Research');
      expect(isTaskRef(task)).toBe(true);
    });

    it('returns false for plain object', () => {
      expect(isTaskRef({ subject: 'X' })).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isTaskRef(null)).toBe(false);
      expect(isTaskRef(undefined)).toBe(false);
    });
  });

  describe('isWorkerRef', () => {
    it('returns true for WorkerRef', () => {
      const worker = defineWorker('explorer', AgentType.Explore);
      expect(isWorkerRef(worker)).toBe(true);
    });

    it('returns false for plain object', () => {
      expect(isWorkerRef({ name: 'x', type: 'y' })).toBe(false);
    });
  });

  describe('isTeamRef', () => {
    it('returns true for TeamRef', () => {
      const team = defineTeam('review');
      expect(isTeamRef(team)).toBe(true);
    });

    it('returns false for plain object', () => {
      expect(isTeamRef({ name: 'x' })).toBe(false);
    });
  });
});

describe('Enums', () => {
  it('AgentType values match Claude Code', () => {
    expect(AgentType.Bash).toBe('Bash');
    expect(AgentType.Explore).toBe('Explore');
    expect(AgentType.Plan).toBe('Plan');
    expect(AgentType.GeneralPurpose).toBe('general-purpose');
  });

  it('PluginAgentType values match compound-engineering', () => {
    expect(PluginAgentType.SecuritySentinel).toBe('compound-engineering:review:security-sentinel');
    expect(PluginAgentType.PerformanceOracle).toBe('compound-engineering:review:performance-oracle');
  });

  it('Model values match Claude models', () => {
    expect(Model.Haiku).toBe('haiku');
    expect(Model.Sonnet).toBe('sonnet');
    expect(Model.Opus).toBe('opus');
  });
});
