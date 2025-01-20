// @ts-ignore
import { Box, Text } from 'ink';
import React from 'react';
import RenderSpinner from '../lib/RenderSpinner.js';
import figures from '../lib/figures.js';

type State = 'running' | 'success' | 'error';

// From: https://github.com/sindresorhus/cli-spinners/blob/00de8fbeee16fa49502fa4f687449f70f2c8ca2c/spinners.json#L2
const spinner = {
  interval: 80,
  frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
};

const ICONS = {
  error: <Text color="red">{figures.cross}</Text>,
  success: <Text color="green">{figures.tick}</Text>,
  running: <RenderSpinner spinner={spinner} />,
};

const POINTERS = {
  error: <Text color="red">{figures.pointer}</Text>,
  default: <Text color="yellow">{figures.pointer}</Text>,
};

type ChildProcessProps = {
  title: string;
  state: State;
  lines: string[];
  isExpanded?: boolean;
};

export default function ChildProcess({ title, state, lines, isExpanded }: ChildProcessProps) {
  const icon = isExpanded ? POINTERS[state] || POINTERS.default : ICONS[state];
  const output = state === 'running' && lines.length ? lines[lines.length - 1] : undefined;

  return (
    <Box flexDirection="column">
      <Box>
        <Box marginRight={1}>
          <Text>{icon}</Text>
        </Box>
        <Text>{title}</Text>
      </Box>
      {output ? (
        <Box marginLeft={2}>
          <Text color="gray">{`${figures.arrowRight} ${output}`}</Text>
        </Box>
      ) : undefined}
      {/* {state === 'running' && lines.length > 0 && (
        <Box flexDirection="column" marginLeft={2}>
          {lines.map((line, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            <Box key={index} flexDirection="column" height={1}>
              <Text>{line}</Text>
            </Box>
          ))}
        </Box>
      )} */}
    </Box>
  );
}
