import 'core-js/actual/array/at.js';
import 'core-js/actual/object/has-own.js';
import 'core-js/actual/object/values.js';
import 'core-js/actual/string/replace-all.js';
import 'core-js/actual/string/trim-end.js';
if (typeof process.stdout.off === 'undefined') process.stdout.off = (name, fn) => process.stdout.removeListener(name, fn);
if (typeof process.stderr.off === 'undefined') process.stderr.off = (name, fn) => process.stderr.removeListener(name, fn);

// @ts-ignore
import * as ink from '../../assets/ink.cjs';
const { Box, Newline, Spacer, Static, Text, Transform, measureElement, render, useApp, useFocus, useFocusManager, useInput, useStderr, useStdin, useStdout, initialize } = ink.default || ink;

export { Box, Newline, Spacer, Static, Text, Transform, measureElement, render, useApp, useFocus, useFocusManager, useInput, useStderr, useStdin, useStdout, initialize };
