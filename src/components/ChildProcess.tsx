import React, { useContext } from 'react';
import { useStore } from 'zustand';
import StoreContext from '../contexts/Store';
import { Box, Text } from '../ink.mjs';
import figures from '../lib/figures';
import Spinner from './Spinner';

import type { AppState } from '../types';
import { LineType } from '../types';

// From: https://github.com/sindresorhus/cli-spinners/blob/00de8fbeee16fa49502fa4f687449f70f2c8ca2c/spinners.json#L2
const spinner = {
  interval: 80,
  frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
};

const RUNS = [figures.cross, figures.tick].concat(spinner.frames);

const ICONS = {
  error: <Text color="red">{figures.cross}</Text>,
  success: <Text color="green">{figures.tick}</Text>,
  running: <Spinner {...spinner} />,
};

type ChildProcessProps = {
  id: string;
};

function Header({ item }) {
  const { group, title, state } = item;
  const icon = ICONS[state];

  return (
    <Box>
      <Box marginRight={1}>
        <Text>{icon}</Text>
      </Box>
      {group && <Text>{`${group}${figures.pointer} `}</Text>}
      <Text>{title}</Text>
    </Box>
  );
}

function Output({ output }) {
  return (
    <Box marginLeft={2}>
      <Text color="gray">{`${figures.arrowRight} ${output.text}`}</Text>
    </Box>
  );
}

function Lines({ lines }) {
  return (
    <Box flexDirection="column" marginLeft={2}>
      {lines.map((line, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
        <Box key={index} flexDirection="column" height={1}>
          <Text color={line.type === LineType.stderr ? 'red' : 'black'}>{line.text}</Text>
        </Box>
      ))}
    </Box>
  );
}

export default function ChildProcess({ id }: ChildProcessProps) {
  const store = useContext(StoreContext);
  const appState = useStore(store) as AppState;
  const item = appState.processes.find((x) => x.id === id);
  const { state, lines, expanded } = item;

  if (expanded) {
    return (
      <Box flexDirection="column">
        <Header item={item} />
        <Lines lines={lines} />
      </Box>
    );
  }
  const runs = lines.filter((line) => RUNS.some((run) => line.text[0] === run));
  const errors = lines.filter((line) => line.type === LineType.stderr && runs.indexOf(line) < 0);
  const output = lines.filter((line) => line.text.length > 0).pop();

  return (
    <Box flexDirection="column">
      <Header item={item} />
      {runs.length > 0 && <Lines lines={runs} />}
      {state === 'running' && output && runs.indexOf(output) < 0 && <Output output={output} />}
      {errors.length > 0 && <Lines lines={errors} />}
    </Box>
  );
}
