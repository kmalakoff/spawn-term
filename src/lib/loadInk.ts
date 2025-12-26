import fs from 'fs';
import installModule from 'install-module-linked';
import path from 'path';
import url from 'url';

// Get the node_modules directory relative to this file
const _dirname = path.dirname(typeof __filename === 'undefined' ? url.fileURLToPath(import.meta.url) : __filename);
const nodeModules = path.join(_dirname, '..', '..', '..', 'node_modules');

let installed = false;
let installing: Promise<void> | null = null;

function installDependency(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // install-module-linked will:
    // 1. Check if module exists locally or in ~/.iml cache
    // 2. If not, install to ~/.iml
    // 3. Create symlink in nodeModules pointing to ~/.iml/package
    installModule(name, nodeModules, {}, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function symlinkReactFromInk(): Promise<void> {
  return new Promise((resolve) => {
    // After ink is installed, symlink react to ink's react to avoid duplicate React instances
    const inkPath = fs.realpathSync(path.join(nodeModules, 'ink'));
    const inkReactPath = path.join(inkPath, 'node_modules', 'react');
    const reactPath = path.join(nodeModules, 'react');

    // Check if react already exists
    try {
      const stat = fs.lstatSync(reactPath);
      if (stat.isSymbolicLink()) {
        // It's a symlink - check if it points to the right place
        const existing = fs.readlinkSync(reactPath);
        if (existing === inkReactPath) {
          return resolve(); // Already correct
        }
        // Wrong symlink, remove it
        fs.unlinkSync(reactPath);
      } else {
        // It's a real directory (e.g. from devDependencies) - leave it alone
        return resolve();
      }
    } catch {
      // Doesn't exist, continue to create symlink
    }

    // Create symlink to ink's react
    try {
      fs.symlinkSync(inkReactPath, reactPath);
    } catch {
      // Ignore errors - react may have been installed another way
    }
    resolve();
  });
}

function installInk(): Promise<void> {
  if (installed) return Promise.resolve();
  if (installing) return installing;

  // Install ink, then symlink react to ink's bundled react
  // This ensures session.tsx and ink use the SAME React instance
  installing = installDependency('ink')
    .then(() => symlinkReactFromInk())
    .then(() => {
      installed = true;
    })
    .catch((err) => {
      installing = null;
      throw err;
    });

  return installing;
}

export function loadInk(callback: (err: Error | null) => void): void {
  installInk()
    .then(() => callback(null))
    .catch((err) => callback(err));
}

export function isInkInstalled(): boolean {
  return installed;
}
