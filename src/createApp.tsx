import { render } from 'ink';
import App from './components/App.ts';
import { DEFAULT_MAX_FPS } from './constants.ts';
import { type ProcessStore, processStore } from './state/processStore.ts';

export type ReleaseCallback = () => void;

export default function createApp() {
  let refCount = 0;
  let inkApp: ReturnType<typeof render> | null = null;

  return {
    retain(): ProcessStore {
      if (++refCount > 1) return processStore;

      // Render once - React handles all subsequent updates via useSyncExternalStore
      inkApp = render(<App />, {
        incrementalRendering: false,
        maxFps: DEFAULT_MAX_FPS,
      });
      return processStore;
    },

    release(callback: ReleaseCallback): void {
      if (--refCount > 0) {
        callback();
        return;
      }
      if (!inkApp) throw new Error('Expecting inkApp');

      // Signal exit to React component
      processStore.signalExit(() => {
        processStore.reset();
        process.stdout.write('\x1b[?25h'); // show cursor
        callback();
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
