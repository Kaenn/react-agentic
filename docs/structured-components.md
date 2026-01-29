# Structured Components

Structured components accept array props instead of JSX children, making them easier to generate programmatically from data.

## Table

Create markdown tables from arrays.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `headers` | `string[]` | No | Column headers |
| `rows` | `string[][]` | Yes | 2D array of cell values |
| `align` | `('left'\|'center'\|'right')[]` | No | Column alignment |
| `emptyCell` | `string` | No | Placeholder for null/undefined cells (default: empty string) |

### Basic Usage

```tsx
import { Table } from 'react-agentic';

<Table
  headers={["Name", "Type", "Required"]}
  rows={[
    ["id", "string", "Yes"],
    ["name", "string", "Yes"],
    ["description", "string", "No"]
  ]}
/>
```

Emits:

```markdown
| Name | Type | Required |
| --- | --- | --- |
| id | string | Yes |
| name | string | Yes |
| description | string | No |
```

### Without Headers

Headers are optional. Omit them for data-only tables:

```tsx
<Table
  rows={[
    ["John", "Developer"],
    ["Jane", "Designer"]
  ]}
/>
```

Emits:

```markdown
| --- | --- |
| John | Developer |
| Jane | Designer |
```

### Column Alignment

Use the `align` prop to control text alignment:

```tsx
<Table
  headers={["Item", "Price", "Stock"]}
  rows={[
    ["Widget", "$19.99", "42"],
    ["Gadget", "$29.99", "7"]
  ]}
  align={["left", "right", "center"]}
/>
```

Emits:

```markdown
| Item | Price | Stock |
| :--- | ---: | :---: |
| Widget | $19.99 | 42 |
| Gadget | $29.99 | 7 |
```

Alignment markers:
- `left`: `:---`
- `right`: `---:`
- `center`: `:---:`

### Edge Cases

**Pipe escaping:** Pipes in cell content are automatically escaped:

```tsx
<Table
  headers={["Pattern", "Example"]}
  rows={[
    ["Pipe operator", "a | b"]
  ]}
/>
```

Emits `a \| b` to prevent breaking the table syntax.

**Newlines:** Newlines in cell values are converted to spaces since markdown tables don't support multi-line cells:

```tsx
<Table
  rows={[
    ["Line 1\nLine 2", "Value"]
  ]}
/>
```

Emits `Line 1 Line 2` as a single line.

**Empty cells:** Use `emptyCell` to provide a placeholder:

```tsx
<Table
  headers={["Name", "Value"]}
  rows={[
    ["key1", "value1"],
    ["key2", null]
  ]}
  emptyCell="—"
/>
```

## List

Create bullet or ordered lists from arrays.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `items` | `string[]` | Yes | List items |
| `ordered` | `boolean` | No | Use numbered list (default: false) |
| `start` | `number` | No | Starting number for ordered lists |

### Basic Usage (Bullet List)

```tsx
import { List } from 'react-agentic';

<List items={[
  "Read input file",
  "Parse content",
  "Write output"
]} />
```

Emits:

```markdown
- Read input file
- Parse content
- Write output
```

### Ordered List

```tsx
<List
  items={[
    "Check prerequisites",
    "Install dependencies",
    "Run build"
  ]}
  ordered
/>
```

Emits:

```markdown
1. Check prerequisites
2. Install dependencies
3. Run build
```

### Custom Start Number

Use `start` to begin numbering at a specific value:

```tsx
<List
  items={[
    "Continued step",
    "Another step"
  ]}
  ordered
  start={5}
/>
```

Emits:

```markdown
5. Continued step
6. Another step
```

### Nested Lists

For nested lists, use markdown strings within items:

```tsx
<List items={[
  "Parent item 1",
  "Parent item 2\n  - Child item 1\n  - Child item 2",
  "Parent item 3"
]} />
```

Emits:

```markdown
- Parent item 1
- Parent item 2
  - Child item 1
  - Child item 2
- Parent item 3
```

## Why Structured Components?

### Traditional JSX Approach

```tsx
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</ul>
```

### Structured Props Approach

```tsx
<List items={["Item 1", "Item 2", "Item 3"]} />
```

**Benefits:**

1. **Programmatic generation:** Easily map over data arrays
2. **Type safety:** Props are strongly typed
3. **Consistency:** Guaranteed correct markdown output
4. **Edge case handling:** Automatic escaping, alignment, formatting

### Example: Dynamic Table from Data

```tsx
import { Command, Table } from 'react-agentic';

interface Dependency {
  name: string;
  version: string;
  license: string;
}

const deps: Dependency[] = [
  { name: "react", version: "18.2.0", license: "MIT" },
  { name: "typescript", version: "5.0.0", license: "Apache-2.0" }
];

export default function ListDeps() {
  return (
    <Command name="list-deps" description="List project dependencies">
      <h2>Dependencies</h2>

      <Table
        headers={["Package", "Version", "License"]}
        rows={deps.map(d => [d.name, d.version, d.license])}
        align={["left", "center", "left"]}
      />
    </Command>
  );
}
```

This pattern makes it trivial to generate tables from TypeScript data structures with full type safety.
