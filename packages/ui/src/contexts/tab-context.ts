import { createContext } from 'react';
import type { PaneId, PaneTab } from '@/stores/usePaneStore';

export interface TabContextValue {
  paneId: PaneId;
  tabId: string;
  tab: PaneTab;
  worktreeId: string;
  updateMetadata: (metadata: Record<string, unknown>) => void;
}

export const TabContext = createContext<TabContextValue | null>(null);
