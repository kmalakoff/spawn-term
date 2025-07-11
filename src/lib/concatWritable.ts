import Stream from 'stream';

const Writable = Stream.Writable;

export type Callback = (lines: Buffer) => undefined;

export default function concatWritable(callback: Callback): NodeJS.WritableStream {
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
