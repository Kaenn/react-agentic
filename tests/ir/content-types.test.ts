/**
 * Content Types Tests
 *
 * Tests for content type discriminated unions (CommandContent, AgentContent, SubComponentContent).
 * These are primarily compile-time tests that verify TypeScript's type system enforces
 * the correct restrictions on what nodes can be used in different contexts.
 */

import { describe, it, expect } from 'vitest';
import type {
  CommandContent,
  AgentContent,
  SubComponentContent,
  HeadingNode,
  ParagraphNode,
  ListNode,
  TableNode,
  CodeBlockNode,
  BlockquoteNode,
  ThematicBreakNode,
  ExecutionContextNode,
  SuccessCriteriaNode,
  OfferNextNode,
  XmlBlockNode,
  GroupNode,
  RawMarkdownNode,
  IndentNode,
  StepNode,
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
} from '../../src/ir/index.js';

describe('CommandContent type', () => {
  it('should allow document structure nodes', () => {
    // These are compile-time checks - if they compile, the test passes
    const heading: CommandContent = {
      kind: 'heading',
      level: 1,
      children: [{ kind: 'text', value: 'Test' }],
    } as HeadingNode;

    const paragraph: CommandContent = {
      kind: 'paragraph',
      children: [{ kind: 'text', value: 'Test' }],
    } as ParagraphNode;

    const table: CommandContent = {
      kind: 'table',
      rows: [['a', 'b']],
    } as TableNode;

    expect(heading.kind).toBe('heading');
    expect(paragraph.kind).toBe('paragraph');
    expect(table.kind).toBe('table');
  });

  it('should allow SpawnAgent nodes', () => {
    const spawn: CommandContent = {
      kind: 'spawnAgent',
      agent: 'test',
      model: 'sonnet',
      description: 'test agent',
    } as SpawnAgentNode;

    expect(spawn.kind).toBe('spawnAgent');
  });

  it('should allow control flow nodes', () => {
    const ifNode: CommandContent = {
      kind: 'if',
      condition: { type: 'literal', value: true },
      children: [],
    } as IfNode;

    const loopNode: CommandContent = {
      kind: 'loop',
      max: 5,
      children: [],
    } as LoopNode;

    const returnNode: CommandContent = {
      kind: 'return',
      status: 'SUCCESS',
    } as ReturnNode;

    expect(ifNode.kind).toBe('if');
    expect(loopNode.kind).toBe('loop');
    expect(returnNode.kind).toBe('return');
  });

  it('should allow runtime nodes', () => {
    const runtimeVar: CommandContent = {
      kind: 'runtimeVarDecl',
      varName: 'TEST',
      tsType: 'string',
    } as RuntimeVarDeclNode;

    const runtimeCall: CommandContent = {
      kind: 'runtimeCall',
      fnName: 'testFn',
      args: {},
      outputVar: 'RESULT',
    } as RuntimeCallNode;

    expect(runtimeVar.kind).toBe('runtimeVarDecl');
    expect(runtimeCall.kind).toBe('runtimeCall');
  });

  it('should allow OnStatus nodes', () => {
    const onStatus: CommandContent = {
      kind: 'onStatus',
      outputRef: { kind: 'outputReference', agent: 'test' },
      status: 'SUCCESS',
      children: [],
    } as OnStatusNode;

    expect(onStatus.kind).toBe('onStatus');
  });

  it('should allow AskUser nodes', () => {
    const askUser: CommandContent = {
      kind: 'askUser',
      question: 'Choose',
      options: [],
      outputVar: 'CHOICE',
      multiSelect: false,
    } as AskUserNode;

    expect(askUser.kind).toBe('askUser');
  });
});

