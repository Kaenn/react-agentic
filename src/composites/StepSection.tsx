import type { ReactNode } from 'react';
import { Step, type StepVariant } from '../primitives/step.js';

/**
 * Enhanced step component with description and substeps support
 *
 * Wraps Step primitive with additional conveniences for workflow sections.
 *
 * @param props - Component props
 * @param props.number - Step number (string for substeps like "1.1")
 * @param props.name - Step title
 * @param props.description - Optional step description/summary
 * @param props.variant - Output format (heading, bold, xml)
 * @param props.children - Step body content or substeps
 *
 * @example Basic step
 * ```tsx
 * import { StepSection } from 'react-agentic/composites';
 *
 * <StepSection number={1} name="Setup Environment">
 *   <p>Install dependencies and configure the workspace.</p>
 * </StepSection>
 * ```
 *
 * @example With description
 * ```tsx
 * <StepSection
 *   number={2}
 *   name="Configure Settings"
 *   description="Set up application configuration for your environment"
 * >
 *   <p>Edit config.json with your API keys.</p>
 * </StepSection>
 * ```
 *
 * @example Substeps
 * ```tsx
 * <StepSection number="3.1" name="Install dependencies" variant="bold">
 *   <p>Run npm install in the project root.</p>
 * </StepSection>
 * ```
 *
 * @see {@link Step} for the underlying step primitive
 */
export interface StepSectionProps {
  /** Step number - explicit, supports substeps like "1.1" */
  number: number | string;
  /** Step name/title */
  name: string;
  /** Optional step description shown before body */
  description?: string;
  /** Output format variant */
  variant?: StepVariant;
  /** Step body content */
  children?: ReactNode;
}

export const StepSection = ({
  number,
  name,
  description,
  variant,
  children
}: StepSectionProps): ReactNode => {
  return (
    <Step number={number} name={name} variant={variant}>
      {description && <p><i>{description}</i></p>}
      {children}
    </Step>
  );
};
