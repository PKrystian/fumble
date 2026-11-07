import { createContext } from 'react';
import type { ReactNode } from 'react';

export const DetailPresentation = createContext<{
  artwork?: ReactNode;
  badge?: ReactNode;
}>({});
