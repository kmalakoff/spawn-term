import { render } from 'ink';
import App from './components/App.ts';
import { type ProcessStore, processStore } from './state/processStore.ts';

export type ReleaseCallback = () => void;

export default function createApp() {
  let refCount = 0;
  let inkApp: ReturnType<typeof render> | null = null;

  return {
    retain(): ProcessStore {
      if (++refCount > 1) return processStore;

      // Render once - React handles all subsequent updates via useSyncExternalStore
      inkApp = render(<App />);
      return processStore;
    },

    release(callback: ReleaseCallback): void {
      if (--refCount > 0) {
        callback();
        return;
      }
      if (!inkApp) throw new Error('Expecting inkApp');

      // Defer signalExit to allow React's reconciliation to complete fully
      // Using setImmediate ensures we run after I/O callbacks and microtasks,
      // preventing the Static component from outputting the last item twice
      // (the second notify() from signalExit can race with Static's useLayoutEffect)
      setImmediate(() => {
        processStore.signalExit(() => {
          processStore.reset();
          process.stdout.write('\x1b[?25h'); // show cursor
          callback();
        });
      });

      // Wait for Ink to finish, then call the callback
      inkApp
        .waitUntilExit()
        .then(() => {
          const cb = processStore.getExitCallback();
          cb?.();
        })
        .catch(() => {
          const cb = processStore.getExitCallback();
          cb?.();
        });

      inkApp = null;
    },
  };
}
