import { useContext } from 'react';
import { TabContext, type TabContextValue } from './tab-context';

export function useTabContext(): TabContextValue | null {
  return useContext(TabContext);
}

export function useRequiredTabContext(): TabContextValue {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useRequiredTabContext must be used within a TabContextProvider');
  }
  return context;
}
