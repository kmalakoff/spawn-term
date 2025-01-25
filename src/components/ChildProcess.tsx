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

function Header({ icon, title }) {
  return (
    <Box>
      <Box marginRight={1}>
        <Text>{icon}</Text>
      </Box>
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

function Content({ item }) {
  const { title, state, lines, expanded } = item;
  const icon = ICONS[state];
  const output = lines.length ? lines[lines.length - 1] : undefined;
  const errors = lines.filter((line) => line.type === LineType.stderr);

  if (expanded) {
    return (
      <React.Fragment>
        <Header icon={icon} title={title} />
        <Lines lines={lines} />
      </React.Fragment>
    );
  }
  return (
    <React.Fragment>
      <Header icon={icon} title={title} />
      {state === 'running' && output && <Output output={output} />}
      {errors.length > 0 && <Lines lines={errors} />}
    </React.Fragment>
  );
}
function Group({ item }) {
  const { title, state, lines, group, expanded } = item;
  const icon = ICONS[state];
  const pointer = POINTERS[state] || POINTERS.default;
  const errors = lines.filter((line) => line.type === LineType.stderr);

  if (state === 'running') {
    return (
      <Box flexDirection="column">
        <Header icon={pointer} title={group} />
        <Content item={item} />
      </Box>
    );
  }
  return (
    <Box flexDirection="column">
      <Header icon={icon} title={`${group}: ${title}`} />
      {expanded && <Lines lines={lines} />}
      {!expanded && errors.length > 0 && <Lines lines={errors} />}
    </Box>
  );
}

export default function ChildProcess({ id }: ChildProcessProps) {
  const store = useContext(StoreContext);
  const appState = useStore(store) as AppState;
  const item = appState.processes.find((x) => x.id === id);
  const { group } = item;

  if (group) return <Group item={item} />;
  return (
    <Box flexDirection="column">
      <Content item={item} />
    </Box>
  );
}
