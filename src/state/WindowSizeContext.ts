import { createContext, useContext } from 'react';

export interface WindowSize {
  columns: number;
  rows: number;
}

export const WindowSizeContext = createContext<WindowSize | null>(null);

// One Ink useWindowSize subscription in App feeds every component, so stdout carries one resize listener.
export function useSharedWindowSize(): WindowSize {
  const size = useContext(WindowSizeContext);
  if (!size) {
    throw new Error('useSharedWindowSize must be used within a WindowSizeContext.Provider');
  }
  return size;
}
