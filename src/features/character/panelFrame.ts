import { createContext, type ReactNode } from 'react';

const WHOLE_NUMBER = /^-?\d+$/;

export function parseWholeNumber(text: string, min: number, max: number): number | null {
  const trimmed = text.trim();
  if (!WHOLE_NUMBER.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : null;
}

export interface PanelFrame {
  collapsible: boolean;
  collapsed: boolean;
  toggle: () => void;
  layoutMenu: ReactNode;
}

export const PanelFrameContext = createContext<PanelFrame | null>(null);
