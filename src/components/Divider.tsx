import { Box, Text } from 'ink';
import { memo } from 'react';
import { useSharedWindowSize } from '../state/WindowSizeContext.ts';

export default memo(function Divider() {
  const { columns: width } = useSharedWindowSize();

  return (
    <Box>
      <Text dimColor>{'─'.repeat(width)}</Text>
    </Box>
  );
});
