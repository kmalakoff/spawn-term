// @ts-ignore
export type { SpawnOptions, SpawnCallback, SpawnResult } from 'cross-spawn-cb';

export type TerminalOptions = object;

export type State = 'running' | 'error' | 'success';

export type ChildProcess = {
  id: string;
  title: string;
  state: State;
  lines: string[];
};
