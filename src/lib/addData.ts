import { Writable } from 'readable-stream';

export default function addLines(fn) {
  const stream = new Writable({
    write(data, _enc, callback) {
      fn(data);
      callback();
    },
  });
  return stream;
}
