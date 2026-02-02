import type { ReactNode } from 'react';
import { XmlBlock } from '../../primitives/markdown.js';

export interface RoleProps {
  children?: ReactNode;
}

export const Role = ({ children }: RoleProps): ReactNode => (
  <XmlBlock name="role">{children}</XmlBlock>
);
