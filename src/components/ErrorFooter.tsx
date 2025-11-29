import { Box, Text } from 'ink';
import { memo } from 'react';
import type { Line } from '../types.ts';
import { LineType } from '../types.ts';
import Divider from './Divider.ts';

type ErrorGroup = {
  processName: string;
  lines: Line[];
};

type Props = {
  errors: ErrorGroup[];
  isExpanded: boolean;
};

export default memo(function ErrorFooter({ errors, isExpanded }: Props) {
  // Calculate totals for collapsed summary
  const totalLines = errors.reduce((sum, e) => sum + e.lines.filter((l) => l.type === LineType.stderr).length, 0);
  const totalProcesses = errors.length;

  if (totalProcesses === 0) {
    return null;
  }

  const processText = totalProcesses === 1 ? 'process' : 'processes';

  if (!isExpanded) {
    // Collapsed view - single summary line
    const summary = totalLines > 0 ? `${totalLines} error line${totalLines === 1 ? '' : 's'} in ${totalProcesses} ${processText}` : `${totalProcesses} failed ${processText}`;
    return (
      <>
        <Divider />
        <Text>
          <Text color="red">{'\u25b8'}</Text>
          {` ${summary} `}
          <Text dimColor>[e]</Text>
        </Text>
      </>
    );
  }

  // Expanded view - show all error lines (or just process names if no stderr)
  return (
    <>
      <Divider />
      <Text>
        <Text color="red">{'\u25be'}</Text>
        {' Errors '}
        <Text dimColor>[e]</Text>
      </Text>
      <Box flexDirection="column">
        {errors.map((errorGroup) => {
          const stderrLines = errorGroup.lines.filter((line) => line.type === LineType.stderr);
          if (stderrLines.length === 0) {
            // No stderr output - just show process name
            return (
              <Text key={errorGroup.processName}>
                <Text dimColor>[{errorGroup.processName}]</Text> <Text color="red">(failed)</Text>
              </Text>
            );
          }
          return stderrLines.map((line, index) => (
            <Text key={`${errorGroup.processName}-${index}`}>
              <Text dimColor>[{errorGroup.processName}]</Text> {line.text}
            </Text>
          ));
        })}
      </Box>
    </>
  );
});
