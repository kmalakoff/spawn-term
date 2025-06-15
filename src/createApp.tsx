import { createStore } from 'zustand';
import App from './components/App.js';
import StoreContext from './contexts/Store.js';

// @ts-ignore
import { type Instance, initialize, render } from './ink.js';
import type { AppState, ReleaseCallback, RetainCallback } from './types.js';

export default function createApp() {
  let refCount = 0;
  let store = null;
  let inkApp: Instance | null = null;

  return {
    retain(fn: RetainCallback): undefined {
      initialize(() => {
        if (++refCount > 1) return fn(store);
        if (store) throw new Error('Not expecting store');
        store = createStore<AppState>()((set) => ({
          processes: [],
          addProcess: (process) => {
            store.nextRenders = store.renders + 1;
            set((state) => ({ processes: [...state.processes, process] }));
          },
          updateProcess: (process) => {
            store.nextRenders = store.renders + 1;
            set((state) => ({ processes: state.processes.map((x) => (x.id === process.id ? process : x)) }));
          },
        }));
        store.nextRenders = 0;
        store.renders = 0;
        store.waiting = [];
        store.onRender = () => {
          store.renders++;
          if (store.renders === store.nextRenders) {
            while (store?.waiting.length) store.waiting.pop()();
          }
        };
        inkApp = render(
          <StoreContext.Provider value={store}>
            <App />
          </StoreContext.Provider>,
          { patchConsole: false }
        );
        return fn(store);
      });
    },
    release(cb: ReleaseCallback): undefined {
      if (--refCount > 0) {
        if (store.renders === store.nextRenders) cb();
        else store.waiting.push(cb);
        return;
      }
      if (!store) throw new Error('Expecting store');

      function done() {
        inkApp.unmount();
        inkApp = null;
        store = null;
        process.stdout.write('\x1b[?25h'); // show cursor
        cb();
      }
      if (store.renders === store.nextRenders) done();
      else store.waiting.push(done);
    },
  };
}
