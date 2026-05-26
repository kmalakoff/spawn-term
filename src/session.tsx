import spawn, { crossSpawn, type SpawnResult } from 'cross-spawn-cb';
import crypto from 'crypto';
import { render } from 'ink';
import oo from 'on-one';
import Queue from 'queue-cb';

import App from './components/App.ts';
import { DEFAULT_MAX_FPS } from './constants.ts';
import concatWritable from './lib/concatWritable.ts';
import formatArguments from './lib/formatArguments.ts';
import { TerminalBuffer } from './lib/TerminalBuffer.ts';
import { ProcessStore } from './state/processStore.ts';
import type { ProcessOptions, SessionOptions, SpawnError, SpawnOptions, TerminalCallback } from './types.ts';

export interface Session {
  spawn(command: string, args: string[], spawnOptions: SpawnOptions, options: ProcessOptions, callback: TerminalCallback): void;
  close(): void;
  waitAndClose(callback?: () => void): void;
}

class SessionImpl implements Session {
  private store: ProcessStore;
  private inkApp: ReturnType<typeof render> | null = null;
  private runningCount = 0;
  private closed = false;
  private waitCallbacks: (() => void)[] = [];
  private isInteractive: boolean;
  private terminalWidth: number;

  constructor(options: SessionOptions = {}) {
    this.store = new ProcessStore(options);
    // Use a very wide buffer to prevent line wrapping in xterm
    // Actual display truncation is handled by Ink components
    this.terminalWidth = 10000;

    // Only render Ink when stdout is a real terminal
    // When piped (e.g., nested spawn-term), skip Ink to avoid cursor positioning artifacts
    this.inkApp = render(<App store={this.store} />, { maxFps: DEFAULT_MAX_FPS });

    // Interactive mode requires a real TTY for user input (e.g., press 'q' to quit)
    // Without a TTY, there's no way to receive keyboard input, so auto-exit when complete
    this.isInteractive = process.stdout.isTTY ? (options.interactive ?? false) : false;
  }

