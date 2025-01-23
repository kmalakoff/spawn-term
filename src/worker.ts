// @ts-ignore
import spawn, { crossSpawn, type SpawnResult } from 'cross-spawn-cb';
import oo from 'on-one';
import Queue from 'queue-cb';

import createApp from './createApp.js';
import addLines from './lib/addLines.js';
import concatWritable from './lib/concatWritable.js';

import type { SpawnOptions, TerminalOptions } from './types.js';
import { LineType } from './types.js';

const terminal = createApp();

import throttle from 'lodash.throttle';
const THROTTLE = 100;
const rerender = throttle(() => {
  terminal.rerender();
}, THROTTLE);

export default function spawnTerminal(command: string, args: string[], spawnOptions: SpawnOptions, _options: TerminalOptions, callback) {
  const { encoding, stdio, ...csOptions } = spawnOptions;

  terminal.retain();
  const item = terminal.addItem({ title: [command].concat(args).join(' '), state: 'running' });
  terminal.rerender();

  const cp = crossSpawn(command, args, csOptions);
  const outputs = { stdout: null, stderr: null };

  if (cp.stdout && process.stdout.getMaxListeners) {
    process.stdout.setMaxListeners(process.stdout.getMaxListeners() + 1);
    process.stderr.setMaxListeners(process.stderr.getMaxListeners() + 1);
  }

  const queue = new Queue();
  if (cp.stdout) {
    if (stdio === 'inherit') {
      outputs.stdout = addLines((text) => {
        item.lines.push({ type: LineType.stdout, text });
        rerender();
      });
    } else {
      outputs.stdout = concatWritable((output) => {
        outputs.stdout.output = output.toString(encoding || 'utf8');
      });
    }
    queue.defer(oo.bind(null, cp.stdout.pipe(outputs.stdout), ['error', 'end', 'close', 'finish']));
  }
  if (cp.stderr) {
    if (stdio === 'inherit') {
      outputs.stderr = addLines((text) => {
        item.lines.push({ type: LineType.stderr, text });
        rerender();
      });
      cp.stderr.pipe(outputs.stderr);
    } else {
      outputs.stderr = concatWritable((output) => {
        outputs.stderr.output = output.toString(encoding || 'utf8');
      });
    }
    queue.defer(oo.bind(null, cp.stderr.pipe(outputs.stderr), ['error', 'end', 'close', 'finish']));
  }
  queue.defer(spawn.worker.bind(null, cp, { ...csOptions, encoding: 'utf8' }));
  queue.await((err) => {
    if (cp.stdout && process.stdout.getMaxListeners) {
      process.stdout.setMaxListeners(process.stdout.getMaxListeners() - 1);
      process.stderr.setMaxListeners(process.stderr.getMaxListeners() - 1);
    }

    const res = (err ? err : {}) as SpawnResult;
    res.stdout = outputs.stdout ? outputs.stdout.output : null;
    res.stderr = outputs.stderr ? outputs.stderr.output : null;
    res.output = [res.stdout, res.stderr, null];
    item.state = err ? 'error' : 'success';
    terminal.rerender();
    terminal.release();
    err ? callback(err) : callback(null, res);
  });
}
