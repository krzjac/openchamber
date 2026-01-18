import React from 'react';
import type { PaneId, PaneTab } from '@/stores/usePaneStore';
import { TabContext, type TabContextValue } from './tab-context';

interface TabContextProviderProps {
  paneId: PaneId;
  tab: PaneTab;
  worktreeId: string;
  updateMetadata: (metadata: Record<string, unknown>) => void;
  children: React.ReactNode;
}

export const TabContextProvider: React.FC<TabContextProviderProps> = ({
  paneId,
  tab,
  worktreeId,
  updateMetadata,
  children,
}) => {
  const value: TabContextValue = {
    paneId,
    tabId: tab.id,
    tab,
    worktreeId,
    updateMetadata,
  };

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
};
