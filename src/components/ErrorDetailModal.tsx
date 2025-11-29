import { Box, Text, useStdout } from 'ink';
import { memo } from 'react';
import type { ChildProcess } from '../types.ts';
import { LineType } from '../types.ts';

type Props = {
  error: ChildProcess;
  currentIndex: number;
  totalErrors: number;
};

export default memo(function ErrorDetailModal({ error, currentIndex, totalErrors }: Props) {
  const { stdout } = useStdout();
  const width = stdout?.columns || 80;

  const borderH = '─'.repeat(width - 2);
  const title = ` Error Detail (${currentIndex + 1}/${totalErrors}) `;
  const titleBorder = `┌${title}${borderH.slice(title.length + 1)}┐`;

  const name = error.group || error.title;
  const stderrLines = error.lines.filter((l) => l.type === LineType.stderr);

  return (
    <Box flexDirection="column">
      {/* Top border with title */}
      <Text>{titleBorder}</Text>

      {/* Process name */}
      <Box paddingX={1}>
        <Text bold>{name}</Text>
      </Box>

      {/* Command */}
      <Box paddingX={1}>
        <Text dimColor>Command: </Text>
        <Text>{error.title}</Text>
      </Box>

      {/* Separator */}
      <Box paddingX={1}>
        <Text dimColor>{'─'.repeat(width - 4)}</Text>
      </Box>

      {/* Error output */}
      <Box paddingX={1}>
        <Text dimColor>stderr:</Text>
      </Box>

      {/* Error lines in a box */}
      <Box flexDirection="column" paddingX={2}>
        {stderrLines.length === 0 ? (
          <Text dimColor>(no stderr output)</Text>
        ) : (
          stderrLines.map((line, index) => (
            <Text key={`stderr-${index}-${line.text.slice(0, 20)}`} color="red">
              {line.text}
            </Text>
          ))
        )}
      </Box>

      {/* Empty line for padding */}
      <Box paddingX={1}>
        <Text> </Text>
      </Box>

      {/* Bottom border with hints */}
      <Text>├{borderH}┤</Text>
      <Box paddingX={1} justifyContent="space-between">
        <Text dimColor>[↑↓] prev/next error</Text>
        <Text dimColor>[Esc] back to list</Text>
      </Box>
      <Text>└{borderH}┘</Text>
    </Box>
  );
});
