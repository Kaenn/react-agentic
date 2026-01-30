/**
 * JSX component stubs for react-agentic - Step workflow primitive
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

import type { ReactNode } from 'react';

/**
 * Variant for Step output format
 * - 'heading': ## Step 1: Name (default)
 * - 'bold': **Step 1: Name**
 * - 'xml': <step number="1" name="Name">...</step>
 */
export type StepVariant = 'heading' | 'bold' | 'xml';

/**
 * Props for the Step component
 */
export interface StepProps {
  /** Step number - explicit, no auto-increment */
  number: number | string;
  /** Step name/title */
  name: string;
  /**
   * Output format variant
   * - 'heading': ## Step 1: Name (default)
   * - 'bold': **Step 1: Name**
   * - 'xml': <step number="1" name="Name">...</step>
   */
  variant?: StepVariant;
  /** Step body content */
  children?: ReactNode;
}

/**
 * Step component - numbered workflow section
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime. Emits formatted step sections.
 *
 * @example Default (heading) variant
 * <Step number={1} name="Setup Environment">
 *   <p>Set up the development environment.</p>
 * </Step>
 * // Output: ## Step 1: Setup Environment
 * //         Set up the development environment.
 *
 * @example Bold variant
 * <Step number={2} name="Configure" variant="bold">
 *   <p>Configure the settings.</p>
 * </Step>
 * // Output: **Step 2: Configure**
 * //         Configure the settings.
 *
 * @example XML variant
 * <Step number={3} name="Deploy" variant="xml">
 *   <p>Deploy to production.</p>
 * </Step>
 * // Output: <step number="3" name="Deploy">
 * //           Deploy to production.
 * //         </step>
 *
 * @example Sub-steps
 * <Step number="1.1" name="Install dependencies">
 *   <p>Run npm install.</p>
 * </Step>
 */
export function Step(_props: StepProps): null {
  return null;
}
