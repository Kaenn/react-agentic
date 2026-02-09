/**
 * @component Prompt
 * @description Container for agent prompts - improves readability for multiline prompts
 */

import {
  Variables,
  interpolate,
  createPromptTemplate,
  t
} from './enums';

// =============================================================================
// RE-EXPORTS (for convenience)
// =============================================================================

export { Variables, interpolate, createPromptTemplate, t };

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface PromptProps {
  /**
   * The prompt content - supports full JSX (BlockContent elements)
   *
   * Supported elements:
   * - HTML: <h1>-<h6>, <p>, <ul>, <ol>, <blockquote>, <pre>, etc.
   * - Components: <XmlBlock>, <Table>, <List>, <ExecutionContext>, etc.
   * - Text content and template literals
   *
   * Children are transformed to markdown string for Task.prompt
   * @required
   */
  children: React.ReactNode;

  /**
   * Variables for interpolation - replaces ${var} in text content
   * @optional
   */
  vars?: Variables;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Prompt({ children }: PromptProps) {
  // Returns the prompt content as-is
  // Parent component handles formatting
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// Example 1: Simple inline prompt
const SimplePrompt = () => (
  <Teammate name="worker" type="general-purpose">
    <Prompt>Review the code for bugs</Prompt>
  </Teammate>
);

// Example 2: Multiline prompt with template literal
const MultilinePrompt = () => (
  <Teammate name="researcher" type="Explore">
    <Prompt>
      {`Find all files related to user authentication.

Look in:
- app/models/
- app/controllers/
- app/services/

Return a list of files with brief descriptions.`}
    </Prompt>
  </Teammate>
);

// Example 3: Structured prompt with template literal sections
const StructuredPromptTemplate = () => (
  <Teammate name="security-reviewer" type="security-sentinel" description="Security review">
    <Prompt>
      {`# Security Review Task

## Objective
Review the payment processing module for security vulnerabilities.

## Focus Areas
1. **Input Validation**
   - Check all user inputs are sanitized
   - Verify SQL parameterization

2. **Authentication**
   - Verify JWT token validation
   - Check session management

3. **Data Protection**
   - Ensure PII is encrypted
   - Verify secure transmission

## Output Format
Send findings to team-lead with:
- Severity: Critical/High/Medium/Low
- Location: file:line
- Description: What the issue is
- Recommendation: How to fix`}
    </Prompt>
  </Teammate>
);

// Example 3b: Structured prompt with full JSX (RECOMMENDED for complex prompts)
const StructuredPromptJSX = () => (
  <Teammate name="security-reviewer" type="security-sentinel" description="Security review">
    <Prompt>
      <h1>Security Review Task</h1>

      <h2>Objective</h2>
      <p>Review the payment processing module for security vulnerabilities.</p>

      <XmlBlock name="focus_areas">
        <h3>Input Validation</h3>
        <ul>
          <li>Check all user inputs are sanitized</li>
          <li>Verify SQL parameterization</li>
        </ul>

        <h3>Authentication</h3>
        <ul>
          <li>Verify JWT token validation</li>
          <li>Check session management</li>
        </ul>
      </XmlBlock>

      <h2>Output Format</h2>
      <Table
        headers={["Field", "Description"]}
        rows={[
          ["Severity", "Critical/High/Medium/Low"],
          ["Location", "file:line"],
          ["Description", "What the issue is"],
          ["Recommendation", "How to fix"],
        ]}
      />

      <ExecutionContext paths={["SECURITY_RULES.md"]} />
    </Prompt>
  </Teammate>
);

// Example 4: Prompt with dynamic content (variables)
const DynamicPrompt = ({ prNumber, files }: { prNumber: number; files: string[] }) => (
  <Teammate name="pr-reviewer" type="general-purpose">
    <Prompt>
      {`Review PR #${prNumber}

Files to review:
${files.map((f) => `- ${f}`).join('\n')}

Focus on code quality and test coverage.`}
    </Prompt>
  </Teammate>
);

// -----------------------------------------------------------------------------
// Pattern 5: Using vars prop for interpolation
// -----------------------------------------------------------------------------

const InterpolatedPrompt = () => (
  <Teammate name="reviewer" type="general-purpose">
    <Prompt vars={{ repo: 'my-app', branch: 'feature/auth', concern: 'security' }}>
      {`Review the ${repo} repository on branch ${branch}.
Focus on ${concern} issues.`}
    </Prompt>
  </Teammate>
);

// -----------------------------------------------------------------------------
// Pattern 6: Using createPromptTemplate for reusable prompts
// -----------------------------------------------------------------------------

// Define template once
const reviewTemplate = createPromptTemplate(`
Review ${file} for the following:
- ${primary_concern} issues
- Code quality
- Test coverage

Report findings to ${report_to}.
`);

// Use template with different vars
const TemplatedPrompt = () => (
  <>
    <Teammate name="security" type="security-sentinel">
      <Prompt>
        {reviewTemplate({
          file: 'user.rb',
          primary_concern: 'security',
          report_to: 'team-lead'
        })}
      </Prompt>
    </Teammate>

    <Teammate name="performance" type="performance-oracle">
      <Prompt>
        {reviewTemplate({
          file: 'payment.rb',
          primary_concern: 'performance',
          report_to: 'team-lead'
        })}
      </Prompt>
    </Teammate>
  </>
);

// -----------------------------------------------------------------------------
// Pattern 7: Using tagged template literal (t)
// -----------------------------------------------------------------------------

const TaggedPrompt = () => {
  const file = 'user.rb';
  const concern = 'security';
  const prompt = t`Review ${file} for ${concern} vulnerabilities`;

  return (
    <Teammate name="reviewer" type="general-purpose">
      <Prompt>{prompt}</Prompt>
    </Teammate>
  );
};

// -----------------------------------------------------------------------------
// Pattern 8: Using interpolate function directly
// -----------------------------------------------------------------------------

const config = {
  repo: 'my-app',
  branch: 'main',
  reviewType: 'comprehensive'
};

const InterpolateFunctionPrompt = () => (
  <Teammate name="reviewer" type="general-purpose">
    <Prompt>
      {interpolate(
        'Perform a ${reviewType} review of ${repo} on ${branch}',
        config
      )}
    </Prompt>
  </Teammate>
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * The <Prompt> component itself doesn't render markdown directly.
 * It provides content to parent components (<Teammate>, <Agent>, <Swarm>, etc.)
 *
 * Parent components render the prompt as:
 *
 * ```markdown
 * **Prompt:**
 * ```
 * {prompt content here}
 * ```
 * ```
 *
 * Or within Task() calls:
 *
 * ```javascript
 * Task({
 *   ...
 *   prompt: `{prompt content here}`,
 *   ...
 * })
 * ```
 */

// =============================================================================
// BEST PRACTICES
// =============================================================================

/**
 * 1. Use <Prompt> for any prompt longer than one line
 *
 * Good:
 * <Teammate name="worker" type="general-purpose">
 *   <Prompt>
 *     {`Multi-line
 *     prompt here`}
 *   </Prompt>
 * </Teammate>
 *
 * Avoid:
 * <Teammate
 *   name="worker"
 *   type="general-purpose"
 *   prompt="Very long prompt that spans multiple lines and becomes hard to read..."
 * />
 *
 * 2. Use template literals for complex prompts
 *
 * <Prompt>
 *   {`Line 1
 *   Line 2
 *   Line 3`}
 * </Prompt>
 *
 * 3. Structure long prompts with markdown headings
 *
 * <Prompt>
 *   {`# Task
 *   Description...
 *
 *   ## Steps
 *   1. First
 *   2. Second
 *
 *   ## Output
 *   Format...`}
 * </Prompt>
 *
 * 4. Use vars prop for simple interpolation
 *
 * <Prompt vars={{ file: 'user.rb', concern: 'security' }}>
 *   {`Review ${file} for ${concern}`}
 * </Prompt>
 *
 * 5. Use createPromptTemplate for reusable prompts
 *
 * const template = createPromptTemplate('Review ${file} for ${concern}');
 * <Prompt>{template({ file: 'user.rb', concern: 'security' })}</Prompt>
 *
 * 6. Use t tagged template for inline variables
 *
 * const file = 'user.rb';
 * <Prompt>{t`Review ${file} for security`}</Prompt>
 */

// =============================================================================
// VARIABLE INTERPOLATION REFERENCE
// =============================================================================

/**
 * | Method | Use Case | Example |
 * |--------|----------|---------|
 * | `vars` prop | Simple key-value replacement | `<Prompt vars={{a: 1}}>...</Prompt>` |
 * | `createPromptTemplate` | Reusable templates | `const t = createPromptTemplate(...); t({...})` |
 * | `interpolate()` | Function-based replacement | `interpolate('${x}', {x: 1})` |
 * | `` t`...` `` | Tagged template literal | `` t`Review ${file}` `` |
 *
 * Variable syntax: `${variableName}`
 *
 * If a variable is not provided, it remains as `${variableName}` in the output.
 */
