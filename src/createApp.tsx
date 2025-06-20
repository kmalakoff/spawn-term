import { type Instance, render } from 'ink';
import throttle from 'lodash.throttle';
import App from './components/App.js';
import StoreContext from './store/Context.js';
import { Store } from './store/index.js';

export type RetainCallback = (app: Store) => undefined;
export type ReleaseCallback = () => undefined;

const THROTTLE = 50;

export default function createApp() {
  let refCount = 0;
  let store = null;
  let inkApp: Instance | null = null;

  const rerender = () => {
    inkApp?.rerender(
      <StoreContext.Provider value={store}>
        <App />
      </StoreContext.Provider>
    );
  };
  const rerenderThrottled = throttle(rerender, THROTTLE);

  return {
    retain(fn: RetainCallback): undefined {
      if (++refCount > 1) return fn(store);
      if (store) throw new Error('Not expecting store');

      store = new Store(rerenderThrottled);
      inkApp = render(
        <StoreContext.Provider value={store}>
          <App />
        </StoreContext.Provider>,
        { patchConsole: false }
      );
      fn(store);
    },
    release(cb: ReleaseCallback): undefined {
      if (--refCount > 0) return cb();
      if (!store) throw new Error('Expecting store');

      rerender();
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
