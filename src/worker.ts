// @ts-ignore
import spawn, { crossSpawn, type SpawnResult } from 'cross-spawn-cb';
import uuid from 'lil-uuid';
import oo from 'on-one';
import Queue from 'queue-cb';

import createApp from './createApp';
import addLines from './lib/addLines';
import concatWritable from './lib/concatWritable';
import formatArguments from './lib/formatArguments';

import type { SpawnOptions, TerminalOptions } from './types';
import { LineType } from './types';

const terminal = createApp();

export default function spawnTerminal(command: string, args: string[], spawnOptions: SpawnOptions, options: TerminalOptions, callback) {
  const { encoding, stdio, ...csOptions } = spawnOptions;

  if (stdio === 'inherit') {
    terminal.retain((store) => {
      const id = uuid();
      store.getState().addProcess({ id, title: [command].concat(formatArguments(args)).join(' '), state: 'running', lines: [], ...options });

      const cp = crossSpawn(command, args, csOptions);
      const outputs = { stdout: null, stderr: null };

      const queue = new Queue();
      if (cp.stdout) {
        outputs.stdout = addLines((texts) => {
          const item = store.getState().processes.find((x) => x.id === id);
          const lines = item.lines.concat(texts.map((text) => ({ type: LineType.stdout, text })));
          store.getState().updateProcess({ ...item, lines });
        });
        queue.defer(oo.bind(null, cp.stdout.pipe(outputs.stdout), ['error', 'end', 'close', 'finish']));
      }
      if (cp.stderr) {
        outputs.stderr = addLines((texts) => {
          const item = store.getState().processes.find((x) => x.id === id);
          const lines = item.lines.concat(texts.map((text) => ({ type: LineType.stderr, text })));
          store.getState().updateProcess({ ...item, lines });
        });
        queue.defer(oo.bind(null, cp.stderr.pipe(outputs.stderr), ['error', 'end', 'close', 'finish']));
      }
      queue.defer(spawn.worker.bind(null, cp, { ...csOptions, encoding: 'utf8' }));
      queue.await((err) => {
        const res = (err ? err : {}) as SpawnResult;
        res.stdout = outputs.stdout ? outputs.stdout.output : null;
        res.stderr = outputs.stderr ? outputs.stderr.output : null;
        res.output = [res.stdout, res.stderr, null];
        const item = store.getState().processes.find((x) => x.id === id);
        store.getState().updateProcess({ ...item, state: err ? 'error' : 'success' });

        // let rendering complete
        setTimeout(() => {
          terminal.release();
          err ? callback(err) : callback(null, res);
        });
      });
    });
  } else {
    const cp = crossSpawn(command, args, csOptions);
    const outputs = { stdout: null, stderr: null };

    const queue = new Queue();
    if (cp.stdout) {
      outputs.stdout = concatWritable((output) => {
        outputs.stdout.output = output.toString(encoding || 'utf8');
      });
      queue.defer(oo.bind(null, cp.stdout.pipe(outputs.stdout), ['error', 'end', 'close', 'finish']));
    }
    if (cp.stderr) {
      outputs.stderr = concatWritable((output) => {
        outputs.stderr.output = output.toString(encoding || 'utf8');
      });
      queue.defer(oo.bind(null, cp.stderr.pipe(outputs.stderr), ['error', 'end', 'close', 'finish']));
    }
    queue.defer(spawn.worker.bind(null, cp, { ...csOptions, encoding: encoding || 'utf8' }));
    queue.await((err) => {
      const res = (err ? err : {}) as SpawnResult;
      res.stdout = outputs.stdout ? outputs.stdout.output : null;
      res.stderr = outputs.stderr ? outputs.stderr.output : null;
      res.output = [res.stdout, res.stderr, null];
      err ? callback(err) : callback(null, res);
    });
  }
}
