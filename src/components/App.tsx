import { Box, useApp } from 'ink';
import { useEffect, useSyncExternalStore } from 'react';
import { processStore } from '../state/processStore.ts';
import type { ChildProcess as ChildProcessT } from '../types.ts';
import ChildProcess from './ChildProcess.ts';

export default function App(): React.JSX.Element {
  const { exit } = useApp();

  // Subscribe to process state
  const processes = useSyncExternalStore(processStore.subscribe, processStore.getSnapshot);

  // Handle exit signal
  const shouldExit = useSyncExternalStore(processStore.subscribe, processStore.getShouldExit);

  useEffect(() => {
    if (shouldExit) {
      exit();
    }
  }, [shouldExit, exit]);

  return (
    <Box flexDirection="column">
      {processes.map((item: ChildProcessT) => (
        <ChildProcess key={item.id} item={item} />
      ))}
    </Box>
  );
}
