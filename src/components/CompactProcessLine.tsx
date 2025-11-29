import { Box, Text, useStdout } from 'ink';
import { memo, useMemo } from 'react';
import figures from '../lib/figures.ts';
import { calculateColumnWidth } from '../lib/format.ts';
import { useStore } from '../state/StoreContext.ts';
import type { ChildProcess, Line } from '../types.ts';
import { LineType } from '../types.ts';
import Spinner from './Spinner.ts';

// From: https://github.com/sindresorhus/cli-spinners/blob/00de8fbeee16fa49502fa4f687449f70f2c8ca2c/spinners.json#L2
const SPINNER = {
  interval: 80,
  frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
};

type Props = {
  item: ChildProcess;
  isSelected?: boolean;
};

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 1)}…`;
}

function getLastOutputLine(lines: Line[]): string {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].text.length > 0) {
      return lines[i].text;
    }
  }
  return '';
}

function getErrorCount(lines: Line[]): number {
  return lines.filter((line) => line.type === LineType.stderr).length;
}

export default memo(function CompactProcessLine({ item, isSelected = false }: Props) {
  const store = useStore();
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;

  const { group, title, state, lines } = item;
  const selectionIndicator = isSelected ? figures.pointer : ' ';

  // Display name: prefer group, fall back to title
  const displayName = group || title;

  // Calculate widths - use dynamic column width based on longest name
  const iconWidth = 2; // icon + space
  const maxGroupLength = store.getMaxGroupLength();
  const nameColumnWidth = calculateColumnWidth('max', terminalWidth, maxGroupLength);
  const gap = 1; // space between name and status
  const statusWidth = terminalWidth - iconWidth - nameColumnWidth - gap;

  // Truncate name if needed and pad to column width
  const truncatedName = truncate(displayName, nameColumnWidth).padEnd(nameColumnWidth);

  // Status text based on state
  const statusText = useMemo(() => {
    if (state === 'running') {
      const lastLine = getLastOutputLine(lines);
      return lastLine ? truncate(lastLine, statusWidth) : '';
    }
    if (state === 'error') {
      const errorCount = getErrorCount(lines);
      return errorCount > 0 ? `${errorCount} error${errorCount > 1 ? 's' : ''}` : 'failed';
    }
    return ''; // success - no status text
  }, [state, lines, statusWidth]);

  // Icon based on state
  const icon = useMemo(() => {
    switch (state) {
      case 'running':
        return <Spinner {...SPINNER} />;
      case 'success':
        return <Text color="green">{figures.tick}</Text>;
      case 'error':
        return <Text color="red">{figures.cross}</Text>;
    }
  }, [state]);

  // Status text color
  const statusColor = state === 'error' ? 'red' : 'gray';

  return (
    <Box>
      <Text color={isSelected ? 'cyan' : undefined}>{selectionIndicator}</Text>
      <Box width={iconWidth}>{icon}</Box>
      <Text inverse={isSelected}>{truncatedName}</Text>
      {statusText && <Text color={statusColor}> {statusText}</Text>}
    </Box>
  );
});
