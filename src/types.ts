import type { StoreApi } from 'zustand';
export type { SpawnOptions, SpawnCallback, SpawnResult, SpawnError } from 'cross-spawn-cb';
import type { SpawnError, SpawnResult } from 'cross-spawn-cb';

export type TerminalOptions = {
  group?: string;
  expanded?: boolean;
};

export type TerminalCallback = (error?: SpawnError, result?: SpawnResult) => undefined;

export const LineType = {
  stdout: 1,
  stderr: 2,
} as const;

export type Line = {
  type: (typeof LineType)[keyof typeof LineType];
  text: string;
};

export type State = 'running' | 'error' | 'success';
export type ChildProcess = {
  id: string;
  group?: string;
  title: string;
  state: State;
  lines: Line[];
  expanded?: boolean;
};

export interface AppState {
  processes: ChildProcess[];
  addProcess: (process: ChildProcess) => void;
  updateProcess: (process: ChildProcess) => void;
}

export interface Store extends StoreApi<AppState> {
  onRender: () => undefined;
}
export type RetainCallback = (app: Store) => undefined;
export type ReleaseCallback = () => undefined;
