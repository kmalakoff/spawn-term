import { Box, Text, useApp, useInput, useStdin, useStdout } from 'ink';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { EXPANDED_MAX_VISIBLE_LINES } from '../constants.ts';
import type { ProcessStore } from '../state/processStore.ts';
import { StoreContext } from '../state/StoreContext.ts';
import CompactProcessLine from './CompactProcessLine.ts';
import Divider from './Divider.ts';
import ErrorFooter from './ErrorFooter.ts';
import ExpandedOutput from './ExpandedOutput.ts';
import FullscreenOverlay from './FullscreenOverlay.ts';
import StatusBar from './StatusBar.ts';

const isMac = process.platform === 'darwin';

interface AppProps {
  store: ProcessStore;
}

function AppContent({ store }: AppProps): React.JSX.Element {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();
  const { stdout } = useStdout();
  const terminalHeight = stdout?.rows || 24;

  // Subscribe to store state
  const allProcesses = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const shouldExit = useSyncExternalStore(store.subscribe, store.getShouldExit);
  const mode = useSyncExternalStore(store.subscribe, store.getMode);
  const selectedIndex = useSyncExternalStore(store.subscribe, store.getSelectedIndex);
  const expandedId = useSyncExternalStore(store.subscribe, store.getExpandedId);
  const scrollOffset = useSyncExternalStore(store.subscribe, store.getScrollOffset);
  const listScrollOffset = useSyncExternalStore(store.subscribe, store.getListScrollOffset);
  const errorFooterExpanded = useSyncExternalStore(store.subscribe, store.getErrorFooterExpanded);
  const filterMode = useSyncExternalStore(store.subscribe, store.getFilterMode);
  const searchTerm = useSyncExternalStore(store.subscribe, store.getSearchTerm);
  const isSearching = useSyncExternalStore(store.subscribe, store.getIsSearching);
  const isFullscreen = useSyncExternalStore(store.subscribe, store.getIsFullscreen);
  // Subscribe to buffer version to trigger re-renders when terminal buffer content changes
  const _bufferVersion = useSyncExternalStore(store.subscribe, store.getBufferVersion);

  // Use filtered processes for display
  const processes = store.getFilteredProcesses();

  // Subscribed state that triggers re-renders
  const header = useSyncExternalStore(store.subscribe, store.getHeader);
  const showStatusBar = useSyncExternalStore(store.subscribe, store.getShowStatusBar);
  const isInteractive = useSyncExternalStore(store.subscribe, store.getIsInteractive);

  // Calculate visible process count (reserve lines for header, divider, status bar, expanded output)
  // When a process is expanded, reserve space for the expanded output to prevent terminal scrolling
  // In interactive mode without expansion, reserve space for filter bar and list scroll hint
  const expandedHeight = expandedId ? EXPANDED_MAX_VISIBLE_LINES + 1 : 0; // +1 for scroll hint
  const filterBarHeight = mode === 'interactive' && !expandedId ? 1 : 0; // Reserve for filter/search bar
  const listHintHeight = mode === 'interactive' && !expandedId ? 1 : 0; // Reserve for list scroll hint
  const reservedLines = (header ? 2 : 0) + (showStatusBar ? 2 : 0) + expandedHeight + filterBarHeight + listHintHeight;
  const visibleProcessCount = Math.max(1, terminalHeight - reservedLines);

  // Derived state (computed from allProcesses - total counts regardless of filter)
  const runningCount = store.getRunningCount();
  const doneCount = store.getDoneCount();
  const errorCount = store.getErrorCount();
  const errorLineCount = store.getErrorLineCount();
  const _isAllComplete = store.isAllComplete();
  const errorLines = store.getErrorLines();

  // Filter mode display labels
  const filterLabels: Record<string, string> = {
    all: 'All',
    running: 'Running',
    finished: 'Finished',
    failed: 'Failed',
  };

  // Handle exit signal
  useEffect(() => {
    if (shouldExit) {
      exit();
    }
  }, [shouldExit, exit]);

  // Auto-enter interactive mode immediately when interactive flag is set
  // This allows selecting and viewing logs of running processes
  useEffect(() => {
    if (isInteractive && mode === 'normal') {
      store.setMode('interactive');
    }
  }, [isInteractive, mode, store]);

  // Clamp viewport when collapsing to avoid empty space
  // This runs after render with correct visibleProcessCount
  useEffect(() => {
    if (mode === 'interactive' && !expandedId) {
      store.clampListViewport(visibleProcessCount);
    }
  }, [mode, expandedId, visibleProcessCount, store]);

  // Calculate fullscreen visible lines (terminal height minus header and footer)
  const fullscreenVisibleLines = Math.max(1, terminalHeight - 3); // -3 for title, divider, footer

  // Keyboard handling (only active when raw mode is supported)
  useInput(
    (input, key) => {
      // Fullscreen mode input handling
      if (isFullscreen) {
        // Pre-calculate for viewport adjustment
        const baseReserved = (header ? 2 : 0) + (showStatusBar ? 2 : 0);
        const visibleWhenCollapsed = Math.max(1, terminalHeight - baseReserved - 2);

        if (input === 'q' || key.escape || key.return) {
          store.exitFullscreen(visibleWhenCollapsed);
        } else if ((key.meta && key.upArrow) || input === 'g') {
          store.scrollToTop();
        } else if ((key.meta && key.downArrow) || input === 'G') {
          store.scrollToBottom(fullscreenVisibleLines);
        } else if (key.tab && key.shift) {
          store.scrollPageUp(fullscreenVisibleLines);
        } else if (key.tab && !key.shift) {
          store.scrollPageDown(fullscreenVisibleLines);
        } else if (key.downArrow || input === 'j') {
          store.scrollDown(fullscreenVisibleLines);
        } else if (key.upArrow || input === 'k') {
          store.scrollUp();
        }
        return;
      }

      // Search mode input handling
      if (isSearching) {
        if (key.escape) {
          store.cancelSearch();
        } else if (key.return) {
          store.confirmSearch();
        } else if (key.backspace || key.delete) {
          store.updateSearchTerm(searchTerm.slice(0, -1));
        } else if (input && !key.ctrl && !key.meta) {
          store.updateSearchTerm(searchTerm + input);
        }
        return;
      }

      if (mode === 'normal') {
        // In non-interactive mode, 'e' toggles error footer
        if (input === 'e' && errorCount > 0) {
          store.toggleErrorFooter();
        }
      } else if (mode === 'interactive') {
        // Pre-calculate visible counts for expand/collapse transitions
        const baseReserved = (header ? 2 : 0) + (showStatusBar ? 2 : 0);
        const visibleWhenExpanded = Math.max(1, terminalHeight - baseReserved - EXPANDED_MAX_VISIBLE_LINES - 1);
        const visibleWhenCollapsed = Math.max(1, terminalHeight - baseReserved - 2); // -2 for filter bar + list hint

        if (input === 'q' || key.escape) {
          if (expandedId) {
            store.collapse(visibleWhenCollapsed);
          } else if (searchTerm) {
            // Clear search first before exiting
            store.clearSearch();
          } else {
            store.signalExit(() => {});
          }
          // Enter - fullscreen view (direct from list or from expanded)
        } else if (key.return) {
          store.enterFullscreen();
          // Space - toggle small expanded preview
        } else if (input === ' ') {
          store.toggleExpand(visibleWhenExpanded, visibleWhenCollapsed);
          // Filter cycling - left/right arrows
        } else if (key.rightArrow && !expandedId) {
          store.cycleFilterNext();
        } else if (key.leftArrow && !expandedId) {
          store.cycleFilterPrev();
          // Search - '/' to start search
        } else if (input === '/' && !expandedId) {
          store.startSearch();
          // Jump to top - Option+↑ (detected as meta), vim: g
          // Must check meta+arrow BEFORE plain arrow
        } else if ((key.meta && key.upArrow) || input === 'g') {
          if (expandedId) {
            store.scrollToTop();
          } else {
            store.selectFirst(visibleProcessCount);
          }
          // Jump to bottom - Option+↓ (detected as meta), vim: G
        } else if ((key.meta && key.downArrow) || input === 'G') {
          if (expandedId) {
            store.scrollToBottom(EXPANDED_MAX_VISIBLE_LINES);
          } else {
            store.selectLast(visibleProcessCount);
          }
          // Page scrolling - Tab/Shift+Tab (use same page size as expanded view)
        } else if (key.tab && key.shift) {
          if (expandedId) {
            store.scrollPageUp(EXPANDED_MAX_VISIBLE_LINES);
          } else {
            store.selectPageUp(EXPANDED_MAX_VISIBLE_LINES, visibleProcessCount);
          }
        } else if (key.tab && !key.shift) {
          if (expandedId) {
            store.scrollPageDown(EXPANDED_MAX_VISIBLE_LINES);
          } else {
            store.selectPageDown(EXPANDED_MAX_VISIBLE_LINES, visibleProcessCount);
          }
          // Line scrolling - arrows and vim j/k
        } else if (key.downArrow || input === 'j') {
          if (expandedId) {
            store.scrollDown(EXPANDED_MAX_VISIBLE_LINES);
          } else {
            store.selectNext(visibleProcessCount);
          }
        } else if (key.upArrow || input === 'k') {
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

  // Force full re-render when layout structure changes
  // Note: scrollOffset is NOT included - scrolling within expansion doesn't change structure
  const layoutKey = `${listScrollOffset}-${expandedId}-${errorCount}-${errorFooterExpanded}-${filterMode}-${searchTerm}-${isSearching}`;

  // Get expanded process info for fullscreen
  const expandedProcess = expandedId ? store.getProcess(expandedId) : null;

  // Render fullscreen overlay when active
  if (isFullscreen && expandedProcess) {
    return <FullscreenOverlay title={expandedProcess.group || expandedProcess.title} lines={store.getProcessLines(expandedProcess.id)} scrollOffset={scrollOffset} onExit={() => store.exitFullscreen()} />;
  }

  return (
    <Box key={layoutKey} flexDirection="column">
      {/* Header */}
      {header && (
        <>
          <Text>{header}</Text>
          <Divider />
        </>
      )}

      {/* Filter/Search bar (interactive mode only) */}
      {mode === 'interactive' && !expandedId && (
        <Box>
          <Text dimColor>◀ </Text>
          <Text color={filterMode === 'running' ? 'yellow' : filterMode === 'failed' ? 'red' : filterMode === 'finished' ? 'green' : 'cyan'} bold>
            {filterLabels[filterMode]}
          </Text>
          <Text dimColor> ▶</Text>
          {isSearching ? (
            <Text>
              {' '}
              <Text dimColor>/</Text>
              <Text>{searchTerm}</Text>
              <Text dimColor>▋</Text>
            </Text>
          ) : searchTerm ? (
            <Text dimColor> "{searchTerm}"</Text>
          ) : (
            <Text dimColor> (/ search)</Text>
          )}
          {processes.length !== allProcesses.length && (
            <Text dimColor>
              {' '}
              [{processes.length}/{allProcesses.length}]
            </Text>
          )}
        </Box>
      )}

      {/* Visible processes */}
      <Box flexDirection="column">
        {visibleProcesses.map((item) => {
          const originalIndex = processes.indexOf(item);
          return (
            <Box key={item.id} flexDirection="column">
              <CompactProcessLine item={item} isSelected={showSelection && originalIndex === selectedIndex} />
              {expandedId === item.id && <ExpandedOutput lines={store.getProcessLines(item.id)} scrollOffset={scrollOffset} />}
            </Box>
          );
        })}
        {/* List scroll hint (interactive mode without expansion) */}
        {mode === 'interactive' && !expandedId && processes.length > visibleProcessCount && (
          <Text dimColor>
            [+{processes.length - visibleProcessCount} more, Tab/⇧Tab page, {isMac ? '⌥↑/↓' : 'g/G'} top/bottom]
          </Text>
        )}
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
