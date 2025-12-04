import { arrayFind } from '../compat.ts';
import { DEFAULT_COLUMN_WIDTH } from '../constants.ts';
import type { ChildProcess, Line, SessionOptions } from '../types.ts';
import { LineType } from '../types.ts';
import { createNavigator, type Navigator } from './Navigator.ts';

type Listener = () => void;
type Mode = 'normal' | 'interactive';

export class ProcessStore {
  // === DATA: Process collection ===
  private processes: ChildProcess[] = [];
  private completedIds: string[] = []; // Track completion order

  // === NAVIGATION: List cursor ===
  private listNav: Navigator;

  // === VIEW STATE ===
  private mode: Mode = 'normal';
  private expandedId: string | null = null;
  private errorFooterExpanded = false; // For non-interactive error footer

  // === SESSION CONFIG (immutable after construction) ===
  private header: string | undefined;
  private showStatusBar = false;
  private isInteractive = false;

  // === INFRASTRUCTURE ===
  private listeners = new Set<Listener>();
  private shouldExit = false;
  private exitCallback: (() => void) | null = null;
  private bufferVersion = 0; // Increments on every notify() to trigger re-renders

  constructor(options: SessionOptions = {}) {
    this.header = options.header;
    this.showStatusBar = options.showStatusBar ?? false;
    this.isInteractive = options.interactive ?? false;

    // Create list navigator with wrap-around behavior
    this.listNav = createNavigator({
      getLength: () => this.processes.length,
      wrap: true,
      onMove: () => this.notify(),
    });
  }

  // === SUBSCRIPTION API (useSyncExternalStore) ===

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ChildProcess[] => this.processes;

  // === DATA: Queries ===

  getRunningProcesses = (): ChildProcess[] => {
    return this.processes.filter((p) => p.state === 'running');
  };

  getCompletedProcesses = (): ChildProcess[] => {
    // Return in completion order
    return this.completedIds.map((id) => arrayFind(this.processes, (p) => p.id === id)).filter((p): p is ChildProcess => p !== undefined);
  };

  getFailedProcesses = (): ChildProcess[] => {
    return this.processes.filter((p) => p.state === 'error');
  };

  // Counts
  getRunningCount = (): number => this.processes.filter((p) => p.state === 'running').length;
  getMaxGroupLength = (): number => {
    if (this.processes.length === 0) return DEFAULT_COLUMN_WIDTH;
    return Math.max(...this.processes.map((p) => (p.group || p.title).length));
  };
  getDoneCount = (): number => this.processes.filter((p) => p.state !== 'running').length;
  getErrorCount = (): number => this.processes.filter((p) => p.state === 'error').length;
  getErrorLineCount = (): number => {
    return this.processes.filter((p) => p.state === 'error').reduce((total, p) => total + this.getProcessLineCount(p.id), 0);
  };

  getErrorLines(): Array<{ processName: string; lines: Line[] }> {
    return this.getFailedProcesses().map((p) => ({
      processName: p.group || p.title,
      lines: this.getProcessLines(p.id),
    }));
  }

  // === DATA: Mutations ===

  addProcess(process: ChildProcess): void {
    // Create scroll navigator for this process
    const processWithNav: ChildProcess = {
      ...process,
      scrollNav: createNavigator({
        getLength: () => this.getProcessLineCount(processWithNav.id),
        wrap: false,
        onMove: () => this.notify(),
      }),
    };
    this.processes = [...this.processes, processWithNav];
    this.notify();
  }

  updateProcess(id: string, update: Partial<ChildProcess>): void {
    const oldProcess = arrayFind(this.processes, (p) => p.id === id);
    const wasRunning = oldProcess?.state === 'running';
    const isNowComplete = update.state && update.state !== 'running';

    this.processes = this.processes.map((p) => (p.id === id ? { ...p, ...update } : p));

    // Track completion order
    if (wasRunning && isNowComplete && !this.completedIds.includes(id)) {
      this.completedIds = [...this.completedIds, id];
    }

    // Auto-expand error footer when all complete with errors (non-interactive only)
    if (!this.isInteractive && this.isAllComplete() && this.getErrorCount() > 0) {
      this.errorFooterExpanded = true;
    }

    this.notify();
  }

