import { Box, Static, useApp, useInput, useStdin } from 'ink';
import { useEffect, useSyncExternalStore } from 'react';
import { processStore } from '../state/processStore.ts';
import CompactProcessLine from './CompactProcessLine.ts';
import Divider from './Divider.ts';
import ErrorDetailModal from './ErrorDetailModal.ts';
import ErrorListModal from './ErrorListModal.ts';
import StatusBar from './StatusBar.ts';

export default function App(): React.JSX.Element {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();

  // Subscribe to store state
  const processes = useSyncExternalStore(processStore.subscribe, processStore.getSnapshot);
  const shouldExit = useSyncExternalStore(processStore.subscribe, processStore.getShouldExit);
  const mode = useSyncExternalStore(processStore.subscribe, processStore.getMode);
  const selectedErrorIndex = useSyncExternalStore(processStore.subscribe, processStore.getSelectedErrorIndex);

  // Derived state
  const completedProcesses = processStore.getCompletedProcesses();
  const runningProcesses = processStore.getRunningProcesses();
  const failedProcesses = processStore.getFailedProcesses();
  const runningCount = processStore.getRunningCount();
  const doneCount = processStore.getDoneCount();
  const errorCount = processStore.getErrorCount();
  const errorLineCount = processStore.getErrorLineCount();

  // Handle exit signal
  useEffect(() => {
    if (shouldExit) {
      exit();
    }
  }, [shouldExit, exit]);

  // Keyboard handling (only active when raw mode is supported)
  useInput(
    (input, key) => {
      if (mode === 'normal') {
        if (input === 'e' && errorCount > 0) {
          processStore.setMode('errorList');
        }
      } else if (mode === 'errorList') {
        if (key.escape) {
          processStore.setMode('normal');
        } else if (key.downArrow) {
          processStore.selectNextError();
        } else if (key.upArrow) {
          processStore.selectPrevError();
        } else if (key.return) {
          processStore.setMode('errorDetail');
        }
      } else if (mode === 'errorDetail') {
        if (key.escape) {
          processStore.setMode('errorList');
        } else if (key.downArrow) {
          processStore.selectNextError();
        } else if (key.upArrow) {
          processStore.selectPrevError();
        }
      }
    },
    { isActive: isRawModeSupported === true }
  );

  // Error list modal
  if (mode === 'errorList') {
    return <ErrorListModal errors={failedProcesses} selectedIndex={selectedErrorIndex} totalErrorLines={errorLineCount} />;
  }

  // Error detail modal
  if (mode === 'errorDetail') {
    const selectedError = processStore.getSelectedError();
    if (selectedError) {
      return <ErrorDetailModal error={selectedError} currentIndex={selectedErrorIndex} totalErrors={failedProcesses.length} />;
    }
    // Fallback if no error selected
    processStore.setMode('errorList');
  }

  // Normal view
  return (
    <Box flexDirection="column">
      {/* Static area - completed processes (completion order) */}
      <Static items={completedProcesses}>{(item) => <CompactProcessLine key={item.id} item={item} />}</Static>

      {/* Divider between completed and running */}
      {completedProcesses.length > 0 && runningProcesses.length > 0 && <Divider />}

      {/* Dynamic area - running processes */}
      {runningProcesses.map((item) => (
        <CompactProcessLine key={item.id} item={item} />
      ))}

      {/* Status bar */}
      {processes.length > 0 && (
        <>
          <Divider />
          <StatusBar running={runningCount} done={doneCount} errors={errorCount} errorLines={errorLineCount} />
        </>
      )}
    </Box>
  );
}
