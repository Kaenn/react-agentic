import { describe, expect, it } from 'vitest';
import {
  isPrimitive,
  getPrimitives,
  getComposites,
  getComponentInfo,
  PRIMITIVE_COMPONENTS,
  type ComponentInfo,
} from '../../src/index.js';

describe('isPrimitive', () => {
  describe('infrastructure primitives', () => {
    it('returns true for spawnAgent', () => {
      expect(isPrimitive({ kind: 'spawnAgent' })).toBe(true);
    });

    it('returns true for control flow primitives', () => {
      expect(isPrimitive({ kind: 'if' })).toBe(true);
      expect(isPrimitive({ kind: 'else' })).toBe(true);
      expect(isPrimitive({ kind: 'loop' })).toBe(true);
      expect(isPrimitive({ kind: 'break' })).toBe(true);
      expect(isPrimitive({ kind: 'return' })).toBe(true);
    });

    it('returns true for user interaction primitives', () => {
      expect(isPrimitive({ kind: 'askUser' })).toBe(true);
    });

    it('returns true for runtime primitives', () => {
      expect(isPrimitive({ kind: 'runtimeVarDecl' })).toBe(true);
      expect(isPrimitive({ kind: 'runtimeCall' })).toBe(true);
    });

    it('returns true for agent output primitives', () => {
      expect(isPrimitive({ kind: 'onStatus' })).toBe(true);
    });
  });

  describe('presentation primitives', () => {
    it('returns true for data components', () => {
      expect(isPrimitive({ kind: 'table' })).toBe(true);
      expect(isPrimitive({ kind: 'list' })).toBe(true);
    });

    it('returns true for layout primitives', () => {
      expect(isPrimitive({ kind: 'indent' })).toBe(true);
    });

    it('returns true for semantic components', () => {
      expect(isPrimitive({ kind: 'executionContext' })).toBe(true);
      expect(isPrimitive({ kind: 'successCriteria' })).toBe(true);
      expect(isPrimitive({ kind: 'offerNext' })).toBe(true);
    });

    it('returns true for XML block', () => {
      expect(isPrimitive({ kind: 'xmlBlock' })).toBe(true);
    });

    it('returns true for workflow step', () => {
      expect(isPrimitive({ kind: 'step' })).toBe(true);
    });
  });

  describe('document primitives', () => {
    it('returns true for document nodes', () => {
      expect(isPrimitive({ kind: 'document' })).toBe(true);
      expect(isPrimitive({ kind: 'agentDocument' })).toBe(true);
    });

    it('returns true for frontmatter nodes', () => {
      expect(isPrimitive({ kind: 'frontmatter' })).toBe(true);
      expect(isPrimitive({ kind: 'agentFrontmatter' })).toBe(true);
    });
  });

  describe('composite/unknown components', () => {
    it('returns false for unknown kinds', () => {
      expect(isPrimitive({ kind: 'MyCustomComponent' })).toBe(false);
      expect(isPrimitive({ kind: 'UserDefinedTable' })).toBe(false);
      expect(isPrimitive({ kind: 'CustomWorkflow' })).toBe(false);
    });

    it('returns false for empty string kind', () => {
      expect(isPrimitive({ kind: '' })).toBe(false);
    });
  });

  describe('node object handling', () => {
    it('works with IR node objects', () => {
      const ifNode = { kind: 'if', condition: { type: 'literal', value: true }, children: [] };
      expect(isPrimitive(ifNode)).toBe(true);
    });

    it('works with any object with kind property', () => {
      expect(isPrimitive({ kind: 'table', rows: [], headers: [] })).toBe(true);
      expect(isPrimitive({ kind: 'CustomComponent', data: {} })).toBe(false);
    });
  });
});

