/**
 * Grammar Tests: Table Component
 *
 * Tests Table component with structured data props.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('<Table>', () => {
  describe('type safety', () => {
    it('compiles with headers and rows', () => {
      const content = `<Table
        headers={['A', 'B']}
        rows={[['1', '2'], ['3', '4']]}
      />`;
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('compiles with only rows', () => {
      const content = `<Table rows={[['1', '2']]} />`;
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('accepts align prop', () => {
      const content = `<Table
        headers={['A', 'B']}
        rows={[['1', '2']]}
        align={['left', 'right']}
      />`;
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('accepts emptyCell prop', () => {
      const content = `<Table
        headers={['A', 'B']}
        rows={[['1', '']]}
        emptyCell="-"
      />`;
      expect(() => transformAgentContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits markdown table with headers', () => {
      const output = transformAgentContent(`
        <Table
          headers={['Name', 'Value']}
          rows={[['foo', 'bar']]}
        />
      `);
      expect(output).toContain('| Name | Value |');
      expect(output).toContain('| foo | bar |');
    });

    it('emits separator row', () => {
      const output = transformAgentContent(`
        <Table
          headers={['A', 'B']}
          rows={[['1', '2']]}
        />
      `);
      expect(output).toMatch(/\|[\s:-]+\|[\s:-]+\|/);
    });

    it('handles multiple rows', () => {
      const output = transformAgentContent(`
        <Table
          headers={['A']}
          rows={[['1'], ['2'], ['3']]}
        />
      `);
      expect(output).toContain('| 1 |');
      expect(output).toContain('| 2 |');
      expect(output).toContain('| 3 |');
    });
  });

  describe('alignment', () => {
    it('emits left alignment', () => {
      const output = transformAgentContent(`
        <Table
          headers={['A']}
          rows={[['1']]}
          align={['left']}
        />
      `);
      expect(output).toContain(':---');
    });

    it('emits center alignment', () => {
      const output = transformAgentContent(`
        <Table
          headers={['A']}
          rows={[['1']]}
          align={['center']}
        />
      `);
      expect(output).toContain(':---:');
    });

    it('emits right alignment', () => {
      const output = transformAgentContent(`
        <Table
          headers={['A']}
          rows={[['1']]}
          align={['right']}
        />
      `);
      expect(output).toContain('---:');
    });

    it('handles mixed alignment', () => {
      const output = transformAgentContent(`
        <Table
          headers={['Left', 'Center', 'Right']}
          rows={[['a', 'b', 'c']]}
          align={['left', 'center', 'right']}
        />
      `);
      expect(output).toContain(':---');
      expect(output).toContain(':---:');
      expect(output).toContain('---:');
    });
  });

  describe('empty cells', () => {
    it('uses default empty string', () => {
      const output = transformAgentContent(`
        <Table
          headers={['A', 'B']}
          rows={[['1', '']]}
        />
      `);
      expect(output).toContain('| 1 |  |');
    });

    it('uses custom emptyCell value', () => {
      const output = transformAgentContent(`
        <Table
          headers={['A', 'B']}
          rows={[['1', '']]}
          emptyCell="-"
        />
      `);
      expect(output).toContain('| 1 | - |');
    });
  });

  describe('special characters', () => {
    it('escapes pipe characters', () => {
      const output = transformAgentContent(`
        <Table
          headers={['Pattern']}
          rows={[['a|b']]}
        />
      `);
      expect(output).toContain('a\\|b');
    });
  });
});
