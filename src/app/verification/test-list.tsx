import { Command, List } from '../../jsx.js';

export default function TestList() {
  return (
    <Command name="test-list" description="Verify List component markdown output">
      <h2>Test 1: Bullet List (Unordered)</h2>
      <List items={["Item one", "Item two", "Item three"]} />

      <h2>Test 2: Ordered List (Numbered)</h2>
      <List items={["First", "Second", "Third"]} ordered />

      <h2>Test 3: Custom Start Number</h2>
      <List items={["Five", "Six", "Seven"]} ordered start={5} />

      <h2>Test 4: Empty List</h2>
      <List items={[]} />

      <h2>Test 5: List with Special Characters</h2>
      <List items={[
        "Item with asterisk: *important*",
        "Item with backticks: `code`",
        "Item with brackets: [link](url)",
        "Item with pipes: foo | bar"
      ]} />

      <h2>Test 6: Single Item List</h2>
      <List items={["Only one item"]} ordered />
    </Command>
  );
}
