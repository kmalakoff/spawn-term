import { Box, Text } from 'ink';
import { memo } from 'react';
import { EXPANDED_MAX_VISIBLE_LINES } from '../constants.ts';
import AnsiText from '../lib/AnsiText.ts';
import type { Line } from '../types.ts';

const isMac = process.platform === 'darwin';

type Props = {
  lines: Line[];
  scrollOffset: number;
  maxVisible?: number;
};

export default memo(function ExpandedOutput({ lines, scrollOffset, maxVisible = EXPANDED_MAX_VISIBLE_LINES }: Props) {
  const visibleLines = lines.slice(scrollOffset, scrollOffset + maxVisible);
  const hasMore = lines.length > scrollOffset + maxVisible;
  const remaining = lines.length - scrollOffset - maxVisible;

  if (lines.length === 0) {
    return (
      <Box paddingLeft={2}>
        <Text dimColor>│ (no output)</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingLeft={2}>
      {visibleLines.map((line, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Lines have no unique ID, index is stable for this scrolling view
        <Text key={scrollOffset + i}>
          │ <AnsiText>{line.text || ' '}</AnsiText>
        </Text>
      ))}
      {hasMore ? (
        <Text dimColor>
          │ [+{remaining} more, Tab/⇧Tab page, {isMac ? '⌥↑/↓' : 'g/G'} top/bottom, ↵ close]
        </Text>
      ) : (
        <Text dimColor>│ [↵ close]</Text>
      )}
    </Box>
  );
});
