import { describe, it, expect } from 'vitest';
import {
  StepSection, type StepSectionProps,
  DataTable, type DataTableProps,
  BulletList, type BulletListProps,
  FileContext, type FileContextProps,
} from '../../src/composites/index.js';

describe('Presentation Composites', () => {
  describe('StepSection', () => {
    it('should be exported', () => {
      expect(StepSection).toBeDefined();
    });

    it('should have correct props interface', () => {
      const props: StepSectionProps = {
        number: 1,
        name: 'Test Step',
      };
      expect(props).toBeDefined();
    });

    it('should accept substep numbers as strings', () => {
      const props: StepSectionProps = {
        number: '1.1',
        name: 'Substep',
        description: 'A substep',
      };
      expect(props.number).toBe('1.1');
    });

    it('should accept variant prop', () => {
      const props: StepSectionProps = {
        number: 1,
        name: 'Test',
        variant: 'bold',
      };
      expect(props.variant).toBe('bold');
    });
  });

  describe('DataTable', () => {
    it('should be exported', () => {
      expect(DataTable).toBeDefined();
    });

    it('should have correct props interface', () => {
      const props: DataTableProps = {
        rows: [['a', 'b'], ['c', 'd']],
      };
      expect(props).toBeDefined();
    });

    it('should accept optional properties', () => {
      const props: DataTableProps = {
        headers: ['Col1', 'Col2'],
        rows: [['a', 1]],
        caption: 'My Table',
        emptyMessage: 'No data',
        align: ['left', 'right'],
      };
      expect(props.caption).toBe('My Table');
    });

    it('should accept emptyCell prop', () => {
      const props: DataTableProps = {
        rows: [[null, 'value']],
        emptyCell: '-',
      };
      expect(props.emptyCell).toBe('-');
    });
  });

  describe('BulletList', () => {
    it('should be exported', () => {
      expect(BulletList).toBeDefined();
    });

    it('should have correct props interface', () => {
      const props: BulletListProps = {
        items: ['one', 'two', 'three'],
      };
      expect(props).toBeDefined();
    });

    it('should accept title', () => {
      const props: BulletListProps = {
        items: ['item'],
        title: 'My List',
      };
      expect(props.title).toBe('My List');
    });

    it('should accept number items', () => {
      const props: BulletListProps = {
        items: [1, 2, 3],
      };
      expect(props.items).toEqual([1, 2, 3]);
    });
  });

  describe('FileContext', () => {
    it('should be exported', () => {
      expect(FileContext).toBeDefined();
    });

    it('should have correct props interface', () => {
      const props: FileContextProps = {
        files: ['/path/to/file.md'],
      };
      expect(props).toBeDefined();
    });

    it('should accept optional properties', () => {
      const props: FileContextProps = {
        files: ['/a.md', '/b.md'],
        prefix: '$',
        title: 'Reference Files',
      };
      expect(props.title).toBe('Reference Files');
    });

    it('should accept children in interface', () => {
      const props: FileContextProps = {
        files: ['/config.json'],
        title: 'Config Files',
      };
      // Children is ReactNode, just verify interface compiles
      expect(props.files).toHaveLength(1);
    });
  });
});

describe('Complete Composites Export', () => {
  it('should export all 7 composites from barrel', async () => {
    const composites = await import('../../src/composites/index.js');

    // Control flow
    expect(composites.IfElseBlock).toBeDefined();
    expect(composites.LoopWithBreak).toBeDefined();

    // Agent
    expect(composites.SpawnAgentWithRetry).toBeDefined();

    // Presentation
    expect(composites.StepSection).toBeDefined();
    expect(composites.DataTable).toBeDefined();
    expect(composites.BulletList).toBeDefined();
    expect(composites.FileContext).toBeDefined();
  });

  it('should export all 7 props interfaces', async () => {
    // TypeScript compilation validates these imports
    const _ifElse: import('../../src/composites/index.js').IfElseBlockProps = {
      condition: 'test',
      then: null,
    };
    const _loop: import('../../src/composites/index.js').LoopWithBreakProps = {
      max: 3,
      children: null,
    };
    const _spawn: import('../../src/composites/index.js').SpawnAgentWithRetryProps<unknown, unknown> = {
      agent: 'test',
      maxRetries: 3,
    };
    const _step: StepSectionProps = { number: 1, name: 'test' };
    const _table: DataTableProps = { rows: [] };
    const _list: BulletListProps = { items: [] };
    const _context: FileContextProps = { files: [] };

    expect(_ifElse).toBeDefined();
    expect(_loop).toBeDefined();
    expect(_spawn).toBeDefined();
    expect(_step).toBeDefined();
    expect(_table).toBeDefined();
    expect(_list).toBeDefined();
    expect(_context).toBeDefined();
  });
});
