/**
 * Content validation tests - user component patterns
 *
 * These tests demonstrate the user-facing validation patterns where component
 * authors type their children props with SubComponentContent to get compile-time
 * TypeScript errors for invalid nesting.
 */

import { describe, it, expect } from 'vitest';
import type { SubComponentContent } from '../../src/ir/content-types.js';
import type {
  HeadingNode,
  ParagraphNode,
  TableNode,
  ListNode,
  XmlBlockNode,
} from '../../src/ir/nodes.js';
import type {
  SpawnAgentNode,
  OnStatusNode,
  IfNode,
  ElseNode,
  LoopNode,
  BreakNode,
  ReturnNode,
  AskUserNode,
  RuntimeVarDeclNode,
  RuntimeCallNode,
} from '../../src/ir/runtime-nodes.js';

describe('SubComponentContent - Valid Cases', () => {
  it('accepts HeadingNode as SubComponentContent', () => {
    const heading: HeadingNode = {
      kind: 'heading',
      level: 1,
      children: [],
    };

    const valid: SubComponentContent = heading;
    expect(valid.kind).toBe('heading');
  });

  it('accepts ParagraphNode as SubComponentContent', () => {
    const paragraph: ParagraphNode = {
      kind: 'paragraph',
      children: [],
    };

    const valid: SubComponentContent = paragraph;
    expect(valid.kind).toBe('paragraph');
  });

  it('accepts TableNode as SubComponentContent', () => {
    const table: TableNode = {
      kind: 'table',
      headers: ['Name'],
      rows: [['Alice']],
      align: undefined,
    };

    const valid: SubComponentContent = table;
    expect(valid.kind).toBe('table');
  });

  it('accepts ListNode as SubComponentContent', () => {
    const list: ListNode = {
      kind: 'list',
      ordered: false,
      items: [],
    };

    const valid: SubComponentContent = list;
    expect(valid.kind).toBe('list');
  });

  it('accepts XmlBlockNode as SubComponentContent', () => {
    const xmlBlock: XmlBlockNode = {
      kind: 'xmlBlock',
      name: 'section',
      children: [],
    };

    const valid: SubComponentContent = xmlBlock;
    expect(valid.kind).toBe('xmlBlock');
  });

  it('accepts multiple SubComponentContent elements in array', () => {
    const heading: HeadingNode = {
      kind: 'heading',
      level: 1,
      children: [],
    };

    const paragraph: ParagraphNode = {
      kind: 'paragraph',
      children: [],
    };

    const valid: SubComponentContent[] = [heading, paragraph];
    expect(valid).toHaveLength(2);
  });
});

