import { type Instance, render } from 'ink';
import throttle from 'lodash.throttle';
import App from './components/App.ts';
import { default as Store, type StoreData } from './state/Store.ts';

export type RetainCallback = (app: Store) => undefined;
export type ReleaseCallback = () => undefined;

const THROTTLE = 100;

export default function createApp() {
  let refCount = 0;
  let store = null;
  let inkApp: Instance | null = null;

  let previousData: StoreData[] = null;
  const rerender = () => {
    if (!inkApp || !store) return;
    if (store.data() === previousData) return;
    previousData = store.data();
    inkApp.rerender(<App store={store} />);
  };
  const rerenderThrottled = throttle(rerender, THROTTLE);

  return {
    retain(fn: RetainCallback): undefined {
      if (++refCount > 1) return fn(store);
      if (store) throw new Error('Not expecting store');

      store = new Store(rerenderThrottled);
      inkApp = render(<App store={store} />);
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
