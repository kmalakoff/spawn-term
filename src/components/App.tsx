import { Box, Text, useApp, useInput, useStdin } from 'ink';
import { useEffect, useSyncExternalStore } from 'react';
import { EXPANDED_MAX_VISIBLE_LINES } from '../constants.ts';
import { processStore } from '../state/processStore.ts';
import CompactProcessLine from './CompactProcessLine.ts';
import Divider from './Divider.ts';
import ErrorDetailModal from './ErrorDetailModal.ts';
import ErrorListModal from './ErrorListModal.ts';
import ExpandedOutput from './ExpandedOutput.ts';
import StatusBar from './StatusBar.ts';

export default function App(): React.JSX.Element {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();

  // Subscribe to store state
  const processes = useSyncExternalStore(processStore.subscribe, processStore.getSnapshot);
  const shouldExit = useSyncExternalStore(processStore.subscribe, processStore.getShouldExit);
  const mode = useSyncExternalStore(processStore.subscribe, processStore.getMode);
  const selectedIndex = useSyncExternalStore(processStore.subscribe, processStore.getSelectedIndex);
  const selectedErrorIndex = useSyncExternalStore(processStore.subscribe, processStore.getSelectedErrorIndex);
  const expandedId = useSyncExternalStore(processStore.subscribe, processStore.getExpandedId);
  const scrollOffset = useSyncExternalStore(processStore.subscribe, processStore.getScrollOffset);

  // Derived state
  const failedProcesses = processStore.getFailedProcesses();
  const runningCount = processStore.getRunningCount();
  const doneCount = processStore.getDoneCount();
  const errorCount = processStore.getErrorCount();
  const errorLineCount = processStore.getErrorLineCount();
  const header = processStore.getHeader();
  const showStatusBar = processStore.getShowStatusBar();
  const isInteractive = processStore.getIsInteractive();
  const isAllComplete = processStore.isAllComplete();

  // Handle exit signal
  useEffect(() => {
    if (shouldExit) {
      exit();
    }
  }, [shouldExit, exit]);

  // Auto-enter interactive mode when all complete and interactive flag is set
  useEffect(() => {
    if (isAllComplete && isInteractive && mode === 'normal') {
      processStore.setMode('interactive');
    }
  }, [isAllComplete, isInteractive, mode]);

  // Keyboard handling (only active when raw mode is supported)
  useInput(
    (input, key) => {
      if (mode === 'normal') {
        if (input === 'e' && errorCount > 0) {
          processStore.setMode('errorList');
        }
      } else if (mode === 'interactive') {
        if (input === 'q' || key.escape) {
          if (expandedId) {
            processStore.collapse();
          } else {
            processStore.signalExit(() => {});
          }
        } else if (key.return) {
          processStore.toggleExpand();
        } else if (key.downArrow) {
          if (expandedId) {
            processStore.scrollDown(EXPANDED_MAX_VISIBLE_LINES);
          } else {
            processStore.selectNext();
          }
        } else if (key.upArrow) {
          if (expandedId) {
            processStore.scrollUp();
          } else {
            processStore.selectPrev();
          }
        } else if (input === 'j') {
          if (expandedId) {
            processStore.scrollDown(EXPANDED_MAX_VISIBLE_LINES);
          } else {
            processStore.selectNext();
          }
        } else if (input === 'k') {
          if (expandedId) {
            processStore.scrollUp();
          } else {
            processStore.selectPrev();
          }
        } else if (input === 'e' && errorCount > 0) {
          processStore.setMode('errorList');
        }
      } else if (mode === 'errorList') {
        if (key.escape) {
          processStore.setMode(isInteractive ? 'interactive' : 'normal');
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

  // Normal/Interactive view - render in original registration order
  const showSelection = mode === 'interactive';
  return (
    <Box flexDirection="column">
      {/* Header */}
      {header && (
        <>
          <Text>{header}</Text>
          <Divider />
        </>
      )}

      {/* All processes in registration order */}
      {processes.map((item, index) => (
        <Box key={item.id} flexDirection="column">
          <CompactProcessLine item={item} isSelected={showSelection && index === selectedIndex} />
          {expandedId === item.id && <ExpandedOutput lines={item.lines} scrollOffset={scrollOffset} />}
        </Box>
      ))}

      {/* Status bar */}
      {showStatusBar && processes.length > 0 && (
        <>
          <Divider />
          <StatusBar running={runningCount} done={doneCount} errors={errorCount} errorLines={errorLineCount} />
        </>
      )}
    </Box>
  );
}
