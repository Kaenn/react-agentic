/**
 * Scenario 2.3: Heading Hierarchy
 *
 * Goal: Confirm that HTML heading elements (h1-h6) render as proper markdown
 * headings with the correct number of `#` symbols.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/2.3-heading-hierarchy.tsx
 * Output: .claude/skills/heading-hierarchy-test/SKILL.md
 */

import { Skill } from '../../jsx.js';

export default function HeadingHierarchyTestSkill() {
  return (
    <Skill
      name="heading-hierarchy-test"
      description="Test skill to verify heading elements render as markdown headings. Use when testing heading hierarchy."
    >
      <h1>Heading Hierarchy Test</h1>

      <p>
        You have successfully invoked the heading-hierarchy-test skill. This
        skill tests whether HTML heading elements (h1-h6) render as proper
        markdown headings with the correct number of # symbols.
      </p>

      <h2>Section Level 2</h2>

      <p>
        This content appears under an h2 heading. The heading above should
        render as "## Section Level 2" in the markdown output.
      </p>

      <h3>Subsection Level 3</h3>

      <p>
        This content appears under an h3 heading. The heading above should
        render as "### Subsection Level 3" in the markdown output.
      </p>

      <h4>Sub-subsection Level 4</h4>

      <p>
        This content appears under an h4 heading. The heading above should
        render as "#### Sub-subsection Level 4" in the markdown output.
      </p>

      <h5>Detail Level 5</h5>

      <p>
        This content appears under an h5 heading. The heading above should
        render as "##### Detail Level 5" in the markdown output.
      </p>

      <h6>Fine Detail Level 6</h6>

      <p>
        This content appears under an h6 heading. The heading above should
        render as "###### Fine Detail Level 6" in the markdown output.
      </p>

      <h2>Structure Association Test</h2>

      <p>
        This section tests whether you recognize content as belonging to
        specific heading sections.
      </p>

      <h3>Question A</h3>

      <p>What is the capital of France?</p>

      <h3>Question B</h3>

      <p>What is 2 + 2?</p>

      <h3>Question C</h3>

      <p>Name a primary color.</p>

      <h2>Validation Instructions</h2>

      <p>
        After analyzing the headings above, respond with a YAML block confirming
        each test passed:
      </p>

      <pre><code className="language-yaml">{`status: SUCCESS
heading_tests:
  h1_renders_as_single_hash: true/false
  h2_renders_as_double_hash: true/false
  h3_renders_as_triple_hash: true/false
  h4_renders_as_quadruple_hash: true/false
  h5_renders_as_quintuple_hash: true/false
  h6_renders_as_sextuple_hash: true/false
section_boundaries:
  headings_create_logical_sections: true/false
  content_associated_with_correct_heading: true/false
structure_association_answers:
  question_a_section: "Question A"
  question_a_answer: "Paris"
  question_b_section: "Question B"
  question_b_answer: "4"
  question_c_section: "Question C"
  question_c_answer: "red/blue/yellow"
heading_hierarchy: PASSED/FAILED
timestamp: "ISO timestamp"`}</code></pre>
    </Skill>
  );
}
