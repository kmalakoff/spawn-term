import React, { memo, useMemo } from 'react';
import { Box, Text } from '../ink.mjs';
import figures from '../lib/figures';
import regexANSI from '../lib/regexANSI';
import Spinner from './Spinner';

import type { ChildProcess as ChildProcessT, Data, State } from '../types';
import { DataType } from '../types';

type ItemProps = {
  item: ChildProcessT;
};

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

type HeaderProps = {
  group?: string;
  title: string;
  state: State;
};

const Header = memo(
  function Header({ group, title, state }: HeaderProps) {
    const icon = ICONS[state];

    return (
      <Box>
        <Box marginRight={1}>{icon}</Box>
        {group && <Text bold>{`${group}${figures.pointer} `}</Text>}
        <Text>{title}</Text>
      </Box>
    );
  },
  (a, b) => a.group === b.group && a.title === b.title && a.state === b.state
);

type OutputProps = {
  output: Data;
};

const Output = memo(function Output({ output }: OutputProps) {
  return (
    <Box marginLeft={2}>
      <Text color="gray">{output.text}</Text>
    </Box>
  );
});

type LinesProps = {
  lines: Data[];
};

const Lines = memo(function Lines({ lines }: LinesProps) {
  return (
    <Box flexDirection="column" marginLeft={2}>
      {lines.map((line, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
        <Box key={index} flexDirection="column">
          {/* <Text color={line.type === DataType.stderr ? 'red' : 'black'}>{line.text}</Text> */}
          <Text>{line.text}</Text>
        </Box>
      ))}
    </Box>
  );
});

const linesRegex = /\r\n|[\n\v\f\r\x85\u2028\u2029]/g;
const ansiRegex = regexANSI();

const Expanded = memo(function Expanded({ item }: ItemProps) {
  const { data } = item;

  const lines = useMemo(() => {
    const lines = [];
    data.forEach((x) => {
      x.text.split(linesRegex).forEach((text) => lines.push({ type: x.type, text: text.replace(ansiRegex, '') }));
    });
    return lines;
  }, [data]);

  return (
    <Box flexDirection="column">
      <Header group={item.group} title={item.title} state={item.state} />
      <Lines lines={lines} />
    </Box>
  );
});

const Contracted = memo(function Contracted({ item }: ItemProps) {
  const { state, data } = item;

  const lines = useMemo(() => {
    const lines = [];
    data.forEach((x) => {
      x.text.split(linesRegex).forEach((text) => lines.push({ type: x.type, text: text.replace(ansiRegex, '') }));
    });
    return lines;
  }, [data]);

  // remove ansi codes when displaying single lines
  const errors = useMemo(() => lines.filter((line) => line.type === DataType.stderr), [lines]);
  const output = useMemo(() => lines.filter((line) => line.text.length > 0 && errors.indexOf(line) < 0).pop() || '', [lines, errors]);

  return (
    <Box flexDirection="column">
      <Header group={item.group} title={item.title} state={item.state} />
      {state === 'running' && <Output output={output} />}
      {errors.length > 0 && <Lines lines={errors} />}
    </Box>
  );
});

export default memo(function ChildProcess({ item }: ItemProps) {
  const { expanded } = item;
  return expanded ? <Expanded item={item} /> : <Contracted item={item} />;
});
