#!/usr/bin/env node

import path from 'path';
import url from 'url';
import spawn from 'cross-spawn-cb';
import Queue from 'queue-cb';
import resolve from 'resolve';
import { transformSync } from 'ts-swc-transform';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const cwd = process.cwd();
const dest = path.join(__dirname, '..', '..', '..', 'assets');

// https://github.com/sindresorhus/escape-string-regexp/blob/main/index.js#L8C1-L11C1
function escape(string) {
  return string
    .replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
    .replace(/-/g, '\\x2d');
}

const BUILDS = [
  {
    in: 'ink/build/index.js', out: 'ink.cjs',
    pre: path.join(__dirname, '..', 'assets', 'pre.js'),
    post: path.join(__dirname, '..', 'assets', 'post.js'),
    replacements: [
      { from: escape('await import'), to: '// await import' },
      {
        from: escape('let Yoga=await initYoga(await readFile(createRequire(import.meta.url).resolve("./yoga.wasm")));'),
        to: 'var Yoga = null; initYoga(require(\'fs\').readFileSync(require.resolve("yoga-wasm-web/dist/yoga.wasm"))).then(function (_Y) { Yoga = _Y });'
      },
      { from: escape('Intl.Segmenter'), to: 'IntlSegmenter' },
      {
        from: escape('export { Box as B, Newline as N, Static as S, Text as T, Transform as a, Spacer as b, useApp as c, useStdin as d, useStdout as e, useStderr as f, getDefaultExportFromCjs as g, useFocus as h, useFocusManager as i, measureElement as m, render as r, useInput as u };'),
        to: 'export { Box, Newline, Static, Text, Transform, Spacer, useApp, useStdin, useStdout, useStderr, getDefaultExportFromCjs, useFocus, useFocusManager, measureElement, render, useInput };'
      },
    ]
  }
];




import fs from 'fs';
function patch(build, callback) {
  try {
    const outPath = path.join(dest, build.out);
    const pre = build.pre ? fs.readFileSync(build.pre, 'utf8') : '';
    const post = build.post ? fs.readFileSync(build.post, 'utf8') : '';
    let content = fs.readFileSync(outPath, 'utf8');
    if (build.replacements) content = build.replacements.reduce((m, r) => m.replace(new RegExp(r.from, 'g'), r.to), content)
    const configPath = path.join(__dirname, '..', 'tsconfig.json');
    const res = transformSync(content, build.out, { path: configPath, config: JSON.parse(fs.readFileSync(configPath, 'utf8')) });
    fs.writeFileSync(outPath, pre + res.code + post, 'utf8');
    callback();
  } catch (err) {
    callback(err);
  }
}

function build(callback) {
  const config = path.join(__dirname, 'rollup.config.mjs');
  const queue = new Queue();
  BUILDS.forEach(build => {
    const args = ['--config', config, '--input', resolve.sync(build.in), '--dir', dest];
    queue.defer((cb) => spawn('rollup', args, { cwd: cwd, stdio: 'inherit' }, (err) => err ? cb(err) : patch(build, cb)))
  })
  queue.await(callback)
}

build((err) => {
  !err || console.error(err);
});