describe('getPrimitives', () => {
  it('returns a Set', () => {
    const primitives = getPrimitives();
    expect(primitives).toBeInstanceOf(Set);
  });

  it('contains all infrastructure primitives', () => {
    const primitives = getPrimitives();
    expect(primitives.has('spawnAgent')).toBe(true);
    expect(primitives.has('if')).toBe(true);
    expect(primitives.has('else')).toBe(true);
    expect(primitives.has('loop')).toBe(true);
    expect(primitives.has('break')).toBe(true);
    expect(primitives.has('return')).toBe(true);
    expect(primitives.has('askUser')).toBe(true);
    expect(primitives.has('runtimeVarDecl')).toBe(true);
    expect(primitives.has('runtimeCall')).toBe(true);
    expect(primitives.has('onStatus')).toBe(true);
  });

  it('contains all presentation primitives', () => {
    const primitives = getPrimitives();
    expect(primitives.has('table')).toBe(true);
    expect(primitives.has('list')).toBe(true);
    expect(primitives.has('indent')).toBe(true);
    expect(primitives.has('executionContext')).toBe(true);
    expect(primitives.has('successCriteria')).toBe(true);
    expect(primitives.has('offerNext')).toBe(true);
    expect(primitives.has('xmlBlock')).toBe(true);
    expect(primitives.has('step')).toBe(true);
  });

  it('contains all document primitives', () => {
    const primitives = getPrimitives();
    expect(primitives.has('document')).toBe(true);
    expect(primitives.has('agentDocument')).toBe(true);
    expect(primitives.has('frontmatter')).toBe(true);
    expect(primitives.has('agentFrontmatter')).toBe(true);
  });

  it('has expected total size', () => {
    const primitives = getPrimitives();
    // 10 infrastructure + 8 presentation + 4 document = 22 primitives
    expect(primitives.size).toBe(22);
  });

  it('returns reference to the same set', () => {
    const set1 = getPrimitives();
    const set2 = getPrimitives();
    expect(set1).toBe(set2); // Same reference
  });
});

describe('getComposites', () => {
  it('returns an array', () => {
    const composites = getComposites();
    expect(Array.isArray(composites)).toBe(true);
  });

  it('returns empty array for now', () => {
    const composites = getComposites();
    expect(composites).toEqual([]);
    expect(composites.length).toBe(0);
  });
});

