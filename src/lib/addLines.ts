import newlineIterator from 'newline-iterator';
import { Writable } from 'readable-stream';

export default function addLines(fn) {
  let last = '';

  const stream = new Writable({
    write(chunk, _enc, callback) {
      const string = last + chunk.toString('utf8');

      const lines = [];
      const iterator = newlineIterator(string);
      let next = iterator.next();
      while (!next.done) {
        lines.push(next.value);
        next = iterator.next();
      }

      last = lines.pop();
      if (lines.length > 0) fn(lines);
      callback();
    },
  });
  stream.on('finish', () => {
    if (last.length) fn([last]);
    last = '';
  });
  return stream;
}
