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

const BUILDS = [
  {
    in: 'ink/build/index.js', out: 'ink.cjs',
    pre: path.join(__dirname, '..', 'assets', 'pre.js'),
    post: path.join(__dirname, '..', 'assets', 'post.js')
  },
  {
    in: 'unicode-segmenter/intl-adapter.cjs', out: 'intl-adapter.cjs',
    post: path.join(__dirname, '..', 'assets', 'post.js'),
  }
];

import fs from 'fs';
function patch(build, callback) {
  try {
    const outPath = path.join(dest, build.out);
    const pre = build.pre ? fs.readFileSync(build.pre, 'utf8') : '';
    const post = build.post ? fs.readFileSync(build.post, 'utf8') : '';
    let content = fs.readFileSync(outPath, 'utf8');
    const configPath = path.join(__dirname, '..', 'tsconfig.json');
    const res = transformSync(content, build.out, { path: configPath, config: JSON.parse(fs.readFileSync(configPath, 'utf8')) });

    // special case START
    (() => {
      const search = 'var dicpregex = RegExp("\^\\\\p{Default_Ignorable_Code_Point}$", "u");';
      const replace = 'var dicpregex; try { dicpregex = RegExp("^\\p{Default_Ignorable_Code_Point}$", "u"); } catch(_) { dicpregex = RegExp("^\\p{Default_Ignorable_Code_Point}$", "g"); }'
      const start = res.code.indexOf(search);
      if (start > 0) res.code = res.code.replace(search, replace);
    })();
    (() => {
      const search = 'var Yoga = null;\nloadYoga().then(function(_Y) {\n    Yoga = wrapAssembly(_Y);\n    _notifyInitialized();\n});\nvar Yoga$1 = Yoga;'
      const replace = 'var Yoga$1 = null;\nloadYoga().then(function(_Y) {\n    Yoga$1 = wrapAssembly(_Y);\n    _notifyInitialized();\n});';
      const start = res.code.indexOf(search);
      if (start > 0) res.code = res.code.replace(search, replace);
    })();
    // special case END

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
    const args = ['--config', config, '--input', resolve.sync(build.in), '--file', path.join(dest, build.out)];
    queue.defer((cb) => spawn('rollup', args, { cwd: cwd, stdio: 'inherit' }, (err) => err ? cb(err) : patch(build, cb)))
  })
  queue.await(callback)
}

build((err) => {
  !err || console.error(err);
});