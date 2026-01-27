/**
 * JSX component stubs for react-agentic - Control flow primitives
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

import type { ReactNode } from 'react';
import type { VariableRef } from './variables.js';

/**
 * Props for the If component
 * @typeParam T - Optional type for compile-time context (e.g., config shape)
 */
export interface IfProps<T = unknown> {
  /** Shell test expression (e.g., "[ -f config.json ]") */
  test: string;
  /** "then" block content */
  children?: ReactNode;
  // T is compile-time only - used for type-safe context access
}

/**
 * Props for the Else component
 */
export interface ElseProps {
  /** "otherwise" block content */
  children?: ReactNode;
}

/**
 * If component - conditional block for prose-based conditionals
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime. Emits as **If {test}:** pattern.
 *
 * @typeParam T - Optional type parameter for compile-time validation
 * @example
 * // Basic usage (no generic)
 * <If test="[ -f config.json ]">
 *   <p>Config found, loading...</p>
 * </If>
 *
 * @example with VariableRef interpolation
 * const phaseDir = useVariable("PHASE_DIR");
 * <Assign var={phaseDir} bash={`ls -d test`} />
 * <If test={`[ -z ${phaseDir.ref} ]`}>
 *   <p>No phase directory found.</p>
 * </If>
 *
 * @example with explicit generic for type context
 * interface ProjectConfig { debug: boolean; }
 * <If<ProjectConfig> test="[ -f config.json ]">
 *   <p>Config will have debug property when loaded.</p>
 * </If>
 */
export function If<T = unknown>(_props: IfProps<T>): null {
  return null;
}

/**
 * Else component - optional sibling to If
 *
 * Must appear immediately after a closing </If> tag.
 * It's never executed at runtime. Emits as **Otherwise:** pattern.
 *
 * @example
 * <If test="[ -f config.json ]">
 *   <p>Config found.</p>
 * </If>
 * <Else>
 *   <p>Config missing.</p>
 * </Else>
 */
export function Else(_props: ElseProps): null {
  return null;
}

// ============================================================================
// Loop Component (iteration control flow)
// ============================================================================

/**
 * Props for the Loop component
 * @typeParam T - Type of items in the array (inferred or explicit)
 */
export interface LoopProps<T = unknown> {
  /** Array of items to iterate over - type-safe via generic */
  items?: T[];
  /** Variable name for the current item in iteration */
  as?: string;
  /** Loop body content */
  children?: ReactNode;
}

/**
 * Loop component - iteration block for repeated content
 *
 * This is a compile-time component that emits markdown describing
 * an iteration pattern. Claude interprets and executes the loop.
 *
 * @typeParam T - Type of items being iterated (defaults to unknown)
 * @example
 * // Basic usage with inferred type
 * <Loop items={['a', 'b', 'c']} as="item">
 *   <p>Process item</p>
 * </Loop>
 *
 * @example with explicit generic
 * interface User { name: string; email: string; }
 * <Loop<User> items={users} as="user">
 *   <p>Greet user by name</p>
 * </Loop>
 */
export function Loop<T = unknown>(_props: LoopProps<T>): null {
  return null;
}

// ============================================================================
// Shell Test Builders (type-safe test expressions for conditionals)
// ============================================================================

/**
 * Generate shell test for file existence
 *
 * @param varRef - Variable reference from useVariable
 * @returns Shell test expression: [ -f $VAR_NAME ]
 *
 * @example
 * const configFile = useVariable("CONFIG");
 * <If test={fileExists(configFile)}>
 */
export function fileExists(varRef: VariableRef): string {
  return `[ -f $${varRef.name} ]`;
}

/**
 * Generate shell test for directory existence
 *
 * @param varRef - Variable reference from useVariable
 * @returns Shell test expression: [ -d $VAR_NAME ]
 *
 * @example
 * const outputDir = useVariable("OUT_DIR");
 * <If test={dirExists(outputDir)}>
 */
export function dirExists(varRef: VariableRef): string {
  return `[ -d $${varRef.name} ]`;
}

/**
 * Generate shell test for empty string
 *
 * @param varRef - Variable reference from useVariable
 * @returns Shell test expression: [ -z "$VAR_NAME" ]
 *
 * @example
 * const result = useVariable("RESULT");
 * <If test={isEmpty(result)}>
 *   <p>No matches found.</p>
 * </If>
 */
export function isEmpty(varRef: VariableRef): string {
  return `[ -z "$${varRef.name}" ]`;
}

/**
 * Generate shell test for non-empty string
 *
 * @param varRef - Variable reference from useVariable
 * @returns Shell test expression: [ -n "$VAR_NAME" ]
 *
 * @example
 * const result = useVariable("RESULT");
 * <If test={notEmpty(result)}>
 *   <p>Found matches!</p>
 * </If>
 */
export function notEmpty(varRef: VariableRef): string {
  return `[ -n "$${varRef.name}" ]`;
}

/**
 * Generate shell test for string equality
 *
 * @param varRef - Variable reference from useVariable
 * @param value - Value to compare against (string literal)
 * @returns Shell test expression: [ $VAR_NAME = value ]
 *
 * @example
 * const status = useVariable("STATUS");
 * <If test={equals(status, "0")}>
 *   <p>Success!</p>
 * </If>
 */
export function equals(varRef: VariableRef, value: string): string {
  return `[ $${varRef.name} = ${value} ]`;
}

/**
 * Compose multiple tests with AND (&&)
 *
 * @param tests - Test expressions to combine
 * @returns Combined test: test1 && test2 && ...
 *
 * @example
 * <If test={and(fileExists(config), notEmpty(result))}>
 *   <p>Config exists AND result is not empty.</p>
 * </If>
 */
export function and(...tests: string[]): string {
  return tests.join(' && ');
}

/**
 * Compose multiple tests with OR (||)
 *
 * @param tests - Test expressions to combine
 * @returns Combined test: test1 || test2 || ...
 *
 * @example
 * <If test={or(fileExists(jsonConfig), fileExists(yamlConfig))}>
 *   <p>Found either JSON or YAML config.</p>
 * </If>
 */
export function or(...tests: string[]): string {
  return tests.join(' || ');
}
