import { createContext, useContext } from 'react';
import type { ProcessStore } from './processStore.ts';

export const StoreContext = createContext<ProcessStore | null>(null);

export function useStore(): ProcessStore {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used within a StoreContext.Provider');
  }
  return store;
}
