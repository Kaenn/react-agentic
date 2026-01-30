/**
 * JSX component stubs for react-agentic - Structured data components
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

/**
 * Alignment options for table columns
 */
export type TableAlignment = 'left' | 'center' | 'right';

/**
 * Props for the Table component
 */
export interface TableProps {
  /** Optional header row */
  headers?: string[];
  /** Data rows - each row is an array of cell values (null/undefined use emptyCell) */
  rows: (string | number | null | undefined)[][];
  /** Per-column alignment (defaults to 'left' for all columns) */
  align?: TableAlignment[];
  /** Content for empty cells (defaults to empty string) */
  emptyCell?: string;
}

/**
 * Props for the List component
 */
export interface ListProps {
  /** List items */
  items: (string | number)[];
  /** Use ordered (numbered) list (default: false for bullet list) */
  ordered?: boolean;
  /** Starting number for ordered lists (default: 1) */
  start?: number;
}

/**
 * Table component - emits markdown table from structured props
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 *
 * @example
 * <Table
 *   headers={["Name", "Age", "City"]}
 *   rows={[
 *     ["Alice", 30, "NYC"],
 *     ["Bob", 25, "LA"],
 *   ]}
 *   align={["left", "right", "center"]}
 * />
 *
 * Outputs:
 * | Name | Age | City |
 * | :--- | ---: | :---: |
 * | Alice | 30 | NYC |
 * | Bob | 25 | LA |
 */
export function Table(_props: TableProps): null {
  return null;
}

/**
 * List component - emits markdown list from structured props
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 *
 * @example
 * <List items={["First item", "Second item", "Third item"]} />
 *
 * Outputs:
 * - First item
 * - Second item
 * - Third item
 *
 * @example
 * <List items={["Step one", "Step two"]} ordered start={5} />
 *
 * Outputs:
 * 5. Step one
 * 6. Step two
 */
export function List(_props: ListProps): null {
  return null;
}
