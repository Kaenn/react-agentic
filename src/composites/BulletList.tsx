import type { ReactNode } from 'react';
import { List } from '../primitives/structured.js';

/**
 * Enhanced bullet list with title support
 *
 * Wraps List primitive for common bullet list patterns.
 * For numbered lists, use List directly with ordered={true}.
 *
 * @param props - Component props
 * @param props.items - List items
 * @param props.title - Optional list title/header
 *
 * @example Basic bullet list
 * ```tsx
 * import { BulletList } from 'react-agentic/composites';
 *
 * <BulletList items={["First item", "Second item", "Third item"]} />
 * ```
 *
 * @example With title
 * ```tsx
 * <BulletList
 *   title="Prerequisites"
 *   items={["Node.js 18+", "npm or yarn", "Git"]}
 * />
 * ```
 *
 * @see {@link List} for the underlying list primitive
 */
export interface BulletListProps {
  /** List items */
  items: (string | number)[];
  /** Optional list title */
  title?: string;
}

export const BulletList = ({ items, title }: BulletListProps): ReactNode => {
  return (
    <>
      {title && <p><b>{title}</b></p>}
      <List items={items} />
    </>
  );
};