describe('AgentContent type', () => {
  it('should allow document structure nodes', () => {
    const heading: AgentContent = {
      kind: 'heading',
      level: 1,
      children: [{ kind: 'text', value: 'Test' }],
    } as HeadingNode;

    const list: AgentContent = {
      kind: 'list',
      ordered: false,
      items: [],
    } as ListNode;

    expect(heading.kind).toBe('heading');
    expect(list.kind).toBe('list');
  });

  it('should allow control flow nodes', () => {
    const elseNode: AgentContent = {
      kind: 'else',
      children: [],
    } as ElseNode;

    const breakNode: AgentContent = {
      kind: 'break',
      message: 'stop',
    } as BreakNode;

    expect(elseNode.kind).toBe('else');
    expect(breakNode.kind).toBe('break');
  });

  it('should allow runtime nodes', () => {
    const runtimeVar: AgentContent = {
      kind: 'runtimeVarDecl',
      varName: 'CTX',
      tsType: 'Context',
    } as RuntimeVarDeclNode;

    expect(runtimeVar.kind).toBe('runtimeVarDecl');
  });

  it('should allow SpawnAgent nodes', () => {
    // Agents can spawn other agents
    const spawn: AgentContent = {
      kind: 'spawnAgent',
      agent: 'subagent',
      model: 'haiku',
      description: 'helper',
    } as SpawnAgentNode;

    expect(spawn.kind).toBe('spawnAgent');
  });
});

describe('SubComponentContent type', () => {
  it('should allow document structure nodes', () => {
    const heading: SubComponentContent = {
      kind: 'heading',
      level: 2,
      children: [{ kind: 'text', value: 'Section' }],
    } as HeadingNode;

    const paragraph: SubComponentContent = {
      kind: 'paragraph',
      children: [{ kind: 'text', value: 'Content' }],
    } as ParagraphNode;

    const list: SubComponentContent = {
      kind: 'list',
      ordered: true,
      items: [],
    } as ListNode;

    const codeBlock: SubComponentContent = {
      kind: 'codeBlock',
      language: 'typescript',
      content: 'const x = 1;',
    } as CodeBlockNode;

    const blockquote: SubComponentContent = {
      kind: 'blockquote',
      children: [],
    } as BlockquoteNode;

    const thematicBreak: SubComponentContent = {
      kind: 'thematicBreak',
    } as ThematicBreakNode;

    expect(heading.kind).toBe('heading');
    expect(paragraph.kind).toBe('paragraph');
    expect(list.kind).toBe('list');
    expect(codeBlock.kind).toBe('codeBlock');
    expect(blockquote.kind).toBe('blockquote');
    expect(thematicBreak.kind).toBe('thematicBreak');
  });

  it('should allow table nodes', () => {
    const table: SubComponentContent = {
      kind: 'table',
      headers: ['Col1', 'Col2'],
      rows: [['a', 'b']],
    } as TableNode;

    expect(table.kind).toBe('table');
  });

  it('should allow semantic nodes', () => {
    const execContext: SubComponentContent = {
      kind: 'executionContext',
      paths: ['file.md'],
      prefix: '@',
      children: [],
    } as ExecutionContextNode;

    const successCriteria: SubComponentContent = {
      kind: 'successCriteria',
      items: [],
    } as SuccessCriteriaNode;

    const offerNext: SubComponentContent = {
      kind: 'offerNext',
      routes: [],
    } as OfferNextNode;

    expect(execContext.kind).toBe('executionContext');
    expect(successCriteria.kind).toBe('successCriteria');
    expect(offerNext.kind).toBe('offerNext');
  });

  it('should allow XML blocks and grouping', () => {
    const xmlBlock: SubComponentContent = {
      kind: 'xmlBlock',
      name: 'example',
      children: [],
    } as XmlBlockNode;

    const group: SubComponentContent = {
      kind: 'group',
      children: [],
    } as GroupNode;

    const raw: SubComponentContent = {
      kind: 'raw',
      content: '**markdown**',
    } as RawMarkdownNode;

    const indent: SubComponentContent = {
      kind: 'indent',
      spaces: 2,
      children: [],
    } as IndentNode;

    const step: SubComponentContent = {
      kind: 'step',
      number: '1',
      name: 'First step',
      variant: 'heading',
      children: [],
    } as StepNode;

    expect(xmlBlock.kind).toBe('xmlBlock');
    expect(group.kind).toBe('group');
    expect(raw.kind).toBe('raw');
    expect(indent.kind).toBe('indent');
    expect(step.kind).toBe('step');
  });
});

