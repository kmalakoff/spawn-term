import c from 'ansi-colors';
import { memo, useMemo } from 'react';
import { Box, Text } from '../ink.js';
import ansiRegex from '../lib/ansiRegex.js';
import figures from '../lib/figures.js';
import Spinner from './Spinner.js';

import type { ChildProcess as ChildProcessT, Line, State } from '../types.js';
import { LineType } from '../types.js';

const REGEX_ANSI = ansiRegex();
const BLANK_LINE = { type: LineType.stdout, text: '' };

// From: https://github.com/sindresorhus/cli-spinners/blob/00de8fbeee16fa49502fa4f687449f70f2c8ca2c/spinners.json#L2
const SPINNER = {
  interval: 80,
  frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
};

const ICONS = {
  // @ts-ignore
  error: <ink-text>{c.red(figures.cross)}</ink-text>,
  // @ts-ignore
  success: <ink-text>{c.green(figures.tick)}</ink-text>,
  running: <Spinner {...SPINNER} />,
};

type ItemProps = {
  item: ChildProcessT;
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
        {icon}
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

const renderLine = (line, index) => {
  return (
    // @ts-ignore
    <ink-text key={index} style={{ minHeight: 1 }}>
      {line.text}
      {/* @ts-ignore */}
    </ink-text>
  );
};

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
      {state === 'running' && <RunningSummary line={summary || BLANK_LINE} />}
      {errors.length > 0 && <Lines lines={errors} />}
    </Box>
  );
});

export default memo(function ChildProcess({ item }: ItemProps) {
  const { expanded } = item;
  return expanded ? <Expanded item={item} /> : <Contracted item={item} />;
});