describe('SubComponentContent - Invalid Cases (Compile-Time Errors)', () => {
  it('rejects SpawnAgentNode as SubComponentContent', () => {
    const spawnAgent: SpawnAgentNode = {
      kind: 'spawnAgent',
      agent: 'test-agent',
      model: 'sonnet',
      description: 'Test task',
    };

    // @ts-expect-error - SpawnAgentNode not assignable to SubComponentContent
    const invalid: SubComponentContent = spawnAgent;

    // Runtime assertion to make test executable
    expect(invalid).toBeDefined();
  });

  it('rejects OnStatusNode as SubComponentContent', () => {
    const onStatus: OnStatusNode = {
      kind: 'onStatus',
      output: { agent: 'test' },
      status: 'SUCCESS',
      children: [],
    };

    // @ts-expect-error - OnStatusNode not assignable to SubComponentContent
    const invalid: SubComponentContent = onStatus;

    expect(invalid).toBeDefined();
  });

  it('rejects IfNode as SubComponentContent', () => {
    const ifNode: IfNode = {
      kind: 'if',
      condition: 'someVar',
      children: [],
    };

    // @ts-expect-error - IfNode not assignable to SubComponentContent
    const invalid: SubComponentContent = ifNode;

    expect(invalid).toBeDefined();
  });

  it('rejects ElseNode as SubComponentContent', () => {
    const elseNode: ElseNode = {
      kind: 'else',
      children: [],
    };

    // @ts-expect-error - ElseNode not assignable to SubComponentContent
    const invalid: SubComponentContent = elseNode;

    expect(invalid).toBeDefined();
  });

  it('rejects LoopNode as SubComponentContent', () => {
    const loopNode: LoopNode = {
      kind: 'loop',
      max: 5,
      children: [],
    };

    // @ts-expect-error - LoopNode not assignable to SubComponentContent
    const invalid: SubComponentContent = loopNode;

    expect(invalid).toBeDefined();
  });

  it('rejects BreakNode as SubComponentContent', () => {
    const breakNode: BreakNode = {
      kind: 'break',
    };

    // @ts-expect-error - BreakNode not assignable to SubComponentContent
    const invalid: SubComponentContent = breakNode;

    expect(invalid).toBeDefined();
  });

  it('rejects ReturnNode as SubComponentContent', () => {
    const returnNode: ReturnNode = {
      kind: 'return',
      status: 'SUCCESS',
    };

    // @ts-expect-error - ReturnNode not assignable to SubComponentContent
    const invalid: SubComponentContent = returnNode;

    expect(invalid).toBeDefined();
  });

  it('rejects AskUserNode as SubComponentContent', () => {
    const askUser: AskUserNode = {
      kind: 'askUser',
      question: 'Continue?',
      options: ['yes', 'no'],
      output: 'userChoice',
    };

    // @ts-expect-error - AskUserNode not assignable to SubComponentContent
    const invalid: SubComponentContent = askUser;

    expect(invalid).toBeDefined();
  });

  it('rejects RuntimeVarDeclNode as SubComponentContent', () => {
    const runtimeVar: RuntimeVarDeclNode = {
      kind: 'runtimeVarDecl',
      name: 'myVar',
      type: 'string',
    };

    // @ts-expect-error - RuntimeVarDeclNode not assignable to SubComponentContent
    const invalid: SubComponentContent = runtimeVar;

    expect(invalid).toBeDefined();
  });

  it('rejects RuntimeCallNode as SubComponentContent', () => {
    const runtimeCall: RuntimeCallNode = {
      kind: 'runtimeCall',
      fnName: 'myFunction',
      args: {},
      output: 'result',
    };

    // @ts-expect-error - RuntimeCallNode not assignable to SubComponentContent
    const invalid: SubComponentContent = runtimeCall;

    expect(invalid).toBeDefined();
  });
});

describe('SubComponentContent - User Component Pattern', () => {
  // Simulate user-defined component props interface
  interface UserCardProps {
    title: string;
    children?: SubComponentContent | SubComponentContent[];
  }

  it('user component with valid SubComponentContent children compiles', () => {
    const heading: HeadingNode = {
      kind: 'heading',
      level: 2,
      children: [],
    };

    const validCard: UserCardProps = {
      title: 'Test Card',
      children: heading,
    };

    expect(validCard.title).toBe('Test Card');
    expect(validCard.children).toBeDefined();
  });

  it('user component with multiple valid children compiles', () => {
    const paragraph: ParagraphNode = {
      kind: 'paragraph',
      children: [],
    };

    const table: TableNode = {
      kind: 'table',
      headers: ['A', 'B'],
      rows: [['1', '2']],
      align: undefined,
    };

    const validCard: UserCardProps = {
      title: 'Multi-Content',
      children: [paragraph, table],
    };

    expect(validCard.children).toHaveLength(2);
  });

  it('user component with SpawnAgent child causes type error', () => {
    const spawnAgent: SpawnAgentNode = {
      kind: 'spawnAgent',
      agent: 'test',
      model: 'sonnet',
      description: 'Task',
    };

    // @ts-expect-error - SpawnAgentNode not assignable to SubComponentContent
    const invalidCard: UserCardProps = {
      title: 'Invalid',
      children: spawnAgent,
    };

    expect(invalidCard).toBeDefined();
  });

  it('user component with If child causes type error', () => {
    const ifNode: IfNode = {
      kind: 'if',
      condition: 'test',
      children: [],
    };

    // @ts-expect-error - IfNode not assignable to SubComponentContent
    const invalidCard: UserCardProps = {
      title: 'Invalid',
      children: ifNode,
    };

    expect(invalidCard).toBeDefined();
  });

  it('user component with AskUser child causes type error', () => {
    const askUser: AskUserNode = {
      kind: 'askUser',
      question: 'Test?',
      options: ['yes', 'no'],
      output: 'answer',
    };

    // @ts-expect-error - AskUserNode not assignable to SubComponentContent
    const invalidCard: UserCardProps = {
      title: 'Invalid',
      children: askUser,
    };

    expect(invalidCard).toBeDefined();
  });
});
