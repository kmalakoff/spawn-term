import { Writable } from 'stream';

export type Callback = (lines: Buffer) => undefined;

export default function concatWritable(callback: Callback): Writable {
  const chunks = [];
  const stream = new Writable({
    write: (chunk, _encoding, next) => {
      chunks.push(chunk);
      next();
    },
  });
  stream.on('finish', () => callback(Buffer.concat(chunks.splice(0))));
  return stream;
}
