import React from 'react';
import resolveOnce from 'resolve-once-cb';
import { createStore } from 'zustand';
import App from './components/App';
import StoreContext from './contexts/Store';

// @ts-ignore
import { type Instance, render } from './ink.mjs';
import type { AppState } from './types';

const initialize = resolveOnce((cb) => setTimeout(() => cb(), 0));

export default function createApp() {
  let refCount = 0;
  let store = null;
  let inkApp: Instance | null = null;
  const _waiting = [];

  return {
    retain(fn) {
      initialize(() => {
        if (++refCount > 1) return fn(store);
        if (store) throw new Error('Not expecting store');
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
        return fn(store);
      });
    },
    release() {
      if (--refCount > 0) return;
      if (!store) throw new Error('Expecting store');
      store = null;
      inkApp.unmount();
      inkApp = null;
      process.stdout.write('\x1b[?25h'); // show cursor
    },
  };
}
