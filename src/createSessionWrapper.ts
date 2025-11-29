import type { ProcessOptions, SessionOptions, SpawnError, SpawnOptions, TerminalCallback } from './types.ts';

export interface Session {
  spawn(command: string, args: string[], spawnOptions: SpawnOptions, options: ProcessOptions, callback: TerminalCallback): void;
  close(): void;
  waitAndClose(callback?: () => void): void;
}

export function createSession(options?: SessionOptions): Session {
  let realSession: Session | null = null;
  let loadError: SpawnError | null = null;

  // Start loading immediately
  import('./session.ts')
    .then((mod) => {
      realSession = mod.createSession(options);
    })
    .catch((err) => {
      loadError = err;
    });

  return {
    spawn(command: string, args: string[], spawnOptions: SpawnOptions, processOptions: ProcessOptions, callback: TerminalCallback): void {
      if (loadError) {
        callback(loadError);
        return;
      }
      if (realSession) {
        realSession.spawn(command, args, spawnOptions, processOptions, callback);
        return;
      }
      // Still loading, wait for it
      import('./session.ts')
        .then((mod) => {
          if (!realSession) realSession = mod.createSession(options);
          realSession.spawn(command, args, spawnOptions, processOptions, callback);
        })
        .catch(callback);
    },
    close(): void {
      if (realSession) realSession.close();
    },
    waitAndClose(callback?: () => void): void {
      if (realSession) {
        realSession.waitAndClose(callback);
        return;
      }
      // Still loading, wait for it
      import('./session.ts')
        .then((mod) => {
          if (!realSession) realSession = mod.createSession(options);
          realSession.waitAndClose(callback);
        })
        .catch(() => {
          callback?.();
        });
    },
  };
}
