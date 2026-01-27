import { Command, Table } from '../../jsx.js';

export default function TestTable() {
  return (
    <Command name="test-table" description="Verify Table component markdown output">
      <h2>Test 1: Basic Table</h2>
      <Table headers={["Name", "Value"]} rows={[["foo", "1"], ["bar", "2"]]} />

      <h2>Test 2: Column Alignment</h2>
      <Table
        headers={["Left", "Center", "Right"]}
        rows={[["a", "b", "c"], ["d", "e", "f"]]}
        align={["left", "center", "right"]}
      />

      <h2>Test 3: Pipe Characters in Cells (Escaping)</h2>
      <Table
        headers={["Input", "Output"]}
        rows={[
          ["echo 'hello' | grep h", "hello"],
          ["cat file.txt | wc -l", "42"]
        ]}
      />

      <h2>Test 4: Newlines in Cells (Should Convert to Spaces)</h2>
      <Table
        headers={["Multi-line", "Single-line"]}
        rows={[
          ["Line one\nLine two", "Normal text"],
          ["Another\nmulti\nline", "Simple"]
        ]}
      />

      <h2>Test 5: Headerless Table</h2>
      <Table rows={[["row1-col1", "row1-col2"], ["row2-col1", "row2-col2"]]} />

      <h2>Test 6: Empty Cell Handling</h2>
      <Table
        headers={["Field", "Value"]}
        rows={[
          ["name", "John"],
          ["email", null],
          ["phone", undefined],
          ["address", ""]
        ]}
        emptyCell="-"
      />
    </Command>
  );
}
