/**
 * V3 Primitives Module
 *
 * Re-exports all V3 primitive components and types.
 */

// Script Variable System
export {
  useRuntimeVar,
  isScriptVar,
  getScriptVarInfo,
  toJqExpression,
  toJqPath,
  type ScriptVar,
  type ScriptVarProxy,
  type OrScriptVar,
  type AllowScriptVars,
} from './script-var.js';

// Runtime Function System
export {
  runtimeFn,
  isRuntimeFn,
  getRuntimeFnRegistry,
  clearRuntimeFnRegistry,
  getRuntimeFn,
  type RuntimeFunction,
  type RuntimeCallProps,
  type RuntimeCallComponent,
  type RuntimeFnComponent,
} from './runtime-fn.js';

// Control Flow Components
export {
  V3If,
  V3Else,
  V3Loop,
  Break,
  Return,
  If,
  Else,
  Loop,
  V3_IF_MARKER,
  V3_ELSE_MARKER,
  V3_LOOP_MARKER,
  V3_BREAK_MARKER,
  V3_RETURN_MARKER,
  type V3IfProps,
  type V3ElseProps,
  type V3LoopProps,
  type BreakProps,
  type ReturnProps,
  type ReturnStatus,
  type V3Condition,
} from './control.js';

// AskUser Component
export {
  AskUser,
  ASK_USER_MARKER,
  type AskUserProps,
  type AskUserOption,
} from './ask-user.js';
