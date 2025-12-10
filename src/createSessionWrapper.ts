import type { ProcessOptions, SessionOptions, SpawnError, SpawnOptions, TerminalCallback } from './types.ts';

export interface Session {
  spawn(command: string, args: string[], spawnOptions: SpawnOptions, options: ProcessOptions, callback: TerminalCallback): void;
  close(): void;
  waitAndClose(callback?: () => void): void;
}

export function createSession(options?: SessionOptions): Session {
  let realSession: Session | null = null;
  let loadError: Error | null = null;
  let loading: Promise<Session> | null = null;

  function getSession(): Promise<Session> {
    if (realSession) return Promise.resolve(realSession);
    if (loadError) return Promise.reject(loadError);
    if (loading) return loading;

    loading = import('./lib/loadInk.ts')
      .then((mod) => {
        return new Promise<Session>((resolve, reject) => {
          mod.loadInk((err) => {
            if (err) {
              loadError = err;
              loading = null;
              return reject(err);
            }
            import('./session.ts')
              .then((sessionMod) => {
                realSession = sessionMod.createSession(options);
                resolve(realSession);
              })
              .catch((err) => {
                loadError = err;
                loading = null;
                reject(err);
              });
          });
        });
      })
      .catch((err) => {
        loadError = err;
        loading = null;
        throw err;
      });

    return loading;
  }

  // Start loading immediately in background
  getSession().catch(() => {});

  return {
    spawn(command: string, args: string[], spawnOptions: SpawnOptions, processOptions: ProcessOptions, callback: TerminalCallback): void {
      getSession()
        .then((session) => {
          session.spawn(command, args, spawnOptions, processOptions, callback);
        })
        .catch((err) => {
          callback(err as SpawnError);
        });
    },
    close(): void {
      if (realSession) realSession.close();
    },
    waitAndClose(callback?: () => void): void {
      getSession()
        .then((session) => {
          session.waitAndClose(callback);
        })
        .catch(() => {
          callback?.();
        });
    },
  };
}
