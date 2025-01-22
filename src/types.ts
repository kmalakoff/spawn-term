// @ts-ignore
export type { SpawnOptions, SpawnCallback, SpawnResult } from 'cross-spawn-cb';

export type TerminalOptions = {
  summary?: boolean;
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
  title: string;
  state: State;
  lines: Line[];
};
