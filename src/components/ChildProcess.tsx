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

type ChildProcessProps = {
  id: string;
};

function Header({ item }) {
  const { group, title, state } = item;
  const icon = ICONS[state];

  return (
    <Box>
      <Box marginRight={1}>{icon}</Box>
      {group && <Text bold>{`${group}${figures.pointer} `}</Text>}
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

const HEADINGS = [figures.tick, figures.cross, spinner.frames[0]];
function filterHeadings(lines) {
  const headings = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!HEADINGS.some((x) => line[0] === x)) break;
    headings.push(line);
  }
  return headings;
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
  const headings = filterHeadings(lines);
  const errors = lines.filter((line) => line.type === LineType.stderr);
  const output = lines.filter((line) => line.text.length > 0).pop();

  return (
    <Box flexDirection="column">
      <Header item={item} />
      {headings.length > 0 && <Lines lines={headings} />}
      {state === 'running' && output && <Output output={output} />}
      {errors.length > 0 && <Lines lines={errors} />}
    </Box>
  );
}
