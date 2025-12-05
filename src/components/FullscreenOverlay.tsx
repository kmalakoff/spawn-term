import { Box, Text, useStdout } from 'ink';
import { memo, useEffect } from 'react';
import type { Line } from '../types.ts';

const isMac = process.platform === 'darwin';

// ANSI escape codes for alternate screen buffer
const ENTER_ALT_SCREEN = '\x1b[?1049h';
const EXIT_ALT_SCREEN = '\x1b[?1049l';
const CLEAR_SCREEN = '\x1b[2J';
const CURSOR_HOME = '\x1b[H';
const HIDE_CURSOR = '\x1b[?25l';

type Props = {
  title: string;
  lines: Line[];
  scrollOffset: number;
  onExit: () => void;
};

export default memo(function FullscreenOverlay({ title, lines, scrollOffset }: Props) {
  const { stdout } = useStdout();
  const terminalHeight = stdout?.rows || 24;

  // Reserve lines for header (title + divider) and footer (scroll hint)
  const headerLines = 2;
  const footerLines = 1;
  const maxVisible = Math.max(1, terminalHeight - headerLines - footerLines);

  // Enter alternate screen on mount, exit on unmount
  useEffect(() => {
    if (stdout) {
      stdout.write(ENTER_ALT_SCREEN + CLEAR_SCREEN + CURSOR_HOME + HIDE_CURSOR);
    }
    return () => {
      if (stdout) {
        // Exit alternate screen, then clear main screen and reset cursor
        // This helps ink re-render cleanly to a known position
        stdout.write(EXIT_ALT_SCREEN + CLEAR_SCREEN + CURSOR_HOME + HIDE_CURSOR);
      }
    };
  }, [stdout]);

  const visibleLines = lines.slice(scrollOffset, scrollOffset + maxVisible);
  const totalLines = lines.length;
  const currentLine = scrollOffset + 1;
  const endLine = Math.min(scrollOffset + maxVisible, totalLines);

  return (
    <Box flexDirection="column" height={terminalHeight}>
      {/* Header */}
      <Text bold color="cyan">
        {title}
      </Text>
      <Text dimColor>{'─'.repeat(Math.min(80, stdout?.columns || 80))}</Text>

      {/* Content */}
      <Box flexDirection="column" flexGrow={1}>
        {lines.length === 0 ? (
          <Text dimColor>(no output)</Text>
        ) : (
          visibleLines.map((line, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Lines have no unique ID, index is stable for this scrolling view
            <Text key={scrollOffset + i}>{line.text}</Text>
          ))
        )}
      </Box>

      {/* Footer */}
      <Text dimColor>
        Lines {currentLine}-{endLine} of {totalLines} | j/k scroll | Tab/⇧Tab page | {isMac ? '⌥↑/↓' : 'g/G'} top/bottom | ↵/q exit
      </Text>
    </Box>
  );
});
