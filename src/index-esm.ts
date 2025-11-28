export { default as figures } from './lib/figures.ts';
export { default as formatArguments } from './lib/formatArguments.ts';
export * from './types.ts';

const major = +process.versions.node.split('.')[0];

import { default as spawnTerminal } from './spawnTerminal.ts';
export default major > 18 ? spawnTerminal : (undefined as typeof spawnTerminal);