  appendLines(id: string, newLines: Line[]): void {
    const process = arrayFind(this.processes, (p) => p.id === id);
    if (process) {
      this.updateProcess(id, { lines: process.lines.concat(newLines) });
    }
  }

  getProcess(id: string): ChildProcess | undefined {
    return arrayFind(this.processes, (p) => p.id === id);
  }

  // Get rendered lines from terminal buffer or fallback to lines array
  getProcessLines(id: string): Line[] {
    const process = this.getProcess(id);
    if (!process) return [];
    if (process.terminalBuffer) {
      return process.terminalBuffer.getLines().map((text) => ({
        type: LineType.stdout,
        text,
      }));
    }
    return process.lines;
  }

  // Get line count from terminal buffer or lines array
  getProcessLineCount(id: string): number {
    const process = this.getProcess(id);
    if (!process) return 0;
    if (process.terminalBuffer) {
      return process.terminalBuffer.lineCount;
    }
    return process.lines.length;
  }

  // === VIEW STATE: Getters ===

  getMode = (): Mode => this.mode;
  getSelectedIndex = (): number => this.listNav.position;
  getExpandedId = (): string | null => this.expandedId;
  getListScrollOffset = (): number => this.listNav.viewportOffset;
  getErrorFooterExpanded = (): boolean => this.errorFooterExpanded;
  getBufferVersion = (): number => this.bufferVersion;

  // Get scroll offset for expanded process (or 0 if none)
  getScrollOffset = (): number => {
    if (!this.expandedId) return 0;
    const process = this.getProcess(this.expandedId);
    return process?.scrollNav?.position ?? 0;
  };

  // Session-level getters (set at session creation, immutable)
  getHeader = (): string | undefined => this.header;
  getShowStatusBar = (): boolean => this.showStatusBar;
  getIsInteractive = (): boolean => this.isInteractive;
  isAllComplete = (): boolean => this.processes.length > 0 && this.processes.every((p) => p.state !== 'running');

  // === VIEW STATE: Mutations ===

  setMode(mode: Mode): void {
    this.mode = mode;
    if (mode === 'interactive') {
      this.listNav.setPosition(0);
    }
    this.notify();
  }

  getSelectedProcess(): ChildProcess | undefined {
    return this.processes[this.listNav.position];
  }

  // Error footer methods (for non-interactive mode)
  toggleErrorFooter(): void {
    this.errorFooterExpanded = !this.errorFooterExpanded;
    this.notify();
  }

  expandErrorFooter(): void {
    if (!this.errorFooterExpanded) {
      this.errorFooterExpanded = true;
      this.notify();
    }
  }

  // === NAVIGATION: List (delegates to listNav) ===

  selectNext(visibleCount?: number): void {
    this.listNav.down();
    if (visibleCount) {
      this.listNav.ensureVisible(visibleCount);
    }
  }

  selectPrev(visibleCount?: number): void {
    this.listNav.up();
    if (visibleCount) {
      this.listNav.ensureVisible(visibleCount);
    }
  }

  selectPageDown(pageSize: number, visibleCount?: number): void {
    this.listNav.pageDown(pageSize, visibleCount);
  }

  selectPageUp(pageSize: number, visibleCount?: number): void {
    this.listNav.pageUp(pageSize, visibleCount);
  }

  selectFirst(visibleCount?: number): void {
    this.listNav.toStart();
    if (visibleCount) {
      this.listNav.ensureVisible(visibleCount);
    }
  }

  selectLast(visibleCount?: number): void {
    this.listNav.toEnd();
    if (visibleCount) {
      this.listNav.ensureVisible(visibleCount);
    }
  }

  clampListViewport(visibleCount: number): void {
    const changed = this.listNav.clampViewport(visibleCount);
    if (changed) {
      this.notify();
    }
  }

  // === NAVIGATION: Expanded content (delegates to process.scrollNav) ===

