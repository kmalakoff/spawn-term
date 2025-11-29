import { Box, Text, useStdout } from 'ink';
import { memo } from 'react';
import figures from '../lib/figures.ts';
import type { ChildProcess } from '../types.ts';
import { LineType } from '../types.ts';

type Props = {
  errors: ChildProcess[];
  selectedIndex: number;
  totalErrorLines: number;
};

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 1)}…`;
}

function getErrorLineCount(process: ChildProcess): number {
  return process.lines.filter((l) => l.type === LineType.stderr).length;
}

export default memo(function ErrorListModal({ errors, selectedIndex, totalErrorLines }: Props) {
  const { stdout } = useStdout();
  const width = stdout?.columns || 80;
  const innerWidth = width - 4; // 2 chars padding each side

  const borderH = '─'.repeat(width - 2);
  const title = ' Errors ';
  const titleBorder = `┌${title}${borderH.slice(title.length + 1)}┐`;

  return (
    <Box flexDirection="column">
      {/* Top border with title */}
      <Text>{titleBorder}</Text>

      {/* Summary */}
      <Box paddingX={1}>
        <Text>
          {errors.length} process{errors.length !== 1 ? 'es' : ''} failed ({totalErrorLines} error line
          {totalErrorLines !== 1 ? 's' : ''} total)
        </Text>
      </Box>

      {/* Empty line */}
      <Box paddingX={1}>
        <Text> </Text>
      </Box>

      {/* Error list */}
      {errors.map((error, index) => {
        const isSelected = index === selectedIndex;
        const indicator = isSelected ? figures.pointer : ' ';
        const name = error.group || error.title;
        const lineCount = getErrorLineCount(error);
        const lineText = `${lineCount} line${lineCount !== 1 ? 's' : ''}`;

        // Calculate available space for name
        const prefixLen = 3; // indicator + space + space
        const suffixLen = lineText.length + 2; // space + lineText
        const maxNameLen = innerWidth - prefixLen - suffixLen;
        const truncatedName = truncate(name, maxNameLen);

        return (
          <Box key={error.id} paddingX={1}>
            <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
              {indicator} {truncatedName}
            </Text>
            <Box flexGrow={1} />
            <Text dimColor>{lineText}</Text>
          </Box>
        );
      })}

      {/* Empty line for padding */}
      <Box paddingX={1}>
        <Text> </Text>
      </Box>

      {/* Bottom border with hints */}
      <Text>├{borderH}┤</Text>
      <Box paddingX={1} justifyContent="space-between">
        <Text dimColor>[↑↓] navigate [Enter] view details</Text>
        <Text dimColor>[Esc] close</Text>
      </Box>
      <Text>└{borderH}┘</Text>
    </Box>
  );
});
