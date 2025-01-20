import { type Instance, render } from 'ink';
import React from 'react';
import type { ChildProcess } from '../types.js';
import App from './components/App.js';
import uuid from './lib/uuid.js';

export default function createApp() {
  let refCount = 0;
  let list: ChildProcess[] | null = null;
  let inkApp: Instance | null = null;

  return {
    addItem(data: Partial<ChildProcess>) {
      if (!list) throw new Error('Expecting list');
      const item = { id: uuid(), title: '', state: 'pending', lines: [], ...data } as ChildProcess;
      list.push(item);
      return item;
    },
    rerender() {
      if (inkApp) inkApp.rerender(<App list={list} />);
    },
    retain() {
      if (++refCount > 1) return;
      if (inkApp) throw new Error('Not expecting app');
      list = [];
      inkApp = render(<App list={list} />);
    },
    release() {
      if (--refCount > 0) return;
      if (!inkApp) throw new Error('Expecting app');
      inkApp.unmount();
      inkApp = null;
      list = null;
    },
  };
}
