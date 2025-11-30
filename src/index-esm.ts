export { default as figures } from './lib/figures.ts';
export { default as formatArguments } from './lib/formatArguments.ts';
export { TerminalBuffer } from './lib/TerminalBuffer.ts';
export * from './types.ts';

import type { createSession as createSessionType, Session } from './createSessionWrapper.ts';
export type { Session };

const major = +process.versions.node.split('.')[0];

import { createSession as createSessionImpl } from './createSessionWrapper.ts';
export const createSession = major > 18 ? createSessionImpl : (undefined as typeof createSessionType);
