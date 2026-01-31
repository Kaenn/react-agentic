import { describe, it, expect } from 'vitest';
import { SpawnAgentWithRetry, type SpawnAgentWithRetryProps } from '../../src/composites/index.js';
import type { BaseOutput } from '../../src/workflow/agents/types.js';

describe('Agent Composites', () => {
  describe('SpawnAgentWithRetry', () => {
    it('should be exported from composites', () => {
      expect(SpawnAgentWithRetry).toBeDefined();
    });

    it('should have correct props interface exported', () => {
      // Type-level test - if this compiles, interface is correctly exported
      const props: SpawnAgentWithRetryProps = {
        agent: 'test-agent',
        maxRetries: 3,
      };
      expect(props).toBeDefined();
    });

    it('should accept typed AgentRef', () => {
      interface TestInput { id: string }
      interface TestOutput extends BaseOutput { data: string }

      const props: SpawnAgentWithRetryProps<TestInput, TestOutput> = {
        agent: 'typed-agent',
        input: { id: '123' },
        maxRetries: 5,
      };
      expect(props).toBeDefined();
    });

    it('should accept retryWhen and breakWhen conditions', () => {
      const props: SpawnAgentWithRetryProps = {
        agent: 'test-agent',
        retryWhen: true, // Condition type accepts boolean
        breakWhen: false,
        maxRetries: 10,
      };
      expect(props).toBeDefined();
      expect(props.retryWhen).toBe(true);
      expect(props.breakWhen).toBe(false);
    });

    it('should have optional model and description', () => {
      const minimalProps: SpawnAgentWithRetryProps = {
        agent: 'minimal-agent',
      };
      expect(minimalProps.model).toBeUndefined();
      expect(minimalProps.description).toBeUndefined();
    });
  });
});
