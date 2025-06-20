export type { SpawnCallback, SpawnError, SpawnOptions, SpawnResult } from 'cross-spawn-cb';

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
export type ChildProcessUpdate = {
  group?: string;
  title?: string;
  state?: State;
  lines?: Line[];
  expanded?: boolean;
};
