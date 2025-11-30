import { Box, Text } from 'ink';
import { memo, useMemo } from 'react';
import { SPINNER } from '../constants.ts';
import figures from '../lib/figures.ts';
import type { ChildProcess as ChildProcessT, Line, State } from '../types.ts';
import { LineType } from '../types.ts';
import Spinner from './Spinner.ts';

const BLANK_LINE = { type: LineType.stdout, text: '' };

const ICONS = {
  error: <Text color="red">{figures.cross}</Text>,
  success: <Text color="green">{figures.tick}</Text>,
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
      <Text>{line.text}</Text>
    </Box>
  );
});

type LinesProps = {
  lines: Line[];
};

const renderLine = (line, index) => {
  return (
    <Box key={index} minHeight={1}>
      <Text>{line.text}</Text>
    </Box>
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
