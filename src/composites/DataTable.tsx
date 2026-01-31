import type { ReactNode } from 'react';
import { Table, type TableAlignment } from '../primitives/structured.js';

/**
 * Enhanced table with caption and empty state support
 *
 * Wraps Table primitive with common table patterns.
 *
 * @param props - Component props
 * @param props.headers - Column headers
 * @param props.rows - Data rows (2D array)
 * @param props.align - Per-column alignment
 * @param props.caption - Optional table caption
 * @param props.emptyMessage - Message when rows is empty
 *
 * @example Basic table
 * ```tsx
 * import { DataTable } from 'react-agentic/composites';
 *
 * <DataTable
 *   headers={["Name", "Status", "Score"]}
 *   rows={[
 *     ["Alice", "Active", 95],
 *     ["Bob", "Pending", 87],
 *   ]}
 * />
 * ```
 *
 * @example With caption and alignment
 * ```tsx
 * <DataTable
 *   caption="Test Results Summary"
 *   headers={["Test", "Result", "Time"]}
 *   rows={[["Unit", "Pass", "2.3s"], ["E2E", "Pass", "45s"]]}
 *   align={["left", "center", "right"]}
 * />
 * ```
 *
 * @example Empty state
 * ```tsx
 * <DataTable
 *   headers={["Name", "Value"]}
 *   rows={[]}
 *   emptyMessage="No data available"
 * />
 * ```
 *
 * @see {@link Table} for the underlying table primitive
 */
export interface DataTableProps {
  /** Column headers */
  headers?: string[];
  /** Data rows */
  rows: (string | number | null | undefined)[][];
  /** Per-column alignment */
  align?: TableAlignment[];
  /** Content for empty cells */
  emptyCell?: string;
  /** Optional table caption */
  caption?: string;
  /** Message when rows is empty */
  emptyMessage?: string;
}

export const DataTable = ({
  headers,
  rows,
  align,
  emptyCell,
  caption,
  emptyMessage
}: DataTableProps): ReactNode => {
  // Handle empty state
  if (rows.length === 0 && emptyMessage) {
    return <p><i>{emptyMessage}</i></p>;
  }

  return (
    <>
      {caption && <p><b>{caption}</b></p>}
      <Table headers={headers} rows={rows} align={align} emptyCell={emptyCell} />
    </>
  );
};
