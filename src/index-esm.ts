import worker from './worker.js';

import type { SpawnOptions, SpawnResult, TerminalCallback, TerminalOptions } from './types.js';

function spawnTerminal(command: string, args: string[], spawnOptions: SpawnOptions, options?: TerminalOptions | TerminalCallback, callback?: TerminalCallback): undefined | Promise<SpawnResult> {
  if (typeof options === 'function') {
    callback = options as TerminalCallback;
    options = {};
  }
  options = options || {};

  if (typeof callback === 'function') return worker(command, args, spawnOptions, options, callback as TerminalCallback);
  return new Promise((resolve, reject) =>
    worker(command, args, spawnOptions, options, (err, result) => {
      err ? reject(err) : resolve(result);
    })
  );
}

const major = +process.versions.node.split('.')[0];

export * from './types.js';
export { default as figures } from './lib/figures.js';
export { default as formatArguments } from './lib/formatArguments.js';
export default major > 10 ? spawnTerminal : undefined;
