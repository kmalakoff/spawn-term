/**
 * Compatibility Layer for Node.js 0.8+
 * Local to this package - contains only needed functions.
 */

import Module from 'module';

const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;

/**
 * Stream compatibility - Transform class
 * - Uses native stream.Transform on Node 0.10+
 * - Falls back to readable-stream for Node 0.8
 */
const major = +process.versions.node.split('.')[0];
export const Readable: typeof import('stream').Readable = major > 0 ? _require('stream').Readable : _require('readable-stream').Readable;
export const Writable: typeof import('stream').Writable = major > 0 ? _require('stream').Writable : _require('readable-stream').Writable;
export const Transform: typeof import('stream').Transform = major > 0 ? _require('stream').Transform : _require('readable-stream').Transform;
export const PassThrough: typeof import('stream').PassThrough = major > 0 ? _require('stream').PassThrough : _require('readable-stream').PassThrough;

/**
 * String.prototype.endsWith wrapper for Node.js 0.8+
 * - Uses native endsWith on Node 4.0+ / ES2015+
 * - Falls back to lastIndexOf on Node 0.8-3.x
 */
const hasEndsWith = typeof String.prototype.endsWith === 'function';
export function stringEndsWith(str: string, search: string, position?: number): boolean {
  if (hasEndsWith) return str.endsWith(search, position);
  const len = position === undefined ? str.length : position;
  return str.lastIndexOf(search) === len - search.length;
}

/**
 * Array.prototype.find wrapper for Node.js 0.8+
 * - Uses native find on Node 4.0+ / ES2015+
 * - Falls back to loop on Node 0.8-3.x
 */
const hasArrayFind = typeof Array.prototype.find === 'function';

export function arrayFind<T>(arr: T[], predicate: (item: T, index: number, arr: T[]) => boolean): T | undefined {
  if (hasArrayFind) {
    return arr.find(predicate);
  }
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i], i, arr)) return arr[i];
  }
  return undefined;
}
