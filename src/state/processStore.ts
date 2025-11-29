import { DEFAULT_COLUMN_WIDTH } from '../constants.ts';
import type { ChildProcess, Line, SessionOptions } from '../types.ts';
import { LineType } from '../types.ts';

type Listener = () => void;
type Mode = 'normal' | 'interactive' | 'errorList' | 'errorDetail';

export class ProcessStore {
  private processes: ChildProcess[] = [];
  private completedIds: string[] = []; // Track completion order
  private listeners = new Set<Listener>();
  private shouldExit = false;
  private exitCallback: (() => void) | null = null;

  // UI state
  private mode: Mode = 'normal';
  private selectedIndex = 0;
  private selectedErrorIndex = 0;
  private expandedId: string | null = null;
  private scrollOffset = 0;

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
    return this.processes.filter((p) => p.state === 'error').reduce((total, p) => total + p.lines.filter((l) => l.type === LineType.stderr).length, 0);
  };

  // UI state getters
  getMode = (): Mode => this.mode;
  getSelectedIndex = (): number => this.selectedIndex;
  getSelectedErrorIndex = (): number => this.selectedErrorIndex;
  getExpandedId = (): string | null => this.expandedId;
  getScrollOffset = (): number => this.scrollOffset;
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

  // UI state mutations
  setMode(mode: Mode): void {
    this.mode = mode;
    if (mode === 'interactive') {
      this.selectedIndex = 0;
    } else if (mode === 'errorList') {
      this.selectedErrorIndex = 0;
    }
    this.notify();
  }

  // Interactive mode navigation
  selectNext(): void {
    if (this.processes.length > 0) {
      this.selectedIndex = (this.selectedIndex + 1) % this.processes.length;
      this.notify();
    }
  }

  selectPrev(): void {
    if (this.processes.length > 0) {
      this.selectedIndex = (this.selectedIndex - 1 + this.processes.length) % this.processes.length;
      this.notify();
    }
  }

  getSelectedProcess(): ChildProcess | undefined {
    return this.processes[this.selectedIndex];
  }

  selectNextError(): void {
    const failed = this.getFailedProcesses();
    if (failed.length > 0) {
      this.selectedErrorIndex = (this.selectedErrorIndex + 1) % failed.length;
      this.notify();
    }
  }

  selectPrevError(): void {
    const failed = this.getFailedProcesses();
    if (failed.length > 0) {
      this.selectedErrorIndex = (this.selectedErrorIndex - 1 + failed.length) % failed.length;
      this.notify();
    }
  }

  getSelectedError(): ChildProcess | undefined {
    const failed = this.getFailedProcesses();
    return failed[this.selectedErrorIndex];
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
    const process = this.getProcess(this.expandedId);
    if (!process) return;

    const maxOffset = Math.max(0, process.lines.length - maxVisible);
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
    this.processes = [];
    this.completedIds = [];
    this.shouldExit = false;
    this.exitCallback = null;
    this.mode = 'normal';
    this.selectedIndex = 0;
    this.selectedErrorIndex = 0;
    this.expandedId = null;
    this.scrollOffset = 0;
    this.header = undefined;
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      l();
    });
  }
}

// Note: No global singleton - session creates its own store instance
