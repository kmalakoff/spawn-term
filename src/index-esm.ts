export { default as figures } from './lib/figures.js';
export { default as formatArguments } from './lib/formatArguments.js';
export * from './types.js';

const major = +process.versions.node.split('.')[0];

import { default as spawnTerminal } from './spawnTerminal.js';
export default major > 14 ? spawnTerminal : (undefined as typeof spawnTerminal);