  spawn(command: string, args: string[], spawnOptions: SpawnOptions, options: ProcessOptions, callback: TerminalCallback): void {
    if (this.closed) {
      throw new Error('Session is closed');
    }

    const { encoding, stdio, ...csOptions } = spawnOptions;

    if (stdio === 'inherit') {
      // When Ink is not rendering (stdout not a TTY), pass output directly to stdout
      if (!this.inkApp) {
        const cp = crossSpawn(command, args, { ...csOptions, stdio: 'inherit' });
        spawn.worker(cp, csOptions, (err?: SpawnError) => {
          const res = (err ? err : {}) as SpawnResult;
          res.stdout = null as unknown as string | Buffer;
          res.stderr = null as unknown as string | Buffer;
          res.output = [null, null, null];
          err ? callback(err) : callback(undefined, res);
        });
        return;
      }

      this.runningCount++;
      const id = crypto.randomUUID();

      // Create terminal buffer for ANSI sequence interpretation
      const terminalBuffer = new TerminalBuffer(this.terminalWidth);

      this.store.addProcess({
        id,
        title: [command].concat(formatArguments(args)).join(' '),
        state: 'running',
        lines: [],
        terminalBuffer,
        group: options.group,
        expanded: options.expanded,
      });

      const cp = crossSpawn(command, args, csOptions);

      // Pipe stdout and stderr directly to terminal buffer
      // Both streams go to the same buffer to maintain correct ordering
      if (cp.stdout) {
        cp.stdout.on('data', (chunk: Buffer) => {
          terminalBuffer.write(chunk);
          this.store.notify();
        });
      }
      if (cp.stderr) {
        cp.stderr.on('data', (chunk: Buffer) => {
          terminalBuffer.write(chunk);
          this.store.notify();
        });
      }

      // Wait for process to complete
      const queue = new Queue();
      if (cp.stdout) {
        const stdout = cp.stdout;
        queue.defer((cb) => oo(stdout, ['error', 'end', 'close'], (err: Error | null) => cb(err)));
      }
      if (cp.stderr) {
        const stderr = cp.stderr;
        queue.defer((cb) => oo(stderr, ['error', 'end', 'close'], (err: Error | null) => cb(err)));
      }
      queue.defer(spawn.worker.bind(null, cp, csOptions));
      queue.await((err?: Error | null) => {
        const spawnErr = err as SpawnError | null;
        const res = (spawnErr ? spawnErr : {}) as SpawnResult;
        res.stdout = null as unknown as string | Buffer;
        res.stderr = null as unknown as string | Buffer;
        res.output = [null, null, null];
        this.store.updateProcess(id, { state: spawnErr ? 'error' : 'success' });

        this.onProcessComplete();
        spawnErr ? callback(spawnErr) : callback(undefined, res);
      });
    } else {
      // Non-inherit mode: collect output but don't display in UI
      const cp = crossSpawn(command, args, csOptions);
      const outputs = { stdout: null as ReturnType<typeof concatWritable> | null, stderr: null as ReturnType<typeof concatWritable> | null };

      const queue = new Queue();
      if (cp.stdout) {
        const cpStdout = cp.stdout;
        const stdoutHandle = concatWritable((output) => {
          (outputs.stdout as unknown as { output: string }).output = output.toString(encoding || 'utf8');
        });
        outputs.stdout = stdoutHandle;
        queue.defer((cb) => oo(cpStdout.pipe(stdoutHandle), ['error', 'end', 'close', 'finish'], (err: Error | null) => cb(err)));
      }
      if (cp.stderr) {
        const cpStderr = cp.stderr;
        const stderrHandle = concatWritable((output) => {
          (outputs.stderr as unknown as { output: string }).output = output.toString(encoding || 'utf8');
        });
        outputs.stderr = stderrHandle;
        queue.defer((cb) => oo(cpStderr.pipe(stderrHandle), ['error', 'end', 'close', 'finish'], (err: Error | null) => cb(err)));
      }
      queue.defer(spawn.worker.bind(null, cp, csOptions));
      queue.await((err?: Error | null) => {
        const spawnErr = err as SpawnError | null;
        const res = (spawnErr ? spawnErr : {}) as SpawnResult;
        res.stdout = (outputs.stdout ? (outputs.stdout as unknown as { output: string }).output : null) as string | Buffer;
        res.stderr = (outputs.stderr ? (outputs.stderr as unknown as { output: string }).output : null) as string | Buffer;
        res.output = [res.stdout, res.stderr, null];
        spawnErr ? callback(spawnErr) : callback(undefined, res);
      });
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.cleanup();
  }

  waitAndClose(callback?: () => void): void {
    if (this.closed) {
      callback?.();
      return;
    }

    if (callback) this.waitCallbacks.push(callback);

    if (this.runningCount === 0) {
      if (this.isInteractive) {
        // In interactive mode, wait for user to quit (press 'q')
        const unsubscribe = this.store.subscribe(() => {
          if (this.store.getShouldExit()) {
            unsubscribe();
            this.closeAndCallWaitCallbacks();
          }
        });
      } else {
        this.closeAndCallWaitCallbacks();
      }
    }
    // If runningCount > 0, will close when it hits 0 in onProcessComplete
  }

  private onProcessComplete(): void {
    this.runningCount--;
    if (this.runningCount === 0 && this.waitCallbacks.length > 0) {
      if (this.isInteractive) {
        // In interactive mode, wait for user to quit (press 'q')
        const unsubscribe = this.store.subscribe(() => {
          if (this.store.getShouldExit()) {
            unsubscribe();
            this.closeAndCallWaitCallbacks();
          }
        });
      } else {
        this.closeAndCallWaitCallbacks();
      }
    }
  }

  private closeAndCallWaitCallbacks(): void {
    if (this.closed) return;
    this.closed = true;
    this.cleanup(() => {
      for (const cb of this.waitCallbacks) cb();
      this.waitCallbacks = [];
    });
  }

  private cleanup(onComplete?: () => void): void {
    // Signal exit to React component
    this.store.signalExit(() => {
      this.store.reset();
      process.stdout.write('\x1b[?25h'); // show cursor
    });

    // Wait for Ink to finish
    if (this.inkApp) {
      this.inkApp
        .waitUntilExit()
        .then(() => {
          const cb = this.store.getExitCallback();
          cb?.();
          onComplete?.();
        })
        .catch(() => {
          const cb = this.store.getExitCallback();
          cb?.();
          onComplete?.();
        });
      this.inkApp = null;
    } else {
      onComplete?.();
    }
  }
}

export function createSession(options: SessionOptions = {}): Session {
  return new SessionImpl(options);
}
