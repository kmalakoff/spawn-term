import React from 'react';
import { createStore } from 'zustand';
import App from './components/App';
import StoreContext from './contexts/Store';

// @ts-ignore
import { type Instance, render } from './ink.mjs';
import type { AppState } from './types';

export default function createApp() {
  let refCount = 0;
  let store = null;
  let inkApp: Instance | null = null;

  return {
    retain() {
      if (++refCount > 1) return store;
      if (inkApp) throw new Error('Not expecting app');
      store = createStore<AppState>()((set) => ({
        processes: [],
        addProcess: (process) => set((state) => ({ processes: [...state.processes, process] })),
        updateProcess: (process) => set((state) => ({ processes: state.processes.map((x) => (x.id === process.id ? process : x)) })),
      }));
      inkApp = render(
        <StoreContext.Provider value={store}>
          <App />
        </StoreContext.Provider>,
        { patchConsole: false }
      );
      return store;
    },
    release() {
      if (--refCount > 0) return;
      if (!inkApp) throw new Error('Expecting app');
      inkApp.unmount();
      inkApp = null;
      store = null;
      process.stdout.write('\x1b[?25h'); // show cursor
    },
  };
}
