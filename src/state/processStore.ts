import type { ChildProcess, Line } from '../types.ts';
import { LineType } from '../types.ts';

type Listener = () => void;
type Mode = 'normal' | 'errorList' | 'errorDetail';

class ProcessStore {
  private processes: ChildProcess[] = [];
  private completedIds: string[] = []; // Track completion order
  private listeners = new Set<Listener>();
  private shouldExit = false;
  private exitCallback: (() => void) | null = null;

  // UI state
  private mode: Mode = 'normal';
  private selectedErrorIndex = 0;

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
  getDoneCount = (): number => this.processes.filter((p) => p.state !== 'running').length;
  getErrorCount = (): number => this.processes.filter((p) => p.state === 'error').length;
  getErrorLineCount = (): number => {
    return this.processes.filter((p) => p.state === 'error').reduce((total, p) => total + p.lines.filter((l) => l.type === LineType.stderr).length, 0);
  };

  // UI state getters
  getMode = (): Mode => this.mode;
  getSelectedErrorIndex = (): number => this.selectedErrorIndex;

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
    if (mode === 'errorList') {
      this.selectedErrorIndex = 0;
    }
    this.notify();
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
    this.selectedErrorIndex = 0;
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      l();
    });
  }
}

export const processStore = new ProcessStore();
export type { ProcessStore };
