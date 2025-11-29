import type { ChildProcess, Line } from '../types.ts';

type Listener = () => void;

class ProcessStore {
  private processes: ChildProcess[] = [];
  private listeners = new Set<Listener>();
  private shouldExit = false;
  private exitCallback: (() => void) | null = null;

  // useSyncExternalStore API
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ChildProcess[] => this.processes;

  // Mutations - Ink handles render throttling at 30 FPS
  addProcess(process: ChildProcess): void {
    this.processes = [...this.processes, process];
    this.notify();
  }

  updateProcess(id: string, update: Partial<ChildProcess>): void {
    this.processes = this.processes.map((p) => (p.id === id ? { ...p, ...update } : p));
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
    this.shouldExit = false;
    this.exitCallback = null;
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      l();
    });
  }
}

export const processStore = new ProcessStore();
export type { ProcessStore };
