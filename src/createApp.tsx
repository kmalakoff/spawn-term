import React, { type ReactNode } from 'react';
// @ts-ignore
import * as ink from '../../assets/ink.cjs';
import App from './components/App';
import uuid from './lib/uuid';
import type { ChildProcess } from './types';

interface Instance {
  rerender(node: ReactNode): void;
  unmount(): void;
}
type RenderFunction = (node: ReactNode) => Instance;
const render: RenderFunction = (ink.default || ink).render;

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
