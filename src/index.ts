import worker from './worker.js';

import type { SpawnCallback, SpawnOptions, TerminalOptions } from './types.js';

export * from './types.js';
export default function spawnTerminal(command: string, args: string[], spawnOptions: SpawnOptions, options?: TerminalOptions | SpawnCallback, callback?: SpawnCallback) {
  if (typeof options === 'function') {
    callback = options as SpawnCallback;
    options = {};
  }
  options = options || {};

  if (typeof callback === 'function') return worker(command, args, spawnOptions, options, callback);
  return new Promise((resolve, reject) => worker(command, args, spawnOptions, options, (err, result) => (err ? reject(err) : resolve(result))));
}
