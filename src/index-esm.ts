export { default as figures } from './lib/figures.ts';
export { default as formatArguments } from './lib/formatArguments.ts';
export * from './types.ts';

const major = +process.versions.node.split('.')[0];

import { createSession as createSessionImpl, type Session } from './session.ts';
export type { Session };
export const createSession = major > 18 ? createSessionImpl : (undefined as typeof createSessionImpl);
