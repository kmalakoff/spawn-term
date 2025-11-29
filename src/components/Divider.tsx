import { Box, Text, useStdout } from 'ink';
import { memo } from 'react';

export default memo(function Divider() {
  const { stdout } = useStdout();
  const width = stdout?.columns || 80;

  return (
    <Box>
      <Text dimColor>{'─'.repeat(width)}</Text>
    </Box>
  );
});
