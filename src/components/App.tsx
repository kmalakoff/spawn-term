import { Box, Text, useApp, useInput, useStdin, useStdout } from 'ink';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { EXPANDED_MAX_VISIBLE_LINES } from '../constants.ts';
import type { ProcessStore } from '../state/processStore.ts';
import { StoreContext } from '../state/StoreContext.ts';
import CompactProcessLine from './CompactProcessLine.ts';
import Divider from './Divider.ts';
import ErrorFooter from './ErrorFooter.ts';
import ExpandedOutput from './ExpandedOutput.ts';
import StatusBar from './StatusBar.ts';

interface AppProps {
  store: ProcessStore;
}

function AppContent({ store }: AppProps): React.JSX.Element {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();
  const { stdout } = useStdout();
  const terminalHeight = stdout?.rows || 24;

  // Subscribe to store state
  const processes = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const shouldExit = useSyncExternalStore(store.subscribe, store.getShouldExit);
  const mode = useSyncExternalStore(store.subscribe, store.getMode);
  const selectedIndex = useSyncExternalStore(store.subscribe, store.getSelectedIndex);
  const expandedId = useSyncExternalStore(store.subscribe, store.getExpandedId);
  const scrollOffset = useSyncExternalStore(store.subscribe, store.getScrollOffset);
  const listScrollOffset = useSyncExternalStore(store.subscribe, store.getListScrollOffset);
  const errorFooterExpanded = useSyncExternalStore(store.subscribe, store.getErrorFooterExpanded);

  // Subscribed state that triggers re-renders
  const header = useSyncExternalStore(store.subscribe, store.getHeader);
  const showStatusBar = useSyncExternalStore(store.subscribe, store.getShowStatusBar);
  const isInteractive = useSyncExternalStore(store.subscribe, store.getIsInteractive);

  // Calculate visible process count (reserve lines for header, divider, status bar)
  const reservedLines = (header ? 2 : 0) + (showStatusBar ? 2 : 0);
  const visibleProcessCount = Math.max(1, terminalHeight - reservedLines);

  // Derived state (computed from processes which is already subscribed)
  const runningCount = store.getRunningCount();
  const doneCount = store.getDoneCount();
  const errorCount = store.getErrorCount();
  const errorLineCount = store.getErrorLineCount();
  const isAllComplete = store.isAllComplete();
  const errorLines = store.getErrorLines();

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
        // In non-interactive mode, 'e' toggles error footer
        if (input === 'e' && errorCount > 0) {
          store.toggleErrorFooter();
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
            store.selectNext(visibleProcessCount);
          }
        } else if (key.upArrow) {
          if (expandedId) {
            store.scrollUp();
          } else {
            store.selectPrev(visibleProcessCount);
          }
        } else if (input === 'j') {
          if (expandedId) {
            store.scrollDown(EXPANDED_MAX_VISIBLE_LINES);
          } else {
            store.selectNext(visibleProcessCount);
          }
        } else if (input === 'k') {
          if (expandedId) {
            store.scrollUp();
          } else {
            store.selectPrev(visibleProcessCount);
          }
        }
      }
    },
    { isActive: isRawModeSupported === true }
  );

  // Slice processes to visible viewport in interactive mode
  const visibleProcesses = useMemo(() => {
    if (mode === 'interactive') {
      return processes.slice(listScrollOffset, listScrollOffset + visibleProcessCount);
    }
    return processes;
  }, [processes, mode, listScrollOffset, visibleProcessCount]);

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

      {/* Visible processes - key forces clean re-render on scroll */}
      <Box key={`processes-${listScrollOffset}`} flexDirection="column">
        {visibleProcesses.map((item) => {
          const originalIndex = processes.indexOf(item);
          return (
            <Box key={item.id} flexDirection="column">
              <CompactProcessLine item={item} isSelected={showSelection && originalIndex === selectedIndex} />
              {expandedId === item.id && <ExpandedOutput lines={item.lines} scrollOffset={scrollOffset} />}
            </Box>
          );
        })}
      </Box>

      {/* Status bar */}
      {showStatusBar && processes.length > 0 && (
        <>
          <Divider />
          <StatusBar running={runningCount} done={doneCount} errors={errorCount} errorLines={errorLineCount} />
        </>
      )}

      {/* Error footer (non-interactive mode only) */}
      {!isInteractive && errorCount > 0 && <ErrorFooter errors={errorLines} isExpanded={errorFooterExpanded} />}
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
