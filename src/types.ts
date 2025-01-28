// @ts-ignore
export type { SpawnOptions, SpawnCallback, SpawnResult } from 'cross-spawn-cb';

export type TerminalOptions = {
  group?: string;
  expanded?: string;
};

export enum LineType {
  stdout = 1,
  stderr = 2,
}
export type Line = {
  type: LineType;
  text: string;
};

export type State = 'running' | 'error' | 'success';
export type ChildProcess = {
  id: string;
  group?: string;
  title: string;
  state: State;
  lines: Line[];
  expanded?: string;
};

export interface AppState {
  processes: ChildProcess[];
  addProcess: (process: ChildProcess) => void;
  updateProcess: (process: ChildProcess) => void;
}
