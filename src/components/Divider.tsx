import { Box, Text, useWindowSize } from 'ink';
import { memo } from 'react';

export default memo(function Divider() {
  const { columns: width } = useWindowSize();

  return (
    <Box>
      <Text dimColor>{'─'.repeat(width)}</Text>
    </Box>
  );
});