  private getExpandedNav(): { nav: Navigator; id: string } | undefined {
    if (!this.expandedId) return undefined;
    const nav = this.getProcess(this.expandedId)?.scrollNav;
    if (!nav) return undefined;
    return { nav, id: this.expandedId };
  }

  scrollDown(maxVisible: number): void {
    const expanded = this.getExpandedNav();
    if (!expanded) return;

    const lineCount = this.getProcessLineCount(expanded.id);
    const maxOffset = Math.max(0, lineCount - maxVisible);

    // Only scroll if not at bottom
    if (expanded.nav.position < maxOffset) {
      expanded.nav.down();
    }
  }

  scrollUp(): void {
    const expanded = this.getExpandedNav();
    if (!expanded) return;

    if (expanded.nav.position > 0) {
      expanded.nav.up();
    }
  }

  scrollPageDown(pageSize: number): void {
    const expanded = this.getExpandedNav();
    if (!expanded) return;

    const lineCount = this.getProcessLineCount(expanded.id);
    const maxOffset = Math.max(0, lineCount - pageSize);

    // Clamp to max offset
    const newPosition = Math.min(expanded.nav.position + pageSize, maxOffset);
    expanded.nav.setPosition(newPosition);
    this.notify();
  }

  scrollPageUp(pageSize: number): void {
    const expanded = this.getExpandedNav();
    if (!expanded) return;

    const newPosition = Math.max(0, expanded.nav.position - pageSize);
    expanded.nav.setPosition(newPosition);
    this.notify();
  }

  scrollToTop(): void {
    const expanded = this.getExpandedNav();
    if (!expanded) return;
    expanded.nav.toStart();
  }

  scrollToBottom(maxVisible: number): void {
    const expanded = this.getExpandedNav();
    if (!expanded) return;

    const lineCount = this.getProcessLineCount(expanded.id);
    const newPosition = Math.max(0, lineCount - maxVisible);
    expanded.nav.setPosition(newPosition);
    this.notify();
  }

  // === EXPANSION ===

  toggleExpand(visibleCountWhenExpanded?: number, visibleCountWhenCollapsed?: number): void {
    const selected = this.getSelectedProcess();
    if (!selected) return;

    if (this.expandedId === selected.id) {
      // Collapse (keep scroll position for later)
      this.expandedId = null;
      // Adjust viewport to avoid empty space at bottom
      if (visibleCountWhenCollapsed) {
        this.listNav.clampViewport(visibleCountWhenCollapsed);
      }
    } else {
      // Expand (scroll position is preserved in process.scrollNav)
      this.expandedId = selected.id;
      // Adjust list scroll to keep expanded process visible
      if (visibleCountWhenExpanded) {
        this.listNav.ensureVisible(visibleCountWhenExpanded);
      }
    }
    this.notify();
  }

  collapse(visibleCountWhenCollapsed?: number): void {
    // Collapse but keep scroll position in process
    this.expandedId = null;
    // Adjust viewport to avoid empty space at bottom
    if (visibleCountWhenCollapsed) {
      this.listNav.clampViewport(visibleCountWhenCollapsed);
    }
    this.notify();
  }

  // === EXIT ===

  signalExit(callback: () => void): void {
    this.shouldExit = true;
    this.exitCallback = callback;
    this.notify();
  }

  getShouldExit = (): boolean => this.shouldExit;
  getExitCallback = (): (() => void) | null => this.exitCallback;

  // === RESET ===

  reset(): void {
    // Dispose terminal buffers before clearing
    for (const process of this.processes) {
      process.terminalBuffer?.dispose();
    }
    this.processes = [];
    this.completedIds = [];
    this.shouldExit = false;
    this.exitCallback = null;
    this.mode = 'normal';
    this.listNav.reset();
    this.expandedId = null;
    this.errorFooterExpanded = false;
    this.header = undefined;
  }

  // === INFRASTRUCTURE ===

  notify(): void {
    this.bufferVersion++;
    this.listeners.forEach((l) => {
      l();
    });
  }
}

// Note: No global singleton - session creates its own store instance
