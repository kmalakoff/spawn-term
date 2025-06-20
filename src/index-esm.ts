import type { SpawnOptions, SpawnResult, TerminalCallback, TerminalOptions } from './types.js';

function worker(command: string, args: string[], spawnOptions: SpawnOptions, options: TerminalOptions, callback: TerminalCallback): undefined {
  import('./worker.js')
    .then((fn) => {
      fn.default(command, args, spawnOptions, options, callback);
    })
    .catch(callback);
}

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

export { default as figures } from './lib/figures.js';
export { default as formatArguments } from './lib/formatArguments.js';
export * from './types.js';
export default major > 14 ? spawnTerminal : undefined;
