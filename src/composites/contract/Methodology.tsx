import type { ReactNode } from 'react';
import { XmlBlock } from '../../primitives/markdown.js';

export interface MethodologyProps {
  children?: ReactNode;
}

export const Methodology = ({ children }: MethodologyProps): ReactNode => (
  <XmlBlock name="methodology">{children}</XmlBlock>
);