describe('getComponentInfo', () => {
  describe('infrastructure primitives', () => {
    it('classifies spawnAgent correctly', () => {
      const info = getComponentInfo('spawnAgent');
      expect(info.kind).toBe('spawnAgent');
      expect(info.category).toBe('primitive');
      expect(info.layer).toBe('infrastructure');
      expect(info.migrationTarget).toBeUndefined();
    });

    it('classifies control flow correctly', () => {
      const ifInfo = getComponentInfo('if');
      expect(ifInfo.category).toBe('primitive');
      expect(ifInfo.layer).toBe('infrastructure');
      expect(ifInfo.migrationTarget).toBeUndefined();

      const loopInfo = getComponentInfo('loop');
      expect(loopInfo.category).toBe('primitive');
      expect(loopInfo.layer).toBe('infrastructure');
    });

    it('classifies runtime primitives correctly', () => {
      const varInfo = getComponentInfo('runtimeVarDecl');
      expect(varInfo.category).toBe('primitive');
      expect(varInfo.layer).toBe('infrastructure');
      expect(varInfo.migrationTarget).toBeUndefined();

      const callInfo = getComponentInfo('runtimeCall');
      expect(callInfo.category).toBe('primitive');
      expect(callInfo.layer).toBe('infrastructure');
    });
  });

  describe('presentation primitives', () => {
    it('classifies table with migration target', () => {
      const info = getComponentInfo('table');
      expect(info.kind).toBe('table');
      expect(info.category).toBe('primitive');
      expect(info.layer).toBe('presentation');
      expect(info.migrationTarget).toBe('composite');
    });

    it('classifies list with migration target', () => {
      const info = getComponentInfo('list');
      expect(info.category).toBe('primitive');
      expect(info.layer).toBe('presentation');
      expect(info.migrationTarget).toBe('composite');
    });

    it('classifies semantic components with migration target', () => {
      const execInfo = getComponentInfo('executionContext');
      expect(execInfo.category).toBe('primitive');
      expect(execInfo.layer).toBe('presentation');
      expect(execInfo.migrationTarget).toBe('composite');

      const successInfo = getComponentInfo('successCriteria');
      expect(successInfo.category).toBe('primitive');
      expect(successInfo.layer).toBe('presentation');
      expect(successInfo.migrationTarget).toBe('composite');
    });

    it('classifies xmlBlock with migration target', () => {
      const info = getComponentInfo('xmlBlock');
      expect(info.category).toBe('primitive');
      expect(info.layer).toBe('presentation');
      expect(info.migrationTarget).toBe('composite');
    });

    it('classifies step with migration target', () => {
      const info = getComponentInfo('step');
      expect(info.category).toBe('primitive');
      expect(info.layer).toBe('presentation');
      expect(info.migrationTarget).toBe('composite');
    });
  });

  describe('document primitives', () => {
    it('classifies document nodes correctly', () => {
      const docInfo = getComponentInfo('document');
      expect(docInfo.category).toBe('primitive');
      expect(docInfo.layer).toBe('document');
      expect(docInfo.migrationTarget).toBeUndefined();

      const agentDocInfo = getComponentInfo('agentDocument');
      expect(agentDocInfo.category).toBe('primitive');
      expect(agentDocInfo.layer).toBe('document');
    });

    it('classifies frontmatter nodes correctly', () => {
      const fmInfo = getComponentInfo('frontmatter');
      expect(fmInfo.category).toBe('primitive');
      expect(fmInfo.layer).toBe('document');
      expect(fmInfo.migrationTarget).toBeUndefined();
    });
  });

  describe('composite/unknown components', () => {
    it('treats unknown kinds as composites', () => {
      const info = getComponentInfo('MyCustomComponent');
      expect(info.kind).toBe('MyCustomComponent');
      expect(info.category).toBe('composite');
      expect(info.layer).toBe('presentation');
      expect(info.migrationTarget).toBeUndefined();
    });

    it('preserves kind in returned info', () => {
      const info = getComponentInfo('UserTable');
      expect(info.kind).toBe('UserTable');
    });
  });

  describe('type safety', () => {
    it('returns ComponentInfo interface', () => {
      const info: ComponentInfo = getComponentInfo('if');
      expect(info).toHaveProperty('kind');
      expect(info).toHaveProperty('category');
      expect(info).toHaveProperty('layer');
    });
  });
});

describe('PRIMITIVE_COMPONENTS constant', () => {
  it('is a Set', () => {
    expect(PRIMITIVE_COMPONENTS).toBeInstanceOf(Set);
  });

  it('matches getPrimitives() result', () => {
    expect(PRIMITIVE_COMPONENTS).toBe(getPrimitives());
  });

  it('is exported for direct access', () => {
    expect(PRIMITIVE_COMPONENTS.has('if')).toBe(true);
    expect(PRIMITIVE_COMPONENTS.size).toBeGreaterThan(0);
  });
});

describe('registry coverage', () => {
  it('includes all RuntimeBlockNode kinds', () => {
    // From runtime-nodes.ts RuntimeBlockNode union
    const runtimeKinds = [
      'runtimeVarDecl',
      'runtimeCall',
      'if',
      'else',
      'loop',
      'break',
      'return',
      'askUser',
      'spawnAgent',
    ];

    const primitives = getPrimitives();
    for (const kind of runtimeKinds) {
      expect(primitives.has(kind)).toBe(true);
    }
  });

  it('includes all presentation node kinds from nodes.ts', () => {
    // From nodes.ts - presentation primitives
    const presentationKinds = [
      'table',
      'executionContext',
      'successCriteria',
      'offerNext',
      'xmlBlock',
      'indent',
      'step',
      // Note: 'list' is also presentation but handled separately
    ];

    const primitives = getPrimitives();
    for (const kind of presentationKinds) {
      expect(primitives.has(kind)).toBe(true);
    }
  });

  it('includes document structure nodes', () => {
    const documentKinds = [
      'document',
      'agentDocument',
      'frontmatter',
      'agentFrontmatter',
    ];

    const primitives = getPrimitives();
    for (const kind of documentKinds) {
      expect(primitives.has(kind)).toBe(true);
    }
  });
});
