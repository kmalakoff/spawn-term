import { Box, Text, useStdout } from 'ink';
import { memo, useMemo } from 'react';
import { SPINNER } from '../constants.ts';
import { clipText } from '../lib/clipText.ts';
import figures from '../lib/figures.ts';
import { calculateColumnWidth } from '../lib/format.ts';
import { useStore } from '../state/StoreContext.ts';
import type { ChildProcess, Line } from '../types.ts';
import { LineType } from '../types.ts';
import Spinner from './Spinner.ts';

type Props = {
  item: ChildProcess;
  isSelected?: boolean;
};

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
  const terminalWidth = stdout?.columns || 120;

  const { group, title, state, lines } = item;
  const selectionIndicator = isSelected ? figures.pointer : ' ';

  // Display name: prefer group, fall back to title
  const displayName = group || title;

  // Calculate widths - use dynamic column width based on longest name
  const selectionWidth = 1; // selection indicator
  const iconWidth = 2; // icon + space
  const maxGroupLength = store.getMaxGroupLength();
  const nameColumnWidth = calculateColumnWidth('max', terminalWidth, maxGroupLength);
  const gap = 1; // space between name and status
  const statusWidth = Math.max(0, terminalWidth - selectionWidth - iconWidth - nameColumnWidth - gap);

  // Clip name to column width and pad
  const clippedName = clipText(displayName, nameColumnWidth).padEnd(nameColumnWidth);

  // Status text based on state - clip to available width
  const statusText = useMemo(() => {
    if (state === 'running') {
      const lastLine = getLastOutputLine(lines);
      return lastLine ? clipText(lastLine, statusWidth) : '';
    }
    if (state === 'error') {
      const errorCount = getErrorCount(lines);
      const text = errorCount > 0 ? `${errorCount} error${errorCount > 1 ? 's' : ''}` : 'failed';
      return clipText(text, statusWidth);
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
    <Box width={terminalWidth}>
      <Text color={isSelected ? 'cyan' : undefined}>{selectionIndicator}</Text>
      <Box width={iconWidth}>{icon}</Box>
      <Box width={nameColumnWidth}>
        <Text inverse={isSelected}>{clippedName}</Text>
      </Box>
      {statusWidth > 0 && statusText && (
        <Box width={statusWidth + gap}>
          <Text color={statusColor}> {statusText}</Text>
        </Box>
      )}
    </Box>
  );
});
