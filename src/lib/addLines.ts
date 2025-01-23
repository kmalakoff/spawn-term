import { Writable } from 'readable-stream';

const regEx = /\r\n|[\n\v\f\r\x85\u2028\u2029]/g;

export default function addLines(addLine) {
  let last = '';

  const stream = new Writable({
    write(chunk, _enc, callback) {
      const more = last + chunk.toString('utf8');
      const lines = more.split(regEx);
      last = lines.pop();
      lines.forEach((line) => addLine(line));
      callback();
    },
  });
  stream.on('finish', () => {
    if (last.length) addLine(last);
    last = '';
  });
  return stream;
}
