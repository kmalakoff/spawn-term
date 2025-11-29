import { Box, Text } from 'ink';
import { memo } from 'react';
import { SPINNER } from '../constants.ts';
import figures from '../lib/figures.ts';
import Spinner from './Spinner.ts';

type Props = {
  running: number;
  done: number;
  errors: number;
  errorLines: number;
};

export default memo(function StatusBar({ running, done, errors, errorLines }: Props) {
  return (
    <Box justifyContent="space-between">
      <Box>
        <Text>
          {running > 0 ? <Spinner {...SPINNER} /> : <Text color="green">{figures.tick}</Text>}
          {` Running: ${running}  | `}
          <Text color="green">{figures.tick}</Text>
          {` Done: ${done}  | `}
          <Text color="red">{figures.cross}</Text>
          {` Errors: ${errors}`}
          {errorLines > 0 && <Text dimColor>{` (${errorLines} lines)`}</Text>}
        </Text>
      </Box>
      {errors > 0 && (
        <Box>
          <Text dimColor>[e]rrors</Text>
        </Box>
      )}
    </Box>
  );
});
