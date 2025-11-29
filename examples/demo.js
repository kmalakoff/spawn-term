#!/usr/bin/env node
/**
 * Demo script to visually test spawn-term UI
 *
 * Run with: node examples/demo.js
 *
 * This spawns multiple processes with different timings and outcomes:
 * - Some succeed quickly
 * - Some succeed after a delay
 * - Some fail with stderr output
 *
 * Press 'e' to view error list when errors exist
 * Use arrow keys to navigate, Enter to view details, Esc to go back
 */

import spawnTerminal from '../dist/esm/index-esm.js';

const NODE = process.platform === 'win32' ? 'node.exe' : 'node';

// Spawn multiple processes with different timings and outcomes
async function main() {
  console.log('Starting demo - spawning multiple processes...\n');

  const processes = [
    // Quick success
    {
      args: ['-e', 'console.log("Build complete!")'],
      options: { group: 'Build' },
    },
    // Medium success with output
    {
      args: [
        '-e',
        `
        console.log("Installing dependencies...");
        setTimeout(() => {
          console.log("Installed 150 packages");
          console.log("Done!");
        }, 1500);
      `,
      ],
      options: { group: 'Install' },
    },
    // Longer success
    {
      args: [
        '-e',
        `
        console.log("Running lint...");
        setTimeout(() => {
          console.log("Checked 42 files");
          console.log("No issues found");
        }, 2000);
      `,
      ],
      options: { group: 'Lint' },
    },
    // Failure case 1
    {
      args: [
        '-e',
        `
        console.log("Running tests...");
        setTimeout(() => {
          console.error("FAIL src/utils.test.js");
          console.error("  ● sum › should add two numbers");
          console.error("    expect(received).toBe(expected)");
          console.error("    Expected: 4");
          console.error("    Received: 5");
          console.error("");
          console.error("Tests: 1 failed, 12 passed, 13 total");
          process.exit(1);
        }, 2500);
      `,
      ],
      options: { group: 'Test' },
    },
    // Very quick success
    {
      args: ['-e', 'console.log("Types OK")'],
      options: { group: 'TypeCheck' },
    },
    // Another failure
    {
      args: [
        '-e',
        `
        setTimeout(() => {
          console.error("Error: Cannot find module 'missing-package'");
          console.error("    at require (internal/modules/cjs/loader.js:999:19)");
          console.error("    at Object.<anonymous> (src/index.js:1:15)");
          process.exit(1);
        }, 1800);
      `,
      ],
      options: { group: 'Server' },
    },
    // Medium success
    {
      args: [
        '-e',
        `
        console.log("Bundling...");
        setTimeout(() => {
          console.log("Bundle size: 145kb (gzip: 42kb)");
        }, 3000);
      `,
      ],
      options: { group: 'Bundle' },
    },
  ];

  // Spawn all processes
  const promises = processes.map(({ args, options }) => spawnTerminal(NODE, args, { stdio: 'inherit' }, options).catch(() => {}));

  // Wait for all to complete
  await Promise.all(promises);

  console.log('\nDemo complete! All processes finished.');
}

main().catch(console.error);
