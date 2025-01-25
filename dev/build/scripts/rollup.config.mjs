import { isBuiltin } from 'module'
import json from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';

const moduleRegEx = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/;
const externals = ['react'];

const stripBuiltins = () => ({
  name: 'stripBuiltins',
  resolveId: (specifier) => isBuiltin(specifier) ? { id: specifier.replace(/^node:/, ''), external: true } : null,
})

const replacements = {}
replacements['Intl.Segmenter'] = 'IntlSegmenter';
replacements['await import'] = '// await import';
replacements['import{readFile as E}from"node:fs/promises";import{createRequire as _}from"node:module";'] = '';
replacements['let Yoga=await a(await E(_(import.meta.url).resolve("./yoga.wasm")));'] = 'var Yoga = null; a(require(\'fs\').readFileSync(require.resolve("yoga-wasm-web/dist/yoga.wasm"))).then(function (_Y) { Yoga = _Y });';
replacements['export { Box as B, Newline as N, Static as S, Text as T, Transform as a, Spacer as b, useApp as c, useStdin as d, useStdout as e, useStderr as f, getDefaultExportFromCjs as g, useFocus as h, useFocusManager as i, measureElement as m, render as r, useInput as u };'] = 'export { Box, Newline, Static, Text, Transform, Spacer, useApp, useStdin, useStdout, useStderr, getDefaultExportFromCjs, useFocus, useFocusManager, measureElement, render, useInput };';
replacements['defaultIgnorableCodePointRegex'] = 'dicpregex';
// replacements['const defaultIgnorableCodePointRegex = /^\p{Default_Ignorable_Code_Point}$/u;'] = 'var dicpregex; try { dicpregex = RegExp("^\\p{Default_Ignorable_Code_Point}$", "u"); } catch(_) { RegExp("^\\p{Default_Ignorable_Code_Point}$", "g"); }';

const escape = (string) => string.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
const replace = (replacements) => ({
  name: 'replace',
  transform: (code) => Object.keys(replacements).reduce((m, r) => m.replace(new RegExp(escape(r), 'g'), replacements[r]), code)
})

export default {
  output: {
    format: 'es',
    chunkFileNames: (chunkInfo) => {
      if (chunkInfo.name === 'index') return 'ink.cjs'
      if (chunkInfo.name === 'devtools') return 'devtools.mjs'
      return '[name].[hash].mjs'
    }
  },
  external: (id) => moduleRegEx.test(id) ? externals.indexOf(id) >= 0 : false,
  plugins: [replace(replacements), resolve(), stripBuiltins(), json(), commonjs()],
};
