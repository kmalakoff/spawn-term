import { Writable } from 'stream';
import { BATCH_MAX_LINES, BATCH_MAX_WAIT_MS } from '../constants.ts';

const REGEX_NEW_LINE = /\r?\n|\r/g;

export type Callback = (lines: string[]) => undefined;

interface BatchOptions {
  maxLines?: number;
  maxWait?: number;
}

export default function addLines(fn: Callback, options: BatchOptions = {}): Writable {
  const { maxLines = BATCH_MAX_LINES, maxWait = BATCH_MAX_WAIT_MS } = options;

  let last = '';
  let lineBuffer: string[] = [];
  let flushTimer: NodeJS.Timeout | null = null;

  const flush = () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (lineBuffer.length > 0) {
      fn(lineBuffer);
      lineBuffer = [];
    }
  };

  const scheduleFlush = () => {
    if (!flushTimer) {
      flushTimer = setTimeout(flush, maxWait);
    }
  };

  const stream = new Writable({
    write(chunk, _enc, callback) {
      const more = last + chunk.toString('utf8');
      const lines = more.split(REGEX_NEW_LINE);
      last = lines.pop();

      if (lines.length > 0) {
        lineBuffer.push(...lines);

        // Flush immediately if buffer is large enough
        if (lineBuffer.length >= maxLines) {
          flush();
        } else {
          scheduleFlush();
        }
      }
      callback();
    },
  });

  stream.on('finish', () => {
    // Flush any remaining buffered lines
    if (last.length) lineBuffer.push(last);
    flush();
    last = '';
  });

  return stream;
}