describe('Type exclusions', () => {
  it('should not allow SpawnAgentNode in SubComponentContent', () => {
    // This is a compile-time test - the @ts-expect-error ensures the assignment fails
    const spawn: SpawnAgentNode = {
      kind: 'spawnAgent',
      agent: 'test',
      model: 'sonnet',
      description: 'test',
    };

    // @ts-expect-error - SpawnAgentNode is not assignable to SubComponentContent
    const _content: SubComponentContent = spawn;

    // Runtime check to make the test executable
    expect(spawn.kind).toBe('spawnAgent');
  });

  it('should not allow OnStatusNode in SubComponentContent', () => {
    const onStatus: OnStatusNode = {
      kind: 'onStatus',
      outputRef: { kind: 'outputReference', agent: 'test' },
      status: 'SUCCESS',
      children: [],
    };

    // @ts-expect-error - OnStatusNode is not assignable to SubComponentContent
    const _content: SubComponentContent = onStatus;

    expect(onStatus.kind).toBe('onStatus');
  });

  it('should not allow IfNode in SubComponentContent', () => {
    const ifNode: IfNode = {
      kind: 'if',
      condition: { type: 'literal', value: true },
      children: [],
    };

    // @ts-expect-error - IfNode is not assignable to SubComponentContent
    const _content: SubComponentContent = ifNode;

    expect(ifNode.kind).toBe('if');
  });

  it('should not allow ElseNode in SubComponentContent', () => {
    const elseNode: ElseNode = {
      kind: 'else',
      children: [],
    };

    // @ts-expect-error - ElseNode is not assignable to SubComponentContent
    const _content: SubComponentContent = elseNode;

    expect(elseNode.kind).toBe('else');
  });

  it('should not allow LoopNode in SubComponentContent', () => {
    const loopNode: LoopNode = {
      kind: 'loop',
      max: 5,
      children: [],
    };

    // @ts-expect-error - LoopNode is not assignable to SubComponentContent
    const _content: SubComponentContent = loopNode;

    expect(loopNode.kind).toBe('loop');
  });

  it('should not allow BreakNode in SubComponentContent', () => {
    const breakNode: BreakNode = {
      kind: 'break',
    };

    // @ts-expect-error - BreakNode is not assignable to SubComponentContent
    const _content: SubComponentContent = breakNode;

    expect(breakNode.kind).toBe('break');
  });

  it('should not allow ReturnNode in SubComponentContent', () => {
    const returnNode: ReturnNode = {
      kind: 'return',
      status: 'SUCCESS',
    };

    // @ts-expect-error - ReturnNode is not assignable to SubComponentContent
    const _content: SubComponentContent = returnNode;

    expect(returnNode.kind).toBe('return');
  });

  it('should not allow AskUserNode in SubComponentContent', () => {
    const askUser: AskUserNode = {
      kind: 'askUser',
      question: 'Choose',
      options: [],
      outputVar: 'CHOICE',
      multiSelect: false,
    };

    // @ts-expect-error - AskUserNode is not assignable to SubComponentContent
    const _content: SubComponentContent = askUser;

    expect(askUser.kind).toBe('askUser');
  });

  it('should not allow RuntimeVarDeclNode in SubComponentContent', () => {
    const runtimeVar: RuntimeVarDeclNode = {
      kind: 'runtimeVarDecl',
      varName: 'TEST',
      tsType: 'string',
    };

    // @ts-expect-error - RuntimeVarDeclNode is not assignable to SubComponentContent
    const _content: SubComponentContent = runtimeVar;

    expect(runtimeVar.kind).toBe('runtimeVarDecl');
  });

  it('should not allow RuntimeCallNode in SubComponentContent', () => {
    const runtimeCall: RuntimeCallNode = {
      kind: 'runtimeCall',
      fnName: 'testFn',
      args: {},
      outputVar: 'RESULT',
    };

    // @ts-expect-error - RuntimeCallNode is not assignable to SubComponentContent
    const _content: SubComponentContent = runtimeCall;

    expect(runtimeCall.kind).toBe('runtimeCall');
  });
});
