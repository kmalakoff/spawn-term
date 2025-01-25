import type { SpawnCallback, SpawnOptions, TerminalOptions } from './types';

function spawnTerminal(command: string, args: string[], spawnOptions: SpawnOptions, options?: TerminalOptions | SpawnCallback, callback?: SpawnCallback) {
  const worker = require('./worker.cjs');

  if (typeof options === 'function') {
    callback = options as SpawnCallback;
    options = {};
  }
  options = options || {};

  if (typeof callback === 'function') return worker(command, args, spawnOptions, options, callback);
  return new Promise((resolve, reject) => worker(command, args, spawnOptions, options, (err, result) => (err ? reject(err) : resolve(result))));
}

const major = +process.versions.node.split('.')[0];

export * from './types';
export { default as figures } from './lib/figures';
export default major > 10 ? spawnTerminal : undefined;
