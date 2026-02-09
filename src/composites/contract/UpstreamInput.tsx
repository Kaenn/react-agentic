import type { ReactNode } from 'react';
import { XmlBlock } from '../../primitives/markdown.js';

export interface UpstreamInputProps {
  children?: ReactNode;
}

export const UpstreamInput = ({ children }: UpstreamInputProps): ReactNode => (
  <XmlBlock name="upstream_input">{children}</XmlBlock>
);
