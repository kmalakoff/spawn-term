import json from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import externals from 'rollup-plugin-node-externals';

const include = ['react', 'react-devtools-core', 'yoga-wasm-web'];

export default {
  output: {
    format: 'es',
    chunkFileNames: (chunkInfo) => {
      if (chunkInfo.name === 'index') return 'ink.cjs'
      if (chunkInfo.name === 'devtools') return 'devtools.mjs'
      return '[name].[hash].mjs'
    }
  },
  plugins: [resolve(), json(), commonjs(), externals({ deps: false, devDeps: false, builtinsPrefix: 'strip', include })],
};
