export type { SpawnCallback, SpawnError, SpawnOptions, SpawnResult } from 'cross-spawn-cb';

import type { SpawnError, SpawnResult } from 'cross-spawn-cb';

// Session-level options (set at session creation, immutable)
export type SessionOptions = {
  header?: string;
  showStatusBar?: boolean;
  interactive?: boolean;
};

// Per-process options (set when spawning each process)
export type ProcessOptions = {
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

// Internal representation of a child process
export type ChildProcess = {
  id: string;
  group?: string;
  title: string;
  state: State;
  lines: Line[];
  expanded?: boolean;
};
