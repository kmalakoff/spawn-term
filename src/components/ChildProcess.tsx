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

const ICONS = {
  error: <Text color="red">{figures.cross}</Text>,
  success: <Text color="green">{figures.tick}</Text>,
  running: <Spinner {...spinner} />,
};

const POINTERS = {
  error: <Text color="red">{figures.pointer}</Text>,
  default: <Text color="yellow">{figures.pointer}</Text>,
};

type ChildProcessProps = {
  id: string;
};

function Content({ item }) {
  const { title, state, lines, expanded } = item;
  const icon = ICONS[state];
  const output = state === 'running' && lines.length ? lines[lines.length - 1] : undefined;
  const errors = state !== 'running' ? lines.filter((line) => line.type === LineType.stderr) : [];

  return (
    <React.Fragment>
      <Box>
        <Box marginRight={1}>
          <Text>{icon}</Text>
        </Box>
        <Text>{title}</Text>
      </Box>
      {output ? (
        <Box marginLeft={2}>
          <Text color="gray">{`${figures.arrowRight} ${output.text}`}</Text>
        </Box>
      ) : undefined}
      {expanded && (
        <Box flexDirection="column" marginLeft={2}>
          {lines.map((line, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            <Box key={index} flexDirection="column" height={1}>
              <Text color={line.type === LineType.stderr ? 'red' : 'black'}>{line.text}</Text>
            </Box>
          ))}
        </Box>
      )}
      {!expanded && errors.length > 0 && (
        <Box flexDirection="column" marginLeft={2}>
          {errors.map((line, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            <Box key={index} flexDirection="column" height={1}>
              <Text color={line.type === LineType.stderr ? 'red' : 'black'}>{line.text}</Text>
            </Box>
          ))}
        </Box>
      )}
    </React.Fragment>
  );
}

export default function ChildProcess({ id }: ChildProcessProps) {
  const store = useContext(StoreContext);
  const appState = useStore(store) as AppState;
  const item = appState.processes.find((x) => x.id === id);
  const { state, group } = item;
  const pointer = POINTERS[state] || POINTERS.default;

  return (
    <Box flexDirection="column">
      {group && (
        <Box flexDirection="column">
          <Box>
            <Box marginRight={1}>
              <Text>{pointer}</Text>
            </Box>
            <Text>{group}</Text>
          </Box>
          <Content item={item} />
        </Box>
      )}
      {!group && <Content item={item} />}
    </Box>
  );
}
