import { DEFAULT_COLUMN_WIDTH } from '../constants.ts';
import type { ChildProcess, Line, SessionOptions } from '../types.ts';
import { LineType } from '../types.ts';

type Listener = () => void;
type Mode = 'normal' | 'interactive';

export class ProcessStore {
  private processes: ChildProcess[] = [];
  private completedIds: string[] = []; // Track completion order
  private listeners = new Set<Listener>();
  private shouldExit = false;
  private exitCallback: (() => void) | null = null;

  // UI state
  private mode: Mode = 'normal';
  private selectedIndex = 0;
  private expandedId: string | null = null;
  private scrollOffset = 0;
  private listScrollOffset = 0; // Viewport offset for process list
  private errorFooterExpanded = false; // For non-interactive error footer
  private bufferVersion = 0; // Increments on every notify() to trigger re-renders

  // Session-level display settings (set once at session creation)
  private header: string | undefined;
  private showStatusBar = false;
  private isInteractive = false;

  constructor(options: SessionOptions = {}) {
    this.header = options.header;
    this.showStatusBar = options.showStatusBar ?? false;
    this.isInteractive = options.interactive ?? false;
  }

  // useSyncExternalStore API
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ChildProcess[] => this.processes;

  // Filtered getters
  getRunningProcesses = (): ChildProcess[] => {
    return this.processes.filter((p) => p.state === 'running');
  };

  getCompletedProcesses = (): ChildProcess[] => {
    // Return in completion order
    return this.completedIds.map((id) => this.processes.find((p) => p.id === id)).filter((p): p is ChildProcess => p !== undefined);
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

  // UI state getters
  getMode = (): Mode => this.mode;
  getSelectedIndex = (): number => this.selectedIndex;
  getExpandedId = (): string | null => this.expandedId;
  getScrollOffset = (): number => this.scrollOffset;
  getListScrollOffset = (): number => this.listScrollOffset;
  getErrorFooterExpanded = (): boolean => this.errorFooterExpanded;
  getBufferVersion = (): number => this.bufferVersion;
  // Session-level getters (set at session creation, immutable)
  getHeader = (): string | undefined => this.header;
  getShowStatusBar = (): boolean => this.showStatusBar;
  getIsInteractive = (): boolean => this.isInteractive;
  isAllComplete = (): boolean => this.processes.length > 0 && this.processes.every((p) => p.state !== 'running');

  // Mutations - Ink handles render throttling at 30 FPS
  addProcess(process: ChildProcess): void {
    this.processes = [...this.processes, process];
    this.notify();
  }

  updateProcess(id: string, update: Partial<ChildProcess>): void {
    const oldProcess = this.processes.find((p) => p.id === id);
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
    const process = this.processes.find((p) => p.id === id);
    if (process) {
      this.updateProcess(id, { lines: process.lines.concat(newLines) });
    }
  }

  getProcess(id: string): ChildProcess | undefined {
    return this.processes.find((p) => p.id === id);
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

  // UI state mutations
  setMode(mode: Mode): void {
    this.mode = mode;
    if (mode === 'interactive') {
      this.selectedIndex = 0;
    }
    this.notify();
  }

  // Interactive mode navigation
  selectNext(visibleCount?: number): void {
    if (this.processes.length > 0) {
      this.selectedIndex = (this.selectedIndex + 1) % this.processes.length;
      this.adjustListScroll(visibleCount);
      this.notify();
    }
  }

  selectPrev(visibleCount?: number): void {
    if (this.processes.length > 0) {
      this.selectedIndex = (this.selectedIndex - 1 + this.processes.length) % this.processes.length;
      this.adjustListScroll(visibleCount);
      this.notify();
    }
  }

  private adjustListScroll(visibleCount?: number): void {
    if (!visibleCount || visibleCount <= 0) return;

    // Ensure selected item is visible in viewport
    if (this.selectedIndex < this.listScrollOffset) {
      // Selected is above viewport - scroll up
      this.listScrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.listScrollOffset + visibleCount) {
      // Selected is below viewport - scroll down
      this.listScrollOffset = this.selectedIndex - visibleCount + 1;
    }
  }

  getSelectedProcess(): ChildProcess | undefined {
    return this.processes[this.selectedIndex];
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

  getErrorLines(): Array<{ processName: string; lines: Line[] }> {
    return this.getFailedProcesses().map((p) => ({
      processName: p.group || p.title,
      lines: this.getProcessLines(p.id),
    }));
  }

  // Expansion methods
  toggleExpand(): void {
    const selected = this.getSelectedProcess();
    if (!selected) return;

    if (this.expandedId === selected.id) {
      // Collapse
      this.expandedId = null;
      this.scrollOffset = 0;
    } else {
      // Expand
      this.expandedId = selected.id;
      this.scrollOffset = 0;
    }
    this.notify();
  }

  collapse(): void {
    this.expandedId = null;
    this.scrollOffset = 0;
    this.notify();
  }

  scrollDown(maxVisible: number): void {
    if (!this.expandedId) return;
    const lineCount = this.getProcessLineCount(this.expandedId);
    if (lineCount === 0) return;

    const maxOffset = Math.max(0, lineCount - maxVisible);
    if (this.scrollOffset < maxOffset) {
      this.scrollOffset++;
      this.notify();
    }
  }

  scrollUp(): void {
    if (!this.expandedId) return;
    if (this.scrollOffset > 0) {
      this.scrollOffset--;
      this.notify();
    }
  }

  // Exit signaling
  signalExit(callback: () => void): void {
    this.shouldExit = true;
    this.exitCallback = callback;
    this.notify();
  }

  getShouldExit = (): boolean => this.shouldExit;
  getExitCallback = (): (() => void) | null => this.exitCallback;

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
    this.selectedIndex = 0;
    this.expandedId = null;
    this.scrollOffset = 0;
    this.listScrollOffset = 0;
    this.errorFooterExpanded = false;
    this.header = undefined;
  }

  // Public notify for session to trigger updates when terminal buffer changes
  notify(): void {
    this.bufferVersion++;
    this.listeners.forEach((l) => {
      l();
    });
  }
}

// Note: No global singleton - session creates its own store instance
