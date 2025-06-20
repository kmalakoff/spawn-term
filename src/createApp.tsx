import { type Instance, render } from 'ink';
import App from './components/App.js';
import { ProcessProvider } from './state/ProcessContext.js';
import Store from './state/ProcessStore.js';

export type RetainCallback = (app: Store) => undefined;
export type ReleaseCallback = () => undefined;

export default function createApp() {
  let refCount = 0;
  let store = null;
  let inkApp: Instance | null = null;

  return {
    retain(fn: RetainCallback): undefined {
      if (++refCount > 1) return fn(store);
      if (store) throw new Error('Not expecting store');

      store = new Store();
      inkApp = render(
        <ProcessProvider store={store}>
          <App />
        </ProcessProvider>
      );
      fn(store);
    },
    release(cb: ReleaseCallback): undefined {
      if (--refCount > 0) return cb();
      if (!store) throw new Error('Expecting store');

      inkApp
        .waitUntilExit()
        .then(() => cb())
        .catch(cb);
      inkApp.unmount();
      inkApp = null;
      store = null;
      process.stdout.write('\x1b[?25h'); // show cursor
    },
  };
}
