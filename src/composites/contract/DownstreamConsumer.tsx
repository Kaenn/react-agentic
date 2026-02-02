import type { ReactNode } from 'react';
import { XmlBlock } from '../../primitives/markdown.js';

export interface DownstreamConsumerProps {
  children?: ReactNode;
}

export const DownstreamConsumer = ({ children }: DownstreamConsumerProps): ReactNode => (
  <XmlBlock name="downstream_consumer">{children}</XmlBlock>
);
