import React, { memo, useMemo } from 'react';
import { Box, Text } from '../ink.mjs';
import ansiRegex from '../lib/ansiRegex';
import figures from '../lib/figures';
import Spinner from './Spinner';

import type { ChildProcess as ChildProcessT, Line, State } from '../types';
import { LineType } from '../types';

const _REGEX_NEW_LINE = /\r\n|[\n\v\f\r\x85\u2028\u2029]/g;
const REGEX_ANSI = ansiRegex();
const _DEFAULT_SUMMARY = { type: LineType.stdout, text: '' };

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

type RunningSummaryProps = {
  line: Line;
};

const RunningSummary = memo(function RunningSummary({ line }: RunningSummaryProps) {
  return (
    <Box marginLeft={2}>
      <Text color="gray">{line.text.replace(REGEX_ANSI, '')}</Text>
    </Box>
  );
});

type LinesProps = {
  lines: Line[];
};

// @ts-ignore
const renderLine = (line, index) => <ink-text key={index}>{line.text}</ink-text>;

const Lines = memo(function Lines({ lines }: LinesProps) {
  return (
    <Box flexDirection="column" marginLeft={2}>
      {lines.map(renderLine)}
    </Box>
  );
});

const Expanded = memo(function Expanded({ item }: ItemProps) {
  const { lines } = item;

  return (
    <Box flexDirection="column">
      <Header group={item.group} title={item.title} state={item.state} />
      <Lines lines={lines} />
    </Box>
  );
});

const Contracted = memo(function Contracted({ item }: ItemProps) {
  const { state, lines } = item;

  // remove ansi codes when displaying single lines
  const errors = useMemo(() => lines.filter((line) => line.type === LineType.stderr), [lines]);
  const summary = useMemo(() => lines.filter((line) => line.text.length > 0 && errors.indexOf(line) < 0).pop(), [lines, errors]);

  return (
    <Box flexDirection="column">
      <Header group={item.group} title={item.title} state={item.state} />
      {state === 'running' && summary && <RunningSummary line={summary} />}
      {errors.length > 0 && <Lines lines={errors} />}
    </Box>
  );
});

export default memo(function ChildProcess({ item }: ItemProps) {
  const { expanded } = item;
  return expanded ? <Expanded item={item} /> : <Contracted item={item} />;
});
