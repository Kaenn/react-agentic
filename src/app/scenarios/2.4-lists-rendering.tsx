/**
 * Scenario 2.4: Lists Rendering
 *
 * Goal: Confirm that `<ul>` and `<ol>` elements render as proper markdown
 * lists that Claude can parse.
 *
 * v2.0 Features Demonstrated:
 * - List component for array-based list generation
 * - List component with ordered prop for numbered lists
 * - Comparison of manual HTML approach vs structured component
 *
 * Run: node dist/cli/index.js build src/app/scenarios/2.4-lists-rendering.tsx
 * Output: .claude/skills/lists-rendering-test/SKILL.md
 */

import { Skill, List } from '../../jsx.js';

export default function ListsRenderingTestSkill() {
  return (
    <Skill
      name="lists-rendering-test"
      description="Test skill to verify list elements render as proper markdown lists. Use when testing list rendering."
    >
      <h1>Lists Rendering Test</h1>

      <p>
        You have successfully invoked the lists-rendering-test skill. This skill
        tests whether HTML list elements (ul, ol) render as proper markdown
        lists with correct bullets, numbering, and indentation.
      </p>

      <h2>Test 1: Unordered Lists</h2>

      <p>The following unordered list should render with dash or asterisk bullets:</p>

      <ul>
        <li>First unordered item</li>
        <li>Second unordered item</li>
        <li>Third unordered item</li>
      </ul>

      <h2>Test 2: Ordered Lists</h2>

      <p>The following ordered list should render with numbered items (1., 2., 3.):</p>

      <ol>
        <li>First ordered item</li>
        <li>Second ordered item</li>
        <li>Third ordered item</li>
      </ol>

      <h2>Test 3: Nested Unordered Lists</h2>

      <p>The following nested list should have proper indentation:</p>

      <ul>
        <li>Parent item A</li>
        <li>
          Parent item B with children
          <ul>
            <li>Child item B.1</li>
            <li>Child item B.2</li>
            <li>
              Child item B.3 with grandchildren
              <ul>
                <li>Grandchild B.3.a</li>
                <li>Grandchild B.3.b</li>
              </ul>
            </li>
          </ul>
        </li>
        <li>Parent item C</li>
      </ul>

      <h2>Test 4: Nested Ordered Lists</h2>

      <p>The following nested ordered list should maintain proper numbering:</p>

      <ol>
        <li>Step 1</li>
        <li>
          Step 2 with sub-steps
          <ol>
            <li>Step 2.1</li>
            <li>Step 2.2</li>
            <li>Step 2.3</li>
          </ol>
        </li>
        <li>Step 3</li>
      </ol>

      <h2>Test 5: Mixed List Types</h2>

      <p>The following demonstrates mixing ordered and unordered lists:</p>

      <ol>
        <li>First main step</li>
        <li>
          Second main step with options
          <ul>
            <li>Option A</li>
            <li>Option B</li>
            <li>Option C</li>
          </ul>
        </li>
        <li>Third main step</li>
      </ol>

      <h2>Test 6: List Items as Instructions</h2>

      <p>
        The following list should be treated as distinct instructions you must
        follow in order:
      </p>

      <ol>
        <li>State your name as "Claude"</li>
        <li>State the current date</li>
        <li>Count to three (1, 2, 3)</li>
        <li>Say "Instructions complete"</li>
      </ol>

      <h2>Test 7: v2.0 Structured List Component</h2>

      <p>
        The List component provides array-based list generation, replacing
        manual ul/li and ol/li patterns:
      </p>

      <List items={[
        "First item from array",
        "Second item from array",
        "Third item from array",
      ]} />

      <p>Ordered list variant with the ordered prop:</p>

      <List
        items={["Step one", "Step two", "Step three"]}
        ordered
      />

      <h2>Validation Instructions</h2>

      <p>
        After analyzing the lists above and executing Test 6 instructions,
        respond with a YAML block confirming each test passed:
      </p>

      <pre><code className="language-yaml">{`status: SUCCESS
tests:
  unordered_lists:
    renders_with_bullets: true/false
    bullet_character: "-" or "*"
  ordered_lists:
    renders_with_numbers: true/false
    numbering_format: "1. 2. 3." or similar
  nested_unordered:
    proper_indentation: true/false
    depth_levels_visible: true/false
  nested_ordered:
    proper_numbering: true/false
    sub_numbering_works: true/false
  mixed_lists:
    ordered_parent_works: true/false
    unordered_children_work: true/false
  list_items_as_instructions:
    recognized_as_distinct_steps: true/false
    executed_in_order: true/false
instruction_execution:
  step_1_name: "Claude"
  step_2_date: "ISO date"
  step_3_count: "1, 2, 3"
  step_4_complete: "Instructions complete"
lists_rendering: PASSED/FAILED
timestamp: "ISO timestamp"`}</code></pre>
    </Skill>
  );
}
