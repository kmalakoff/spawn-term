import { Box, Text, useApp, useInput, useStdin } from 'ink';
import { useEffect, useSyncExternalStore } from 'react';
import { EXPANDED_MAX_VISIBLE_LINES } from '../constants.ts';
import type { ProcessStore } from '../state/processStore.ts';
import { StoreContext } from '../state/StoreContext.ts';
import CompactProcessLine from './CompactProcessLine.ts';
import Divider from './Divider.ts';
import ErrorDetailModal from './ErrorDetailModal.ts';
import ErrorListModal from './ErrorListModal.ts';
import ExpandedOutput from './ExpandedOutput.ts';
import StatusBar from './StatusBar.ts';

interface AppProps {
  store: ProcessStore;
}

function AppContent({ store }: AppProps): React.JSX.Element {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();

  // Subscribe to store state
  const processes = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const shouldExit = useSyncExternalStore(store.subscribe, store.getShouldExit);
  const mode = useSyncExternalStore(store.subscribe, store.getMode);
  const selectedIndex = useSyncExternalStore(store.subscribe, store.getSelectedIndex);
  const selectedErrorIndex = useSyncExternalStore(store.subscribe, store.getSelectedErrorIndex);
  const expandedId = useSyncExternalStore(store.subscribe, store.getExpandedId);
  const scrollOffset = useSyncExternalStore(store.subscribe, store.getScrollOffset);

  // Subscribed state that triggers re-renders
  const header = useSyncExternalStore(store.subscribe, store.getHeader);
  const showStatusBar = useSyncExternalStore(store.subscribe, store.getShowStatusBar);
  const isInteractive = useSyncExternalStore(store.subscribe, store.getIsInteractive);

  // Derived state (computed from processes which is already subscribed)
  const failedProcesses = store.getFailedProcesses();
  const runningCount = store.getRunningCount();
  const doneCount = store.getDoneCount();
  const errorCount = store.getErrorCount();
  const errorLineCount = store.getErrorLineCount();
  const isAllComplete = store.isAllComplete();

  // Handle exit signal
  useEffect(() => {
    if (shouldExit) {
      exit();
    }
  }, [shouldExit, exit]);

  // Auto-enter interactive mode when all complete and interactive flag is set
  useEffect(() => {
    if (isAllComplete && isInteractive && mode === 'normal') {
      store.setMode('interactive');
    }
  }, [isAllComplete, isInteractive, mode, store]);

  // Keyboard handling (only active when raw mode is supported)
  useInput(
    (input, key) => {
      if (mode === 'normal') {
        if (input === 'e' && errorCount > 0) {
          store.setMode('errorList');
        }
      } else if (mode === 'interactive') {
        if (input === 'q' || key.escape) {
          if (expandedId) {
            store.collapse();
          } else {
            store.signalExit(() => {});
          }
        } else if (key.return) {
          store.toggleExpand();
        } else if (key.downArrow) {
          if (expandedId) {
            store.scrollDown(EXPANDED_MAX_VISIBLE_LINES);
          } else {
            store.selectNext();
          }
        } else if (key.upArrow) {
          if (expandedId) {
            store.scrollUp();
          } else {
            store.selectPrev();
          }
        } else if (input === 'j') {
          if (expandedId) {
            store.scrollDown(EXPANDED_MAX_VISIBLE_LINES);
          } else {
            store.selectNext();
          }
        } else if (input === 'k') {
          if (expandedId) {
            store.scrollUp();
          } else {
            store.selectPrev();
          }
        } else if (input === 'e' && errorCount > 0) {
          store.setMode('errorList');
        }
      } else if (mode === 'errorList') {
        if (key.escape) {
          store.setMode(isInteractive ? 'interactive' : 'normal');
        } else if (key.downArrow) {
          store.selectNextError();
        } else if (key.upArrow) {
          store.selectPrevError();
        } else if (key.return) {
          store.setMode('errorDetail');
        }
      } else if (mode === 'errorDetail') {
        if (key.escape) {
          store.setMode('errorList');
        } else if (key.downArrow) {
          store.selectNextError();
        } else if (key.upArrow) {
          store.selectPrevError();
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
    const selectedError = store.getSelectedError();
    if (selectedError) {
      return <ErrorDetailModal error={selectedError} currentIndex={selectedErrorIndex} totalErrors={failedProcesses.length} />;
    }
    // Fallback if no error selected
    store.setMode('errorList');
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

// Wrapper component that provides store context
export default function App({ store }: AppProps): React.JSX.Element {
  return (
    <StoreContext.Provider value={store}>
      <AppContent store={store} />
    </StoreContext.Provider>
  );
}
